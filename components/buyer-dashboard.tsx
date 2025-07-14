"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Mic, Send, MapPin, Star } from "lucide-react"
import { useAppStore } from "@/lib/store"

interface BuyerDashboardProps {
  onNavigate: (screen: string) => void
}

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

export function BuyerDashboard({ onNavigate }: BuyerDashboardProps) {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Array<{ type: "user" | "ai"; content: string; products?: Product[] }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const { setSelectedProduct } = useAppStore()

  const mockProducts: Product[] = [
    {
      id: "1",
      name: "Tomates frescos",
      price: 12.5,
      distance: 0.3,
      rating: 4.8,
      image: "/placeholder.svg?height=120&width=120",
      seller: "María González",
      location: { lat: -17.7833, lng: -63.1821 },
    },
    {
      id: "2",
      name: "Papas amarillas",
      price: 8.0,
      distance: 0.5,
      rating: 4.6,
      image: "/placeholder.svg?height=120&width=120",
      seller: "Carlos Ruiz",
      location: { lat: -17.7833, lng: -63.1821 },
    },
    {
      id: "3",
      name: "Cebollas rojas",
      price: 6.5,
      distance: 0.7,
      rating: 4.9,
      image: "/placeholder.svg?height=120&width=120",
      seller: "Ana López",
      location: { lat: -17.7833, lng: -63.1821 },
    },
  ]

  const handleSend = async () => {
    if (!query.trim()) return

    const userMessage = { type: "user" as const, content: query }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Simulate AI response with product recommendations
      const aiResponse = `Encontré ${mockProducts.length} productos cerca de ti:`
      const aiMessage = {
        type: "ai" as const,
        content: aiResponse,
        products: mockProducts,
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          type: "ai" as const,
          content: "Lo siento, hubo un error. Intenta de nuevo.",
        },
      ])
    } finally {
      setIsLoading(false)
      setQuery("")
    }
  }

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    onNavigate("productDetail")
  }

  const handleVoiceInput = () => {
    // Simulate voice input
    setQuery("Busco tomates y papas para cocinar")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-center">
        <img src="/logo-busqai.png" alt="Busqai" className="h-16 w-auto" />
      </div>

      {/* Chat Area - 70% height */}
      <div className="flex-1 flex flex-col" style={{ height: "70vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pt-16">
              <img src="/isotipo-busqai.png" alt="Busqai" className="w-36 h-36 mb-8 opacity-60" />
              <p className="text-2xl font-semibold text-gray-700 text-center">¿Qué buscas hoy?</p>
            </div>
          ) : (
            messages.map((message, index) => (
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
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-24 object-cover rounded mb-2"
                            />
                            <h4 className="font-semibold text-sm text-gray-900">{product.name}</h4>
                            <p className="text-lg font-bold text-green-600">Bs {product.price}</p>
                            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{product.distance}km</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{product.rating}</span>
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
            <Button variant="outline" size="icon" onClick={handleVoiceInput} className="shrink-0 bg-transparent">
              <Mic className="w-4 h-4" />
            </Button>

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe o dicta lo que buscas..."
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />

            <Button
              onClick={handleSend}
              disabled={!query.trim() || isLoading}
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
