"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, MapPin, Star, MessageCircle } from "lucide-react"
import { NegotiationChat } from "@/components/negotiation-chat"
import dynamic from "next/dynamic"
const MapView = dynamic(() => import("@/components/ui/MapView").then(mod => mod.MapView), { ssr: false })
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { createChat } from "@/lib/supabase"
import { useAppStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface Product {
  id: string
  name: string
  price: number
  distance: number
  rating: number
  image: string
  seller: string
  location: { lat: number; lng: number }
  seller_id: string // Added for chat creation
}

interface ProductDetailProps {
  product: Product | null
  onNavigate: (screen: string) => void
}

export function ProductDetail({ product, onNavigate }: ProductDetailProps) {
  const [showChat, setShowChat] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const { setSelectedProduct } = useAppStore()
  const router = useRouter()

  const { user } = useAuth()

  // Handler para negociar (crear chat real y navegar)
  const handleNegotiate = async () => {
    if (!product) {
      alert("No se pudo cargar la información del producto")
      return
    }

    const sellerId = product.seller_id
    if (!product.id || !sellerId) {
      alert("Este producto no tiene un vendedor válido")
      return
    }

    if (!user) {
      alert("Debes iniciar sesión para negociar")
      onNavigate("login")
      return
    }

    try {
      const { data: chat, error } = await createChat(product.id, sellerId)
      
      if (error) {
        console.error("Error al crear el chat:", error)
        throw error
      }

      if (chat && chat.id) {
        setSelectedProduct(product)
        onNavigate(`negotiationChat:${chat.id}`)
      } else {
        throw new Error("No se pudo crear el chat: respuesta inesperada del servidor")
      }
    } catch (error) {
      console.error("Error en la negociación:", error)
      const errorMessage = error instanceof Error ? error.message : "Por favor, inténtalo de nuevo más tarde."
      alert(`Error al iniciar la negociación: ${errorMessage}`)
    }
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Producto no encontrado</p>
      </div>
    )
  }

  if (showChat) {
    return <NegotiationChat product={product} onBack={() => setShowChat(false)} onNavigate={onNavigate} role="buyer" />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("main")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Detalle del producto</h1>
      </div>

      {/* Product Images Carousel */}
      <div className="relative">
        <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-64 object-cover" />
        <div className="absolute bottom-4 left-4 right-4 flex justify-center">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div className="w-2 h-2 bg-white/50 rounded-full"></div>
            <div className="w-2 h-2 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Product Info */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <div className="text-3xl font-bold text-green-600">Bs {product.price}</div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{product.distance}km de distancia</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{product.rating}</span>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Vendedor</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF7300] to-[#FFE100] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">{product.seller.charAt(0)}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{product.seller}</p>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>4.8 • 127 ventas</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Ubicación</h3>
          <Dialog open={mapOpen} onOpenChange={setMapOpen}>
            <DialogTrigger asChild>
              {/* Solo mostrar el mapa pequeño si el modal NO está abierto */}
              {!mapOpen && (
                <div className="mb-2 cursor-pointer" onClick={() => setMapOpen(true)}>
                  <MapView
                    lat={product.location.lat}
                    lng={product.location.lng}
                    label={`Vendedor: ${product.seller}`}
                    height={180}
                  />
                </div>
              )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full h-[60vh] flex flex-col items-center justify-center">
              <DialogTitle>Mapa de ubicación del vendedor</DialogTitle>
              <DialogDescription>Explora la ubicación del vendedor en el mapa ampliado.</DialogDescription>
              <div className="w-full h-[50vh] mt-2">
                <MapView
                  lat={product.location.lat}
                  lng={product.location.lng}
                  label={`Vendedor: ${product.seller}`}
                  height={300}
                  zoom={17}
                />
              </div>
            </DialogContent>
          </Dialog>
          <div className="text-gray-600 text-sm mt-2">
            {product.distance}km de distancia
          </div>
        </Card>

        {/* Action Button */}
        <Button
          onClick={handleNegotiate}
          className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white py-4 text-lg font-semibold"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Negociar
        </Button>
      </div>
    </div>
  )
}
