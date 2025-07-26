"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface AuthScreenProps {
  onComplete: () => void
  userType: "buyer" | "seller"
}

export function AuthScreen({ onComplete, userType }: AuthScreenProps) {
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const { signInWithPhone, verifyOtp } = useAuth()

  const handleSendCode = async () => {
    if (phone.length < 8 || !name.trim()) return
    setIsLoading(true)
    setErrorMsg("")
    const { error } = await signInWithPhone(phone)
    setIsLoading(false)
    if (!error) {
    setStep("code")
    } else {
      setErrorMsg("Error enviando código: " + error.message)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length < 4) return
    setIsLoading(true)
    setErrorMsg("")
    const { error } = await verifyOtp(phone, code, { full_name: name, user_type: userType })
    setIsLoading(false)
    if (!error) {
    onComplete()
    } else {
      setErrorMsg("Código incorrecto o expirado. Intenta de nuevo.")
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-8">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-center w-32 h-32 rounded-full mb-8 mx-auto">
          {step === "phone" ? (
            <img src="/isotipo-busqai.png" alt="Busqai" className="w-28 h-28" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] flex items-center justify-center">
              <MessageSquare className="w-14 h-14 text-white" />
            </div>
          )}
        </div>
        {/* Role-specific UI removed as per user request */}

        {step === "phone" ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Ingresa tus datos</h2>
            <p className="text-gray-600 text-center mb-8">Te enviaremos un código de verificación por SMS</p>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg py-4"
              />

              <Input
                type="tel"
                placeholder="Número de celular (ej: 70123456)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg py-4"
              />

              <Button
                onClick={handleSendCode}
                disabled={phone.length < 8 || !name.trim() || isLoading}
                className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white font-semibold py-4 text-lg"
              >
                {isLoading ? "Enviando..." : "Enviar Código"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Código de verificación</h2>
            <p className="text-gray-600 text-center mb-8">Ingresa el código que enviamos a {phone}</p>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Código de 4 dígitos"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-lg py-4 text-center tracking-widest"
                maxLength={4}
              />

              {errorMsg && <p className="text-red-600 text-center mb-2">{errorMsg}</p>}

              <Button
                onClick={handleVerifyCode}
                disabled={code.length < 4 || isLoading}
                className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white font-semibold py-4 text-lg"
              >
                {isLoading ? "Verificando..." : "Verificar"}
              </Button>

              <Button variant="ghost" onClick={() => setStep("phone")} className="w-full text-gray-600">
                Cambiar datos
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
