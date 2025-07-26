"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Loader2 } from "lucide-react"
import { createChat, getSellerChats, getSellerMessages, getSellerSales, subscribeToChat } from "@/lib/supabase"
import { useAppStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface SellerDashboardProps {
  onNavigate: (screen: string) => void
}

interface Product {
  id: string
  name: string
  title: string
  price: number
  distance: number
  rating: number
  image: string
  image_url: string
  seller: string | { full_name?: string }
  seller_id: string
  location: { lat: number; lng: number }
  latitude: number
  longitude: number
  description: string
  category: string
  stock: number
  is_available: boolean
  is_visible: boolean
  created_at: string
  updated_at: string
  suggestions?: string[]
}

// Interfaz para actividades recientes
interface RecentActivity {
  id: string
  type: "message" | "offer" | "sale" | "cancelled_sale"
  title: string
  content: string
  timestamp: Date
  productId?: string
  chatId?: string
  buyerName: string
  buyerAvatar?: string
  productName: string
  amount?: number
}

export function SellerDashboard({ onNavigate }: SellerDashboardProps) {
  const { setSelectedProduct } = useAppStore()
  const { user, profile } = useAuth()
  const [balance, setBalance] = useState(0)
  const [todaySalesAmount, setTodaySalesAmount] = useState(0)
  const [todaySalesCount, setTodaySalesCount] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<any[]>([])

  const isBalancePositive = balance > 0

  // Cargar datos del vendedor
  useEffect(() => {
    if (!user) return

    const loadSellerData = async () => {
      setIsLoading(true)
      try {
        // Cargar saldo de la billetera
        try {
          const { data: walletData, error } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single()

          if (error) {
            console.error("Error al cargar el saldo:", error)
            // Si hay un error, establecer el saldo en 0
            setBalance(0)
          } else {
            // Asegurarse de que el saldo sea un número
            const balanceValue = Number(walletData?.balance) || 0
            setBalance(balanceValue)
            
            // Si el saldo es negativo, ocultar los productos
            if (balanceValue < 0) {
              await supabase
                .from("products")
                .update({ is_visible: false })
                .eq("seller_id", user.id)
            }
          }
        } catch (error) {
          console.error("Error inesperado al cargar el saldo:", error)
          setBalance(0)
        }

        // Cargar ventas de hoy
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { data: salesData } = await supabase
          .from("sales")
          .select("*")
          .eq("seller_id", user.id)
          .eq("status", "completed")
          .gte("created_at", today.toISOString())

        if (salesData) {
          const totalAmount = salesData.reduce((sum, sale) => sum + (sale.final_price || 0), 0)
          setTodaySalesAmount(totalAmount)
          setTodaySalesCount(salesData.length)
        }

        // Cargar actividad reciente
        await loadRecentActivity()
      } catch (error) {
        console.error("Error al cargar datos del vendedor:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSellerData()

    // Suscribirse a cambios en la billetera
    const walletSubscription = supabase
      .channel(`wallet:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setBalance(payload.new.balance || 0)
        }
      )
      .subscribe()

    // Suscribirse a nuevas ventas
    const salesSubscription = supabase
      .channel(`sales:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales",
          filter: `seller_id=eq.${user.id}`,
        },
        async (payload) => {
          // Actualizar ventas de hoy si la venta es de hoy
          const saleDate = new Date(payload.new.created_at)
          const today = new Date()
          if (
            saleDate.getDate() === today.getDate() &&
            saleDate.getMonth() === today.getMonth() &&
            saleDate.getFullYear() === today.getFullYear()
          ) {
            setTodaySalesAmount((prev) => prev + (payload.new.final_price || 0))
            setTodaySalesCount((prev) => prev + 1)
          }

          // Actualizar actividad reciente
          await loadRecentActivity()
        }
      )
      .subscribe()

    setSubscriptions([walletSubscription, salesSubscription])

    return () => {
      // Limpiar suscripciones
      subscriptions.forEach((subscription) => subscription.unsubscribe())
    }
  }, [user])

  // Cargar actividad reciente (mensajes, ofertas y ventas)
  const loadRecentActivity = async () => {
    if (!user) return

    try {
      // 1. Obtener chats del vendedor
      const { data: chats } = await getSellerChats(user.id)
      
      // 2. Obtener mensajes recientes
      const chatIds = chats?.map(chat => chat.id) || []
      
      // Si no hay chats, no hay mensajes
      if (!chatIds.length) {
        setRecentActivities([])
        return
      }
      
      // Obtener mensajes recientes para todos los chats
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*, chat:chats(product_id, buyer_id, seller_id, product:products(title))")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false })
        .limit(20)
      
      // 3. Obtener ventas recientes
      const { data: sales } = await getSellerSales(user.id)
      
      // 4. Combinar y formatear actividades
      const activities: RecentActivity[] = []
      
      // Procesar mensajes
      if (messages) {
        for (const msg of messages) {
          // Ignorar mensajes enviados por el vendedor
          if (msg.sender_id === user.id) continue
          
          // Obtener información del comprador
          const { data: buyerData } = await supabase
            .from("profiles")
            .select("full_name, avatar")
            .eq("id", msg.chat.buyer_id)
            .single()
          
          const buyerName = buyerData?.full_name || "Usuario"
          const buyerAvatar = buyerData?.avatar || "/placeholder-user.jpg"
          const productName = msg.chat.product?.title || "Producto"
          
          if (msg.message_type === "text") {
            activities.push({
              id: msg.id,
              type: "message",
              title: `Mensaje de ${buyerName}`,
              content: `"${msg.content}"`,
              timestamp: new Date(msg.created_at),
              chatId: msg.chat_id,
              productId: msg.chat.product_id,
              buyerName,
              buyerAvatar,
              productName
            })
          } else if (msg.message_type === "offer") {
            activities.push({
              id: msg.id,
              type: "offer",
              title: "Oferta recibida",
              content: `${buyerName} te ofreció Bs ${msg.offer_price?.toFixed(2)} por "${productName}"`,
              timestamp: new Date(msg.created_at),
              chatId: msg.chat_id,
              productId: msg.chat.product_id,
              buyerName,
              buyerAvatar,
              productName,
              amount: msg.offer_price
            })
          }
        }
      }
      
      // Procesar ventas
      if (sales) {
        for (const sale of sales) {
          const buyerName = sale.buyer?.full_name || "Usuario"
          const productName = sale.product?.title || "Producto"
          
          if (sale.status === "completed") {
            activities.push({
              id: sale.id,
              type: "sale",
              title: "Venta realizada",
              content: `Vendiste "${productName}" a ${buyerName}`,
              timestamp: new Date(sale.created_at),
              productId: sale.product_id,
              chatId: sale.chat_id,
              buyerName,
              buyerAvatar: "/placeholder-user.jpg",
              productName,
              amount: sale.final_price
            })
          } else if (sale.status === "cancelled") {
            activities.push({
              id: sale.id,
              type: "cancelled_sale",
              title: "Venta no realizada",
              content: `No se concretó la venta de "${productName}"`,
              timestamp: new Date(sale.created_at),
              productId: sale.product_id,
              chatId: sale.chat_id,
              buyerName,
              buyerAvatar: "/placeholder-user.jpg",
              productName
            })
          }
        }
      }
      
      // Ordenar por fecha (más reciente primero)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      // Limitar a 10 actividades
      setRecentActivities(activities.slice(0, 10))
      
      // Suscribirse a nuevos mensajes en todos los chats
      subscriptions.forEach(sub => {
        if (sub.topic.startsWith('chat:')) {
          sub.unsubscribe()
        }
      })
      
      const newSubscriptions = chatIds.map(chatId => {
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
            async () => {
              // Recargar actividad reciente cuando llegue un nuevo mensaje
              await loadRecentActivity()
            }
          )
          .subscribe()
      })
      
      setSubscriptions(prev => [...prev.filter(sub => !sub.topic.startsWith('chat:')), ...newSubscriptions])
      
    } catch (error) {
      console.error("Error al cargar actividad reciente:", error)
    }
  }

  // Handler para navegar a negociación
  const handleGoToNegotiation = async (activity: RecentActivity) => {
    if (!activity.chatId || !activity.productId) return
    
    try {
      // Obtener información del producto
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .eq("id", activity.productId)
        .single()
      
      if (productData) {
        // Crear el objeto producto con todos los campos requeridos
        const product: Product = {
          id: productData.id,
          name: productData.title, // Usamos title como name para compatibilidad
          title: productData.title,
          price: productData.price,
          distance: 0, // Valor por defecto
          rating: 0,   // Valor por defecto
          image: productData.image_url || "/placeholder.svg?height=80&width=80",
          image_url: productData.image_url || "/placeholder.svg?height=80&width=80",
          seller: typeof productData.seller === 'object' ? productData.seller : { full_name: productData.seller },
          seller_id: productData.seller_id,
          location: { lat: productData.latitude, lng: productData.longitude },
          latitude: productData.latitude,
          longitude: productData.longitude,
          description: productData.description || '',
          category: productData.category || '',
          stock: productData.stock || 0,
          is_available: productData.is_available ?? true,
          is_visible: productData.is_visible ?? true,
          created_at: productData.created_at || new Date().toISOString(),
          updated_at: productData.updated_at || new Date().toISOString()
        }
        
        setSelectedProduct(product)
        onNavigate(`negotiationChat:${activity.chatId}`)
      }
    } catch (error) {
      console.error("Error al obtener información del producto:", error)
      alert("No se pudo cargar la información del chat.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header con altura fija */}
      <div className="bg-white border-b px-4 h-20 flex items-center">
        <div className="w-full flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mi Negocio</h1>
          <img src="/logo-busqai.png" alt="Busqai" className="h-20 w-auto" />
        </div>
      </div>

      {/* Banner de métricas con degradado */}
      <div className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] px-4 py-4 mx-4 mt-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between text-white">
          {/* Ventas de hoy */}
          <div>
            <p className="text-sm font-medium opacity-90">Ventas de hoy</p>
            <p className="text-2xl font-bold">Bs {todaySalesAmount.toFixed(2)}</p>
            <p className="text-xs opacity-80">{todaySalesCount} ventas</p>
          </div>
          
          {/* Línea divisoria */}
          <div className="h-12 w-px bg-white/30"></div>
          
          {/* Saldo disponible */}
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">Saldo disponible</p>
            <p className="text-xl font-bold">Bs {balance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Aviso de recarga */}
      {!isBalancePositive && (
        <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-lg">
          <p className="text-sm text-red-700">Tus productos están ocultos. Recarga tu saldo para que sean visibles.</p>
          <Button
            size="sm"
            className="mt-2 bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
            onClick={() => onNavigate("billetera")}
          >
            Recargar ahora
          </Button>
        </div>
      )}
      {/* Actividad Reciente */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad reciente</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <Card 
                key={activity.id} 
                className="p-4 cursor-pointer" 
                onClick={() => handleGoToNegotiation(activity)}
              >
                <div className="flex gap-3 items-center">
                  <img 
                    src={activity.buyerAvatar || "/placeholder-user.jpg"} 
                    alt={activity.buyerName} 
                    className="w-12 h-12 object-cover rounded-full" 
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                    <p className="text-sm text-gray-600">{activity.content}</p>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>No hay actividad reciente</p>
          </div>
        )}
      </div>
    </div>
  )
}
