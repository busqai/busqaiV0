"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Mic, Send, MapPin, Star } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { getProducts } from "@/lib/supabase"

interface BuyerDashboardProps {
  onNavigate: (screen: string) => void
}

// Importar la interfaz Product del store
import { Product } from "@/lib/store";

export function BuyerDashboard({ onNavigate }: BuyerDashboardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    setSelectedProduct,
    searchQuery,
    setSearchQuery,
    searchMessages,
    setSearchMessages,
    addSearchMessage,
    clearSearch,
    user,
  } = useAppStore()

  // Cargar productos al montar el componente
  useEffect(() => {
    const loadProducts = async () => {
      if (isFetching) return;
      
      try {
        setIsFetching(true);
        setError(null);
        
        console.log('Cargando productos con query:', searchQuery || '(ninguna)');
        
        const { data, error } = await getProducts({
          query: searchQuery || '',
          limit: 50,
          userLat: user?.latitude,
          userLng: user?.longitude,
        });

        if (error) throw error;
        
        if (!data || data.length === 0) {
          console.log('No se encontraron productos');
          setProducts([]);
          return;
        }
        
        // Función para obtener el nombre del vendedor como string
        const getSellerName = (seller: any): string => {
          if (!seller) return 'Vendedor';
          if (typeof seller === 'string') return seller;
          if (typeof seller === 'object' && seller !== null) {
            return (seller as any).full_name || 'Vendedor';
          }
          return 'Vendedor';
        };

        // Formatear los resultados asegurando que todos los campos requeridos estén presentes
        const formattedProducts: Product[] = (data || []).map((product: any) => {
          const sellerName = getSellerName(product.seller);
          const latitude = Number(product.latitude) || 0;
          const longitude = Number(product.longitude) || 0;
          const title = product.title || product.name || 'Producto sin nombre';
          const imageUrl = product.image_url || product.image || '/placeholder.svg';
          
          return {
            id: (product as any).id || '',
            name: title,
            title: title,
            price: Number((product as any).price) || 0,
            distance: 0,
            rating: 4.5,
            image: imageUrl,
            image_url: imageUrl,
            seller: sellerName,
            seller_id: (product as any).seller_id || '',
            location: { lat: latitude, lng: longitude },
            latitude: latitude,
            longitude: longitude,
            description: (product as any).description || '',
            category: (product as any).category || 'general',
            stock: Number((product as any).stock) || 0,
            is_available: (product as any).is_available !== false,
            is_visible: (product as any).is_visible !== false,
            created_at: (product as any).created_at || new Date().toISOString(),
            updated_at: (product as any).updated_at || new Date().toISOString()
          };
        });
        
        console.log('Productos cargados:', formattedProducts.length);
        setProducts(formattedProducts);
        
        if (searchQuery.trim()) {
          const aiResponse = formattedProducts.length > 0
            ? `Encontré ${formattedProducts.length} productos que coinciden con tu búsqueda:`
            : "No encontré productos que coincidan con tu búsqueda.";
            
          addSearchMessage({
            type: "ai",
            content: aiResponse,
            products: formattedProducts,
          });
        }
      } catch (err) {
        console.error("Error al cargar productos:", err);
        setError("No se pudieron cargar los productos. Por favor, inténtalo de nuevo.");
      } finally {
        setIsFetching(false);
      }
    };

    loadProducts();
  }, [searchQuery, user?.latitude, user?.longitude]);

  const handleSend = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    // Agregar mensaje del usuario
    addSearchMessage({ 
      type: "user", 
      content: query 
    });
    
    // Limpiar el input de búsqueda
    setSearchQuery("");
    setIsLoading(true);

    try {
      console.log('Buscando productos con query:', query);
      
      // Buscar productos que coincidan con la consulta
      const { data, error } = await getProducts({
        query: query,
        limit: 20,
        userLat: user?.latitude,
        userLng: user?.longitude,
      });

      console.log('Respuesta de getProducts:', { data, error });

      if (error) {
        console.error('Error en getProducts:', error);
        throw new Error(error.message || 'Error al buscar productos');
      }
      
      // Asegurarse de que data sea un array
      const results = Array.isArray(data) ? data : [];
      console.log('Productos encontrados:', results.length);
      
      // Formatear los resultados asegurando que todos los campos requeridos estén presentes
      const formattedResults: Product[] = results.map((product: any) => {
        try {
          const latitude = Number(product.latitude) || 0;
          const longitude = Number(product.longitude) || 0;
          const sellerName = getSellerName(product.seller || 'Vendedor');
          
          return {
            id: product.id || '',
            name: product.title || 'Producto sin nombre',
            title: product.title || 'Producto sin nombre',
            price: Number(product.price) || 0,
            distance: 0, // Se calcularía con la ubicación del usuario
            rating: 4.5, // Valoración por defecto
            image: product.image_url || '/placeholder.svg',
            image_url: product.image_url || '/placeholder.svg',
            seller: sellerName,
            seller_id: product.seller_id || '',
            location: { lat: latitude, lng: longitude },
            latitude: latitude,
            longitude: longitude,
            description: product.description || '',
            category: product.category || 'general',
            stock: Number(product.stock) || 0,
            is_available: product.is_available !== false,
            is_visible: product.is_visible !== false,
            created_at: product.created_at || new Date().toISOString(),
            updated_at: product.updated_at || new Date().toISOString()
          };
        } catch (formatError) {
          console.error('Error formateando producto:', formatError);
          return null;
        }
      }).filter(Boolean) as Product[]; // Filtrar cualquier producto nulo
      
      console.log('Resultados formateados:', formattedResults);
      setProducts(formattedResults);
      
      // Mostrar mensaje con los resultados
      let aiResponse = '';
      if (formattedResults.length > 0) {
        aiResponse = `Encontré ${formattedResults.length} productos que coinciden con "${query}":`;
      } else if (results.length === 0) {
        aiResponse = `No encontré productos que coincidan con "${query}". Intenta con otros términos.`;
      } else {
        aiResponse = `Hubo un problema al procesar los resultados de búsqueda.`;
      }
        
      addSearchMessage({
        type: "ai",
        content: aiResponse,
        products: formattedResults,
      });
      
    } catch (error) {
      console.error("Error en la búsqueda:", error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      addSearchMessage({
        type: "ai",
        content: `Lo siento, hubo un error al buscar productos: ${errorMessage}. Por favor, inténtalo de nuevo.`,
      });
    } finally {
      setIsLoading(false);
    };
  };

  // Función para obtener el nombre del vendedor como string
  const getSellerName = (seller: any): string => {
    if (!seller) return 'Vendedor';
    if (typeof seller === 'string') return seller;
    if (typeof seller === 'object' && seller !== null) {
      return (seller as any).full_name || 'Vendedor';
    }
    return 'Vendedor';
  };
  
  // Función para obtener el seller de un producto
  const getProductSeller = (product: any): any => {
    return product.seller || null;
  };

  const handleProductSelect = (product: Product) => {
    // Extraer latitud y longitud del producto o de su ubicación
    const lat = product.latitude || (product.location ? product.location.lat : 0);
    const lng = product.longitude || (product.location ? product.location.lng : 0);
    
    // Obtener el seller del producto de manera segura
    const seller = 'seller' in product ? product.seller : 'Vendedor';
    
    // Crear el objeto producto con todos los campos requeridos
    const productWithDefaults: Product = {
      id: product.id || '',
      name: product.title || 'Producto sin nombre',
      title: product.title || 'Producto sin nombre',
      price: Number(product.price) || 0,
      distance: 0,
      rating: 4.5,
      image: product.image_url || '/placeholder.svg',
      image_url: product.image_url || '/placeholder.svg',
      seller: getSellerName(seller),
      seller_id: product.seller_id || '',
      location: { lat, lng },
      latitude: lat,
      longitude: lng,
      description: product.description || '',
      category: product.category || 'general',
      stock: Number(product.stock) || 0,
      is_available: product.is_available !== false,
      is_visible: product.is_visible !== false,
      created_at: product.created_at || new Date().toISOString(),
      updated_at: product.updated_at || new Date().toISOString()
    };
    
    setSelectedProduct(productWithDefaults);
    onNavigate("productDetail");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 h-20 flex items-center">
        <div className="w-full flex items-center justify-center">
          <img src="/logo-busqai.png" alt="Busqai" className="h-20 w-auto" />
        </div>
      </div>

      {/* Chat Area - 70% height */}
      <div className="flex-1 flex flex-col" style={{ height: "70vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {searchMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pt-40">
              <img src="/isotipo-busqai.png" alt="Busqai" className="w-36 h-36 mb-8 opacity-60" />
              <p className="text-2xl font-semibold text-gray-700 text-center">¿Qué buscas hoy?</p>
            </div>
          ) : (
            searchMessages.map((message, index) => (
              <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p>{message.content}</p>

                  {message.products && (
                    <div className="mt-4 space-y-3">
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {message.products.map((product) => (
                          <Card
                            key={product.id}
                            className="min-w-[200px] p-3 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleProductSelect(product)}
                          >
                            <img
                              src={product.image_url || product.image || "/placeholder.svg"}
                              alt={product.title || product.name || 'Producto'}
                              className="w-full h-32 object-cover rounded mb-2"
                            />
                            <h4 className="font-medium text-sm truncate">{product.title || product.name || 'Producto sin nombre'}</h4>
                            <p className="text-sm font-bold text-[#FF7300]">Bs. {product.price?.toFixed(2) || '0.00'}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                              <span>{(product.distance || 0).toFixed(1)} km</span>
                              <div className="flex items-center">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                                <span>{product.rating || 'Nuevo'}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe lo que buscas..."
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />

            <Button
              onClick={handleSend}
              disabled={!searchQuery.trim() || isLoading}
              className="shrink-0 bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
