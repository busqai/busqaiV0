"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Minus, CreditCard, Smartphone, Building } from "lucide-react"

interface WalletProps {
  onNavigate: (screen: string) => void
}

interface Transaction {
  id: string
  type: "recharge" | "commission"
  amount: number
  description: string
  date: Date
}

export function Wallet({ onNavigate }: WalletProps) {
  const [balance, setBalance] = useState(78.5)
  const [customAmount, setCustomAmount] = useState("")
  const [showRechargeForm, setShowRechargeForm] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"transfer" | "qr" | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      type: "recharge",
      amount: 100.0,
      description: "Recarga inicial",
      date: new Date(Date.now() - 86400000),
    },
    {
      id: "2",
      type: "commission",
      amount: -2.5,
      description: "Comisión por venta - Tomates",
      date: new Date(Date.now() - 43200000),
    },
    {
      id: "3",
      type: "commission",
      amount: -3.75,
      description: "Comisión por venta - Papas",
      date: new Date(Date.now() - 21600000),
    },
  ])

  const handleRecharge = (amount: number) => {
    const newBalance = balance + amount
    setBalance(newBalance)

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: "recharge",
      amount: amount,
      description: `Recarga de Bs ${amount}`,
      date: new Date(),
    }

    setTransactions((prev) => [newTransaction, ...prev])

    // Update localStorage for demo
    localStorage.setItem("sellerBalance", newBalance.toString())

    // Reset form
    setShowRechargeForm(false)
    setCustomAmount("")
    setSelectedPaymentMethod(null)
  }

  const handleProcessRecharge = () => {
    const amount = Number.parseFloat(customAmount)
    if (amount > 0 && selectedPaymentMethod) {
      handleRecharge(amount)
    }
  }

  useEffect(() => {
    // Load balance from localStorage
    const savedBalance = localStorage.getItem("sellerBalance")
    if (savedBalance) {
      setBalance(Number.parseFloat(savedBalance))
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - Sin botón de volver */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi Billetera</h1>
          <p className="text-sm text-gray-600">Gestiona tu saldo y transacciones</p>
        </div>
        <img src="/logo-busqai.png" alt="Busqai" className="h-14 w-auto opacity-60" />
      </div>

      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Saldo disponible</p>
          <p className={`text-4xl font-bold mb-4 ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
            Bs {balance.toFixed(2)}
          </p>

          {balance < 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">Saldo negativo. Tus productos están ocultos hasta que recargues.</p>
            </div>
          )}
        </Card>

        {/* Recharge Button */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Recargar saldo</h3>

          {!showRechargeForm ? (
            <Button
              onClick={() => setShowRechargeForm(true)}
              className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white py-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Recargar
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto a recargar</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ingresa el monto en Bs"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="text-lg py-3"
                />
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Método de pago</label>
                <div className="space-y-2">
                  <Card
                    className={`p-3 cursor-pointer border-2 transition-colors ${
                      selectedPaymentMethod === "transfer"
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                    onClick={() => setSelectedPaymentMethod("transfer")}
                  >
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">Transferencia bancaria</span>
                    </div>
                  </Card>

                  <Card
                    className={`p-3 cursor-pointer border-2 transition-colors ${
                      selectedPaymentMethod === "qr"
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                    onClick={() => setSelectedPaymentMethod("qr")}
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">QR</span>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRechargeForm(false)
                    setCustomAmount("")
                    setSelectedPaymentMethod(null)
                  }}
                  className="flex-1 bg-transparent"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcessRecharge}
                  disabled={!customAmount || !selectedPaymentMethod}
                  className="flex-1 bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
                >
                  Procesar recarga
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Transaction History */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Historial de transacciones</h3>

          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === "recharge" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {transaction.type === "recharge" ? (
                      <Plus className="w-4 h-4 text-green-600" />
                    ) : (
                      <Minus className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.date.toLocaleDateString()} {transaction.date.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <p className={`font-semibold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {transaction.amount > 0 ? "+" : ""}Bs {Math.abs(transaction.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay transacciones aún</p>
            </div>
          )}
        </Card>

        {/* Payment Method Info */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Métodos de pagos</h3>
          <p className="text-sm text-gray-600 mb-3">
            Las recargas se procesan de forma segura a través de nuestro sistema de pagos.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building className="w-4 h-4" />
              <span>Transferencia bancaria</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Smartphone className="w-4 h-4" />
              <span>QR</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
