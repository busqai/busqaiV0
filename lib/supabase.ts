import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database types
export interface Profile {
  id: string
  phone: string
  full_name: string
  user_type: "buyer" | "seller"
  latitude?: number
  longitude?: number
  address?: string
  avatar?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  seller_id: string
  title: string
  description?: string
  category: string
  price: number
  stock: number
  image_url?: string
  latitude: number
  longitude: number
  address?: string
  is_visible: boolean
  is_available: boolean
  view_count: number
  chat_count: number
  sale_count: number
  created_at: string
  updated_at: string
}

export interface ProductSearchResult extends Product {
  seller_name: string
  seller_phone: string
  distance_km?: number
  relevance_score: number
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface WalletMovement {
  id: string
  wallet_id: string
  user_id: string
  type: "credit" | "debit"
  amount: number
  description: string
  reference_id?: string
  reference_type?: string
  metadata: Record<string, any>
  created_at: string
}

export interface Chat {
  id: string
  product_id: string
  buyer_id: string
  seller_id: string
  status: "active" | "negotiating" | "agreed" | "completed" | "cancelled"
  final_price?: number
  agreed_at?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  message_type: "text" | "offer" | "accept" | "reject" | "system"
  content: string
  offer_price?: number
  metadata: Record<string, any>
  created_at: string
}

export interface Sale {
  id: string
  chat_id: string
  product_id: string
  buyer_id: string
  seller_id: string
  final_price: number
  commission_rate: number
  commission_amount: number
  seller_earnings: number
  status: "pending" | "completed" | "cancelled"
  completed_at?: string
  created_at: string
}

// Auth helpers
export const signInWithPhone = async (phone: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: `+591${phone}`,
    options: {
      channel: "sms",
    },
  })
  return { data, error }
}

export const verifyOtp = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+591${phone}`,
    token,
    type: "sms",
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Profile helpers
export const createProfile = async (profileData: {
  phone: string
  full_name: string
  user_type: "buyer" | "seller"
}) => {
  const { data, error } = await supabase.rpc("verify_phone_and_create_profile", {
    p_phone: profileData.phone,
    p_full_name: profileData.full_name,
    p_user_type: profileData.user_type,
  })
  return { data, error }
}

export const updateLocation = async (latitude: number, longitude: number, address?: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ latitude, longitude, address })
    .eq("id", (await supabase.auth.getUser()).data.user?.id)
  return { data, error }
}

// Product helpers
export const searchProducts = async (params: {
  query?: string
  userLat?: number
  userLng?: number
  category?: string
  maxPrice?: number
  maxDistanceKm?: number
  limit?: number
  offset?: number
}) => {
  const { data, error } = await supabase.rpc("search_products", {
    p_query: params.query || "",
    p_user_lat: params.userLat,
    p_user_lng: params.userLng,
    p_category: params.category,
    p_max_price: params.maxPrice,
    p_max_distance_km: params.maxDistanceKm || 50,
    p_limit: params.limit || 20,
    p_offset: params.offset || 0,
  })
  return { data: data as ProductSearchResult[], error }
}

export const getPopularProducts = async (userLat?: number, userLng?: number, limit = 10) => {
  const { data, error } = await supabase.rpc("get_popular_products", {
    p_user_lat: userLat,
    p_user_lng: userLng,
    p_limit: limit,
  })
  return { data, error }
}

export const incrementProductView = async (productId: string) => {
  const { data, error } = await supabase.rpc("increment_product_view", {
    p_product_id: productId,
  })
  return { data, error }
}

// Chat helpers
export const createChat = async (productId: string, sellerId: string) => {
  try {
    // 1. Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return { data: null, error: new Error('Debes iniciar sesión para iniciar una negociación') }
    }
    
    const buyerId = user.id

    // 2. Verify the product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, is_available, is_visible')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      console.error('Product not found:', productError)
      return { 
        data: null, 
        error: new Error('El producto no existe o no está disponible') 
      }
    }

    if (!product.is_available || !product.is_visible) {
      return { 
        data: null, 
        error: new Error('Este producto ya no está disponible para negociación') 
      }
    }

    // 3. Verify the seller exists and is a seller
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('id', sellerId)
      .single()

    if (sellerError || !seller || seller.user_type !== 'seller') {
      console.error('Invalid seller:', sellerError)
      return { 
        data: null, 
        error: new Error('Vendedor no válido') 
      }
    }

    // 4. Check for existing chat
    const { data: existingChat, error: findError } = await supabase
      .from("chats")
      .select("*")
      .eq("product_id", productId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error('Error checking for existing chat:', findError)
      return { data: null, error: findError }
    }

    if (existingChat) {
      return { data: existingChat, error: null }
    }

    // 5. Create new chat
    const { data: newChat, error: createError } = await supabase
      .from("chats")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        status: 'active'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating chat:', createError)
      return { data: null, error: createError }
    }

    // 6. Add welcome message
    await supabase.from('chat_messages').insert({
      chat_id: newChat.id,
      sender_id: buyerId,
      content: '¡Hola! Estoy interesado en este producto.',
      message_type: 'text'
    })

    return { data: newChat, error: null }
  } catch (error) {
    console.error('Unexpected error in createChat:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Error inesperado al crear el chat') 
    }
  }
}

export const sendMessage = async (
  chatId: string,
  content: string,
  messageType: "text" | "offer" = "text",
  offerPrice?: number,
) => {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      chat_id: chatId,
      sender_id: user.data.user.id,
      message_type: messageType,
      content,
      offer_price: offerPrice,
    })
    .select()
    .single()

  return { data, error }
}

export const acceptOffer = async (chatId: string, finalPrice: number) => {
  const { data, error } = await supabase.rpc("process_accepted_offer", {
    p_chat_id: chatId,
    p_final_price: finalPrice,
  })
  return { data, error }
}

// Wallet helpers
export const getWalletBalance = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return { data: data?.balance || 0 }
}

export const getWalletTransactions = async (limit = 10, offset = 0) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from('wallet_movements')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

export const addWalletCredit = async (amount: number, description: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase.rpc('add_wallet_credit', {
    p_user_id: user.id,
    p_amount: amount,
    p_description: description,
    p_reference_type: 'recharge'
  })

  if (error) throw error
  return data
}

// Analytics helpers
export const logEvent = async (eventName: string, eventData: Record<string, any> = {}) => {
  const { data, error } = await supabase.rpc("log_event", {
    p_event_name: eventName,
    p_event_data: eventData,
  })
  return { data, error }
}

export const getConversionMetrics = async (startDate?: string, endDate?: string) => {
  const { data, error } = await supabase.rpc("get_conversion_metrics", {
    p_start_date: startDate,
    p_end_date: endDate,
  })
  return { data, error }
}

export const getSellerMetrics = async (sellerId: string) => {
  const { data, error } = await supabase.rpc("get_seller_metrics", {
    p_seller_id: sellerId,
  })
  return { data, error }
}

export const getSellerProducts = async (sellerId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
  return { data, error }
}

export const getSellerChats = async (sellerId: string) => {
  const { data, error } = await supabase
    .from("chats")
    .select("*, product:products(title, image_url), buyer:profiles(full_name)")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false })
  return { data, error }
}

export const getSellerMessages = async (sellerId: string) => {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, chat:chats(product_id, buyer_id, seller_id)")
    .order("created_at", { ascending: false })
    // Filtrado adicional puede hacerse en el frontend
  return { data, error }
}

export const getSellerSales = async (sellerId: string) => {
  const { data, error } = await supabase
    .from("sales")
    .select("*, product:products(title), buyer:profiles(full_name)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
  return { data, error }
}

/**
 * Obtiene productos con filtros opcionales
 * @param filters Filtros de búsqueda
 * @returns Lista de productos que coinciden con los filtros
 */
export const getProducts = async (filters: {
  query?: string;
  category?: string;
  maxPrice?: number;
  maxDistanceKm?: number;
  userLat?: number;
  userLng?: number;
  limit?: number;
  offset?: number;
}) => {
  console.log('[getProducts] Iniciando búsqueda con filtros:', JSON.stringify(filters, null, 2));
  
  try {
    // 1. Construir la consulta base
    let query = supabase
      .from('products')
      .select(`
        *,
        profiles!inner(
          id,
          full_name,
          avatar,
          phone
        )
      `)
      .eq('is_visible', true)
      .eq('is_available', true);

    // 2. Apply search filters if they exist
    if (filters.query && filters.query.trim()) {
      const searchTerm = filters.query.trim();
      console.log('[getProducts] Processing search term:', searchTerm);
      
      // Clean and prepare search terms
      const cleanedSearchTerm = searchTerm
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúüñ\s]/gi, '') // Remove special characters
        .trim();
      
      if (cleanedSearchTerm) {
        console.log('[getProducts] Using search term:', cleanedSearchTerm);
        
        // Apply search condition across multiple fields
        query = query.or(
          `title.ilike.%${cleanedSearchTerm}%`,
          `description.ilike.%${cleanedSearchTerm}%`,
          `category.ilike.%${cleanedSearchTerm}%`
        );
      }
      
      // Price search if the term is numeric
      const price = Number(cleanedSearchTerm);
      if (!isNaN(price) && price > 0) {
        console.log('[getProducts] Performing price range search around:', price);
        query = query
          .gte('price', price * 0.8) // 20% below the searched price
          .lte('price', price * 1.2); // 20% above the searched price
      }
    }

    // 3. Aplicar filtros adicionales
    if (filters.category) {
      console.log('[getProducts] Aplicando filtro de categoría:', filters.category);
      query = query.ilike('category', `%${filters.category}%`);
    }

    if (filters.maxPrice && filters.maxPrice > 0) {
      console.log('[getProducts] Aplicando filtro de precio máximo:', filters.maxPrice);
      query = query.lte('price', filters.maxPrice);
    }
    
    // 4. Ordenar resultados
    if (filters.userLat && filters.userLng) {
      console.log('[getProducts] Ordenando por distancia a la ubicación del usuario');
      // Nota: Para ordenar por distancia real, necesitarías PostGIS habilitado en Supabase
      // Por ahora, ordenamos por fecha de creación
      query = query.order('created_at', { ascending: false });
    } else if (filters.query) {
      console.log('[getProducts] Ordenando por relevancia de búsqueda');
      // Priorizar coincidencias exactas en el título, luego en descripción, luego en categoría
      query = query.order('title', { ascending: true });
    } else {
      console.log('[getProducts] Ordenando por fecha de creación (más recientes primero)');
      query = query.order('created_at', { ascending: false });
    }

    // 5. Aplicar paginación
    const limit = Math.min(filters.limit || 20, 50); // Límite máximo de 50 resultados
    if (limit) {
      console.log(`[getProducts] Aplicando límite de resultados: ${limit}`);
      query = query.limit(limit);
    }

    if (filters.offset !== undefined) {
      console.log(`[getProducts] Aplicando offset: ${filters.offset}`);
      query = query.range(filters.offset, filters.offset + limit - 1);
    }

    // 6. Ejecutar la consulta
    console.log('[getProducts] Ejecutando consulta a Supabase...');
    const { data, error } = await query;
    
    // 7. Manejar errores
    if (error) {
      console.error('[getProducts] Error en la consulta:', {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        query: (error as any).query
      });
      
      // Si el error es de autenticación o permisos
      if (error.code === 'PGRST301' || error.code === '42501') {
        console.error('[getProducts] Error de autenticación o permisos');
        return { 
          data: [], 
          error: new Error('No tienes permiso para realizar esta acción') 
        };
      }
      
      return { data: [], error };
    }

    console.log(`[getProducts] Consulta exitosa. Se encontraron ${data?.length || 0} productos`);
        // 8. Procesar y formatear los resultados
      const products = (data || [])
        .map(product => {
          try {
            if (!product) {
              console.warn('[getProducts] Producto indefinido o nulo encontrado');
              return null;
            }

            // Extraer la información del vendedor del objeto anidado
            const sellerInfo = product.profiles || {};
            const latitude = Number(product.latitude) || 0;
            const longitude = Number(product.longitude) || 0;
            const now = new Date().toISOString();
            
            // Validaciones adicionales para campos requeridos
            if (!product.id) {
              console.warn('[getProducts] Producto sin ID:', product);
              return null;
            }

            const formattedProduct: Product & { 
              seller?: string; 
              distance?: number; 
              rating?: number; 
              name?: string; 
              image?: string; 
              location?: { lat: number; lng: number } 
            } = {
              id: product.id,
              seller_id: product.seller_id || '',
              title: product.title?.trim() || 'Producto sin título',
              description: product.description?.trim() || '',
              category: product.category?.trim() || 'general',
              price: Math.max(0, Number(product.price) || 0),
              stock: Math.max(0, Number(product.stock) || 0),
              image_url: product.image_url?.trim() || '/placeholder.svg',
              latitude,
              longitude,
              address: product.address?.trim() || '',
              is_visible: product.is_visible !== false,
              is_available: product.is_available !== false,
              view_count: Number(product.view_count) || 0,
              chat_count: Number(product.chat_count) || 0,
              sale_count: Number(product.sale_count) || 0,
              created_at: product.created_at || now,
              updated_at: product.updated_at || now,
              // Campos adicionales para compatibilidad
              seller: (sellerInfo?.full_name || 'Vendedor')?.trim() || 'Vendedor',
              distance: 0, // Se calcularía con PostGIS en producción
              rating: 4.5, // Valor por defecto
              name: (product.title || 'Producto sin nombre').trim(),
              image: (product.image_url || '/placeholder.svg').trim(),
              location: {
                lat: latitude,
                lng: longitude
              }
            };

            return formattedProduct;
          } catch (error) {
            console.error('[getProducts] Error al formatear producto:', error);
            return null;
          }
        })
        .filter(Boolean) as Product[];

      console.log(`[getProducts] ${products.length} productos formateados correctamente`);
      return { data: products, error: null };
    } catch (error) {
      console.error('[getProducts] Error inesperado:', error);
      return { 
        data: [], 
        error: error instanceof Error ? error : new Error('Error desconocido al buscar productos')
      };
    }
  };

export const createProduct = async (productData: {
  seller_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  latitude: number;
  longitude: number;
  address: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...productData,
        is_visible: true,
        is_available: true,
        view_count: 0,
        chat_count: 0,
        sale_count: 0,
      }])
      .select()
      .single();

    if (error) {
      console.error('[createProduct] Error al crear producto:', error);
      return { data: null, error };
    }

    console.log('[createProduct] Producto creado exitosamente:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('[createProduct] Error inesperado al crear producto:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Error desconocido al crear producto')
    };
  }
};

// Realtime subscriptions con reconexión automática
export const subscribeToChat = (chatId: string, callback: (message: ChatMessage) => void) => {
  // Configuración del canal con manejo de reconexión
  const channel = supabase
    .channel(`chat:${chatId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: chatId }
      }
    })
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        callback(payload.new as ChatMessage)
      },
    )
    .on('system', { event: 'reconnect' }, () => {
      console.log('Intentando reconectar al chat...')
    })
    .on('system', { event: 'connected' }, () => {
      console.log('Conectado al chat')
    })
    .subscribe()

  return channel
}

export const subscribeToWallet = (userId: string, callback: (wallet: Wallet) => void) => {
  return supabase
    .channel(`wallet:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "wallets",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Wallet)
      },
    )
    .subscribe()
}

// Suscribirse a la actividad del vendedor (mensajes y ventas)
export const subscribeToSellerActivity = (sellerId: string, callback: () => void) => {
  // Primero obtenemos los chats del vendedor
  return getSellerChats(sellerId).then(({ data: chats }) => {
    const chatIds = chats?.map(chat => chat.id) || []
    
    // Crear suscripciones para cada chat
    const chatSubscriptions = chatIds.map(chatId => {
      return supabase
        .channel(`chat:${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `chat_id=eq.${chatId}`,
          },
          callback
        )
        .subscribe()
    })
    
    // Suscripción a nuevas ventas
    const salesSubscription = supabase
      .channel(`sales:${sellerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales",
          filter: `seller_id=eq.${sellerId}`,
        },
        callback
      )
      .subscribe()
    
    // Devolver todas las suscripciones para poder cancelarlas después
    return [...chatSubscriptions, salesSubscription]
  })
}
