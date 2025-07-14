"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Check, X } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  distance: number
  rating: number
  image: string
  seller: string
  location: { lat: number; lng: number }
}

interface Message {
  id: string
  type: "buyer" | "seller" | "system"
  content: string
  offer?: number
  timestamp: Date
}

interface NegotiationChatProps {
  product: Product
  onBack: () => void
  onNavigate: (screen: string) => void
}

export function NegotiationChat({ product, onBack, onNavigate }: NegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "system",
      content: `Iniciaste una negociación por ${product.name}`,
      timestamp: new Date(),
    },
  ])
  const [customOffer, setCustomOffer] = useState("")
  const [dealClosed, setDealClosed] = useState(false)
  const [finalPrice, setFinalPrice] = useState<number | null>(null)

  const quickOffers = [
    { label: "-10%", value: product.price * 0.9 },
    { label: "-20%", value: product.price * 0.8 },
    { label: "Mejor precio", value: 0 },
  ]

  const handleQuickOffer = (offer: number) => {
    if (offer === 0) {
      // "Mejor precio" option
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "buyer",
        content: "¿Cuál es tu mejor precio?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])

      // Simulate seller response
      setTimeout(() => {
        const sellerResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: "seller",
          content: `Mi mejor precio es Bs${(product.price * 0.85).toFixed(2)}`,
          offer: product.price * 0.85,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, sellerResponse])
      }, 1500)
    } else {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "buyer",
        content: `Te ofrezco Bs${offer.toFixed(2)}`,
        offer: offer,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])

      // Simulate seller response
      setTimeout(() => {
        const difference = ((product.price - offer) / product.price) * 100
        let response = ""
        let counterOffer = 0

        if (difference < 15) {
          response = "¡Acepto tu oferta!"
          setFinalPrice(offer)
          setDealClosed(true)
        } else {
          counterOffer = product.price * 0.9
          response = `¿Qué tal Bs${counterOffer.toFixed(2)}?`
        }

        const sellerResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: "seller",
          content: response,
          offer: counterOffer || offer,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, sellerResponse])
      }, 1500)
    }
  }

  const handleCustomOffer = () => {
    const offer = Number.parseFloat(customOffer)
    if (offer > 0) {
      handleQuickOffer(offer)
      setCustomOffer("")
    }
  }

  const handleAcceptOffer = (offer: number) => {
    setFinalPrice(offer)
    setDealClosed(true)

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "buyer",
      content: "¡Acepto!",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleConfirmPayment = () => {
    // Simulate payment confirmation and commission deduction
    const commission = (finalPrice || product.price) * 0.05

    // Update seller balance (simulate)
    const currentBalance = Number.parseFloat(localStorage.getItem("sellerBalance") || "15.50")
    const newBalance = currentBalance - commission
    localStorage.setItem("sellerBalance", newBalance.toString())

    // Record metrics
    const metrics = JSON.parse(localStorage.getItem("appMetrics") || '{"visits": 0, "chats": 0, "sales": 0}')
    metrics.sales += 1
    localStorage.setItem("appMetrics", JSON.stringify(metrics))

    onNavigate("buyerDashboard")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{product.seller}</h1>
          <p className="text-sm text-gray-600">{product.name}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">Bs{product.price}</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === "buyer" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === "buyer"
                  ? "bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white"
                  : message.type === "seller"
                    ? "bg-gray-100 text-gray-900"
                    : "bg-blue-50 text-blue-800 text-center"
              }`}
            >
              <p>{message.content}</p>
              {message.offer && message.offer > 0 && message.type === "seller" && !dealClosed && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptOffer(message.offer!)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {dealClosed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <h3 className="font-semibold text-green-800 mb-2">¡Trato cerrado!</h3>
            <p className="text-green-700 mb-4">Precio final: Bs {finalPrice?.toFixed(2)}</p>
            <Button onClick={handleConfirmPayment} className="bg-green-600 hover:bg-green-700 text-white">
              Confirmar pago en efectivo
            </Button>
          </div>
        )}
      </div>

      {/* Input Area */}
      {!dealClosed && (
        <div className="p-4 border-t bg-white space-y-3">
          {/* Quick Offer Chips */}
          <div className="flex gap-2 flex-wrap">
            {quickOffers.map((offer, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-orange-50 px-3 py-1"
                onClick={() => handleQuickOffer(offer.value)}
              >
                {offer.label}
              </Badge>
            ))}
          </div>

          {/* Custom Offer Input */}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Tu oferta ($)"
              value={customOffer}
              onChange={(e) => setCustomOffer(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCustomOffer()}
            />
            <Button
              onClick={handleCustomOffer}
              disabled={!customOffer}
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
