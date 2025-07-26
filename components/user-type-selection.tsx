"use client"

import { ShoppingBag, Store } from "lucide-react"
import { Card } from "@/components/ui/card"

interface UserTypeSelectionProps {
  onSelect: (type: "buyer" | "seller") => void
}

export function UserTypeSelection({ onSelect }: UserTypeSelectionProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-8">
      <div className="flex flex-col justify-center items-center w-full max-w-md gap-12">
        <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Cómo quieres usar Busqai?</h2>
        <p className="text-gray-600">Selecciona tu perfil para continuar</p>
      </div>
        <div className="flex flex-col gap-6 w-full">
        <Card
          className="p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-orange-200"
          onClick={() => onSelect("buyer")}
        >
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] mb-6 mx-auto">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Soy Comprador</h3>
            <p className="text-gray-600 leading-relaxed">
              Busco productos en mercados locales y quiero encontrar las mejores ofertas cerca de mí
            </p>
          </div>
        </Card>

        <Card
          className="p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-orange-200"
          onClick={() => onSelect("seller")}
        >
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] mb-6 mx-auto">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Soy Vendedor</h3>
            <p className="text-gray-600 leading-relaxed">
              Tengo productos para vender y quiero que más clientes me encuentren fácilmente
            </p>
          </div>
        </Card>
        </div>
      </div>
    </div>
  )
}
