'use client'

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getWalletBalance, getWalletTransactions, addWalletCredit } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Loader2, ArrowUpDown, CreditCard, Smartphone, Building } from "lucide-react"

type Transaction = {
  id: string
  type: 'credit' | 'debit'
  amount: number
  description: string
  created_at: string
  reference_type?: string
}

export default function WalletPage() {
  const { user } = useAuth()
  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRechargeForm, setShowRechargeForm] = useState(false)
  const [customAmount, setCustomAmount] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"transfer" | "qr" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [balanceRes, transactionsRes] = await Promise.all([
        getWalletBalance(),
        getWalletTransactions(10, 0)
      ])
      
      setBalance(balanceRes.data || 0)
      setTransactions(transactionsRes || [])
    } catch (err) {
      console.error("Error fetching wallet data:", err)
      setError("Error al cargar los datos de la billetera. Intenta de nuevo más tarde.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchWalletData()
    }
  }, [user])

  // Handle recharge
  const handleRecharge = async (amount: number) => {
    if (!user || !selectedPaymentMethod) return
    
    try {
      setIsProcessing(true)
      setError(null)
      
      await addWalletCredit(
        amount, 
        `Recarga mediante ${selectedPaymentMethod === 'transfer' ? 'transferencia' : 'QR'}`
      )
      
      // Refresh data
      await fetchWalletData()
      setShowRechargeForm(false)
      setCustomAmount("")
      setSelectedPaymentMethod(null)
    } catch (err) {
      console.error("Error processing recharge:", err)
      setError("Error al procesar la recarga. Intenta de nuevo.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Mi Billetera</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Balance Card */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 mb-1">Saldo disponible</p>
            <p className="text-4xl font-bold text-gray-900">
              Bs {balance.toFixed(2)}
            </p>
          </div>
          <div className="bg-orange-100 p-3 rounded-full">
            <CreditCard className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </Card>

      {/* Recharge Section */}
      <Card className="p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recargar saldo</h2>
        </div>
        
        {!showRechargeForm ? (
          <Button
            onClick={() => setShowRechargeForm(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Recargar saldo
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Monto a recargar (Bs)</label>
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Ej: 100.00"
                min="1"
                step="0.01"
                className="text-lg py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedPaymentMethod === 'transfer' ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod('transfer')}
                  type="button"
                  className="flex flex-col h-auto py-3"
                >
                  <Building className="w-5 h-5 mb-1" />
                  <span>Transferencia</span>
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'qr' ? 'default' : 'outline'}
                  onClick={() => setSelectedPaymentMethod('qr')}
                  type="button"
                  className="flex flex-col h-auto py-3"
                >
                  <Smartphone className="w-5 h-5 mb-1" />
                  <span>QR</span>
                </Button>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRechargeForm(false)
                  setCustomAmount("")
                  setSelectedPaymentMethod(null)
                }}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleRecharge(Number(customAmount))}
                disabled={!customAmount || !selectedPaymentMethod || isProcessing}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  'Confirmar recarga'
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Transactions History */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Historial de transacciones</h2>
          <div className="flex items-center text-sm text-gray-500">
            <ArrowUpDown className="w-4 h-4 mr-1" />
            <span>Más recientes</span>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No hay transacciones recientes
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                  <p className={`text-lg font-semibold ${
                    tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'credit' ? '+' : '-'}Bs {parseFloat(tx.amount.toString()).toFixed(2)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
