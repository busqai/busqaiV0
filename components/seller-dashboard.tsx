"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Package } from "lucide-react"

interface SellerDashboardProps {
  onNavigate: (screen: string) => void
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  image: string
  suggestions: string[]
}

export function SellerDashboard({ onNavigate }: SellerDashboardProps) {
  const [balance, setBalance] = useState(78.5)
  const [todaySalesAmount, setTodaySalesAmount] = useState(236.25) // Valor monetario de ventas
  const [todaySalesCount, setTodaySalesCount] = useState(3) // Cantidad de ventas
  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      name: "Tomates frescos",
      price: 12.5,
      stock: 25,
      image: "/placeholder.svg?height=80&width=80",
      suggestions: ["Baja 5%", "Agrupa con papas"],
    },
    {
      id: "2",
      name: "Papas amarillas",
      price: 8.0,
      stock: 40,
      image: "/placeholder.svg?height=80&width=80",
      suggestions: ["Sube stock"],
    },
  ])

  const isBalancePositive = balance > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header with Balance and Sales */}
      <div className="bg-white border-b px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mi Tienda</h1>
          <img src="/logo-busqai.png" alt="Busqai" className="h-14 w-auto opacity-60" />
        </div>

        <div className="flex items-center justify-between">
          {/* Ventas de hoy - Izquierda y más notorio */}
          <div>
            <p className="text-sm text-gray-600">Ventas de hoy</p>
            <p className="text-3xl font-bold text-green-600">Bs {todaySalesAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{todaySalesCount} ventas realizadas</p>
          </div>

          {/* Saldo disponible - Derecha */}
          <div className="text-right">
            <p className="text-sm text-gray-600">Saldo disponible</p>
            <p className={`text-xl font-bold ${isBalancePositive ? "text-gray-900" : "text-red-600"}`}>
              Bs {balance.toFixed(2)}
            </p>
          </div>
        </div>

        {!isBalancePositive && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Tus productos están ocultos. Recarga tu saldo para que sean visibles.
            </p>
            <Button
              size="sm"
              className="mt-2 bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
              onClick={() => onNavigate("wallet")}
            >
              Recargar ahora
            </Button>
          </div>
        )}
      </div>

      {/* Products List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mis Productos</h2>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {products.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className={`p-4 ${!isBalancePositive ? "opacity-50" : ""}`}>
              <div className="flex gap-3">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-lg font-bold text-green-600">Bs {product.price}</span>
                    <span className="text-sm text-gray-600">Stock: {product.stock}</span>
                  </div>

                  {product.suggestions.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {product.suggestions.map((suggestion, index) => (
                        <Badge key={index} variant="outline" className="text-xs cursor-pointer hover:bg-orange-50">
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No tienes productos aún</p>
            <Button
              onClick={() => onNavigate("addProduct")}
              className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
            >
              Añadir tu primer producto
            </Button>
          </div>
        )}
      </div>

      {/* Floating Add Button - Más espacio desde abajo */}
      <Button
        onClick={() => onNavigate("addProduct")}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white shadow-lg z-10"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  )
}
