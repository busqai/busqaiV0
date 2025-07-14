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
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("chats")
    .insert({
      product_id: productId,
      buyer_id: user.data.user.id,
      seller_id: sellerId,
    })
    .select()
    .single()

  return { data, error }
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
export const addWalletCredit = async (amount: number, description: string) => {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error("Not authenticated")

  const { data, error } = await supabase.rpc("add_wallet_credit", {
    p_user_id: user.data.user.id,
    p_amount: amount,
    p_description: description,
  })
  return { data, error }
}

export const getWalletBalance = async () => {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error("Not authenticated")

  const { data, error } = await supabase.rpc("get_wallet_balance", {
    p_user_id: user.data.user.id,
  })
  return { data, error }
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

// Realtime subscriptions
export const subscribeToChat = (chatId: string, callback: (message: ChatMessage) => void) => {
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
      (payload) => {
        callback(payload.new as ChatMessage)
      },
    )
    .subscribe()
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
