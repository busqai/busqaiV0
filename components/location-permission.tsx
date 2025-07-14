"use client"

import { MapPin, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface LocationPermissionProps {
  onGranted: () => void
}

export function LocationPermission({ onGranted }: LocationPermissionProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState("")

  const requestLocation = async () => {
    setIsRequesting(true)
    setError("")

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      // Store location in localStorage for demo
      localStorage.setItem(
        "userLocation",
        JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      )

      onGranted()
    } catch (err) {
      setError("Necesitamos tu ubicación para mostrarte productos cercanos")
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] mb-8">
        <MapPin className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Permiso de Ubicación</h2>

      <p className="text-gray-600 text-center mb-8 leading-relaxed">
        Para mostrarte productos y vendedores cercanos, necesitamos acceso a tu ubicación.
      </p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Button
        onClick={requestLocation}
        disabled={isRequesting}
        className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white font-semibold py-4 text-lg"
      >
        {isRequesting ? "Solicitando..." : "Permitir Ubicación"}
      </Button>
    </div>
  )
}
