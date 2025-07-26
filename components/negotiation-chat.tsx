"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Check, X, Loader2 } from "lucide-react"
import { getSellerChats, sendMessage, subscribeToChat, acceptOffer } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ChatMessage } from "@/lib/supabase"

interface Product {
  id: string
  name: string
  price: number
  distance: number
  rating: number
  image: string
  seller: string
  seller_id: string // Añadido para identificar al vendedor
  location: { lat: number; lng: number }
}

interface Message {
  id: string
  type: "buyer" | "seller" | "system"
  content: string
  offer?: number
  timestamp: Date
  sender_id: string // Añadido para identificar al remitente
}

interface NegotiationChatProps {
  product: Product
  onBack: () => void
  onNavigate: (screen: string) => void
  role: "buyer" | "seller"
  chatId?: string
}

export function NegotiationChat({ product, onBack, onNavigate, role, chatId }: NegotiationChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [customOffer, setCustomOffer] = useState("")
  const [dealClosed, setDealClosed] = useState(false)
  const [finalPrice, setFinalPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Estado de negociación
  const [negotiationState, setNegotiationState] = useState({
    round: 1,
    maxRounds: 5,
    lastOffer: null as number | null,
    status: "active" as "active" | "accepted" | "rejected" | "closed",
  })

  // Cargar mensajes históricos y suscribirse a nuevos mensajes
  useEffect(() => {
    if (!chatId || !user) return
    
    const loadMessages = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Cargar mensajes históricos
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true })
        
        if (error) throw error
        
        if (data) {
          // Transformar mensajes
          const formattedMessages: Message[] = data.map(msg => ({
            id: msg.id,
            type: msg.sender_id === product.seller_id ? "seller" : 
                 msg.message_type === "system" ? "system" : "buyer",
            content: msg.content,
            offer: msg.offer_price,
            timestamp: new Date(msg.created_at),
            sender_id: msg.sender_id
          }))
          
          setMessages(formattedMessages)
          
          // Actualizar estado de negociación basado en mensajes
          updateNegotiationState(formattedMessages)
        }
      } catch (err) {
        console.error("Error al cargar mensajes:", err)
        setError("No se pudieron cargar los mensajes. Intenta de nuevo.")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadMessages()
    
    // Suscribirse a nuevos mensajes
    const subscription = subscribeToChat(chatId, (msg) => {
      // Transformar ChatMessage a Message
      const newMsg: Message = {
        id: msg.id,
        type: msg.sender_id === product.seller_id ? "seller" : 
             msg.message_type === "system" ? "system" : "buyer",
        content: msg.content,
        offer: msg.offer_price,
        timestamp: new Date(msg.created_at),
        sender_id: msg.sender_id
      }
      
      setMessages(prev => [...prev, newMsg])
      
      // Actualizar estado de negociación si es necesario
      if (msg.message_type === "offer") {
        setNegotiationState(prev => ({
          ...prev,
          lastOffer: msg.offer_price || null,
          round: prev.round + 1
        }))
      } else if (msg.message_type === "accept") {
        setNegotiationState(prev => ({ ...prev, status: "accepted" }))
        setDealClosed(true)
        setFinalPrice(msg.offer_price || 0)
      } else if (msg.message_type === "reject") {
        setNegotiationState(prev => ({ ...prev, status: "rejected" }))
        setDealClosed(true)
      }
      
      // Desactivar indicador de escritura
      setIsTyping(false)
    })
    
    // Suscribirse a eventos de escritura (simulado)
    const typingChannel = supabase.channel(`typing:${chatId}`)
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setIsTyping(true)
          
          // Limpiar timeout anterior si existe
          if (typingTimeout) clearTimeout(typingTimeout)
          
          // Establecer nuevo timeout
          const timeout = setTimeout(() => {
            setIsTyping(false)
          }, 3000)
          
          setTypingTimeout(timeout)
        }
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
      typingChannel.unsubscribe()
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  }, [chatId, user, product.seller_id])
  
  // Función para actualizar el estado de negociación basado en mensajes
  const updateNegotiationState = (messages: Message[]) => {
    // Contar rondas de ofertas
    const offerMessages = messages.filter(msg => msg.offer && msg.offer > 0)
    const round = Math.ceil(offerMessages.length / 2) + 1
    
    // Verificar si hay mensajes de aceptación o rechazo
    const acceptMessage = messages.find(msg => 
      msg.content.includes("[ACEPTAR]") || 
      msg.content.includes("acepto") ||
      msg.content.toLowerCase().includes("trato cerrado")
    )
    
    const rejectMessage = messages.find(msg => 
      msg.content.includes("[RECHAZAR]") || 
      msg.content.toLowerCase().includes("rechazo")
    )
    
    // Actualizar estado
    if (acceptMessage) {
      setNegotiationState(prev => ({ 
        ...prev, 
        status: "accepted",
        round: round
      }))
      setDealClosed(true)
      
      // Buscar la última oferta antes de la aceptación
      const lastOfferBeforeAccept = [...offerMessages]
        .reverse()
        .find(msg => msg.timestamp < acceptMessage.timestamp)
      
      if (lastOfferBeforeAccept) {
        setFinalPrice(lastOfferBeforeAccept.offer || null)
      }
    } else if (rejectMessage) {
      setNegotiationState(prev => ({ 
        ...prev, 
        status: "rejected",
        round: round
      }))
      setDealClosed(true)
    } else {
      setNegotiationState(prev => ({ 
        ...prev, 
        round: round,
        lastOffer: offerMessages.length > 0 ? 
          offerMessages[offerMessages.length - 1].offer || null : null
      }))
    }
  }
  
  // Desplazarse al último mensaje cuando se añaden nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])
  
  // Enviar evento de "escribiendo..."
  const handleTyping = () => {
    if (!chatId || !user) return
    
    supabase.channel(`typing:${chatId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id }
      })
  }

  // Lógica de envío de mensajes adaptada por rol
  const handleSend = async () => {
    if (!customOffer.trim()) return
    if (!chatId) {
      alert("Error: No hay chatId válido.")
      return
    }
    if (!user) {
      alert("Debes iniciar sesión para enviar mensajes.")
      return
    }
    
    try {
      const { data, error } = await sendMessage(chatId, customOffer, "text")
      if (error) throw error
      setCustomOffer("")
    } catch (error: any) {
      console.error("Error al enviar mensaje:", error)
      alert("No tienes permisos para enviar mensajes en este chat.\n\nDetalles: " + error.message)
    }
  }

  const handleOffer = async (offer: number) => {
    if (negotiationState.status !== "active" || negotiationState.round > negotiationState.maxRounds) return
    if (!chatId) {
      alert("Error: No hay chatId válido.")
      return
    }
    if (!user) {
      alert("Debes iniciar sesión para enviar mensajes.")
      return
    }
    
    try {
      const { data, error } = await sendMessage(chatId, offer.toString(), "offer", offer)
      if (error) throw error
      setCustomOffer("")
    } catch (error: any) {
      console.error("Error al enviar oferta:", error)
      alert("No tienes permisos para enviar mensajes en este chat.\n\nDetalles: " + error.message)
    }
  }

  const handleAccept = async (offer: number) => {
    if (!chatId) return
    
    try {
      // Enviar mensaje de aceptación
      await sendMessage(chatId, "[ACEPTAR] ¡Acepto tu oferta!", "accept", offer)
      
      // Procesar la oferta aceptada
      const { data, error } = await acceptOffer(chatId, offer)
      if (error) throw error
      
      setNegotiationState(prev => ({ ...prev, status: "accepted" }))
      setDealClosed(true)
      setFinalPrice(offer)
    } catch (error: any) {
      console.error("Error al aceptar oferta:", error)
      alert("Error al procesar la oferta: " + error.message)
    }
  }

  const handleReject = async () => {
    if (!chatId) return
    
    try {
      await sendMessage(chatId, "[RECHAZAR] Rechazo la oferta", "reject")
      setNegotiationState(prev => ({ ...prev, status: "rejected" }))
      setDealClosed(true)
    } catch (error: any) {
      console.error("Error al rechazar oferta:", error)
      alert("Error al rechazar la oferta: " + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{product.name}</h1>
          <p className="text-sm text-gray-600">Negociación ({negotiationState.round}/{negotiationState.maxRounds})</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">Bs{product.price}</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="ml-2 text-gray-600">Cargando mensajes...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-2"
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === role ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === role
                      ? "bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white"
                      : message.type === (role === "buyer" ? "seller" : "buyer")
                        ? "bg-gray-100 text-gray-900"
                        : "bg-blue-50 text-blue-800 text-center"
                  }`}
                >
                  <p>{message.content}</p>
                  {message.offer && message.offer > 0 && negotiationState.status === "active" && role === "seller" && message.type === "buyer" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleAccept(message.offer!)} className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="w-3 h-3 mr-1" />Aceptar
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent" onClick={handleReject}>
                        <X className="w-3 h-3 mr-1" />Rechazar
                      </Button>
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50 bg-transparent" onClick={() => handleOffer(Math.max((message.offer! + product.price) / 2, message.offer!))}>
                        Contraoferta
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Indicador de "escribiendo..." */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-600 p-2 px-4 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            {/* Referencia para desplazamiento automático */}
            <div ref={messagesEndRef} />
            
            {negotiationState.status === "accepted" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-green-800 mb-2">¡Trato cerrado!</h3>
                <p className="text-green-700 mb-4">Precio final: Bs {finalPrice?.toFixed(2)}</p>
              </div>
            )}
            {negotiationState.status === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-red-800 mb-2">Negociación rechazada</h3>
                <p className="text-red-700 mb-4">No se llegó a un acuerdo.</p>
              </div>
            )}
            {negotiationState.round > negotiationState.maxRounds && negotiationState.status === "active" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-yellow-800 mb-2">Límite de rondas alcanzado</h3>
                <p className="text-yellow-700 mb-4">La negociación se cerrará automáticamente.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      {negotiationState.status === "active" && negotiationState.round <= negotiationState.maxRounds && !dealClosed && (
        <div className="p-4 border-t bg-white space-y-3">
          {/* Quick Offer Chips solo para comprador */}
          {role === "buyer" && (
          <div className="flex gap-2 flex-wrap">
              {[10, 20, 30].map((percent) => (
              <Badge
                  key={percent}
                variant="outline"
                className="cursor-pointer hover:bg-orange-50 px-3 py-1"
                  onClick={() => handleOffer(product.price * (1 - percent / 100))}
              >
                  -{percent}%
              </Badge>
            ))}
          </div>
          )}
          {/* Custom Offer Input */}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder={role === "buyer" ? "Tu oferta (Bs)" : "Tu contraoferta (Bs)"}
              value={customOffer}
              onChange={(e) => setCustomOffer(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleOffer(Number(customOffer))}
              onInput={handleTyping}
              disabled={negotiationState.status !== "active"}
            />
            <Button
              onClick={() => handleOffer(Number(customOffer))}
              disabled={!customOffer || negotiationState.status !== "active"}
              className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
