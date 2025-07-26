"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Edit2, Camera, Upload, User, Phone, MapPin, Star, Package, DollarSign, TrendingUp, Check, X, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppStore } from "@/lib/store"
import { useImageCapture } from "@/hooks/use-image-capture"
import { useImageUpload } from "@/hooks/use-image-upload"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

interface ProfileProps {
  userType: "buyer" | "seller"
  onNavigate: (screen: string) => void
}

export function Profile({ userType, onNavigate }: ProfileProps) {
  const { user, profile, updateProfile, signInWithPhone, verifyOtp } = useAuth()
  const { captureFromCamera, selectFromGallery, isCapturing } = useImageCapture()
  const { uploadProfileImage, isUploading } = useImageUpload()
  const clearSearch = useAppStore((s) => s.clearSearch)
  const [isEditing, setIsEditing] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [editData, setEditData] = useState(profile || { full_name: "", phone: "", avatar_url: "" })
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [pendingPhone, setPendingPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [showLocationError, setShowLocationError] = useState("")
  const [addressLiteral, setAddressLiteral] = useState("")
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  
  // Efecto para cargar datos del perfil
  useEffect(() => {
    if (profile) {
      setEditData(profile);
    }
  }, [profile]);

  const handleSave = async () => {
    if (editData.phone !== profile?.phone) {
      setPendingPhone(editData.phone)
      setShowPhoneModal(true)
      return
    }
    // Solo permitir edición de nombre y avatar
    const { error } = await updateProfile({ 
      full_name: editData.full_name, 
      avatar_url: editData.avatar_url 
    })
    if (!error) setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(profile || { full_name: "", phone: "", avatar_url: "" })
    setIsEditing(false)
  }

  const handlePhotoChange = async (type: "camera" | "gallery") => {
    try {
      let result
      
      if (type === "camera") {
        result = await captureFromCamera({ maxWidth: 800, maxHeight: 800, quality: 0.8 })
      } else {
        result = await selectFromGallery({ maxWidth: 800, maxHeight: 800, quality: 0.8 })
      }

      if (result.error) {
        alert(`Error: ${result.error}`)
        return
      }

      if (result.file && result.dataUrl && user?.id) {
        // Show preview immediately
        setEditData({ ...editData, avatar_url: result.dataUrl })
        setShowPhotoOptions(false)
        
        // Upload to backend
        const uploadResult = await uploadProfileImage(result.file, user.id)
        
        if (uploadResult.error) {
          alert(`Upload error: ${uploadResult.error}`)
          // Revert to previous avatar
          setEditData({ ...editData, avatar_url: profile?.avatar_url || "" })
        } else if (uploadResult.url) {
          // Update with final URL
          const updatedProfile = { ...editData, avatar_url: uploadResult.url }
          setEditData(updatedProfile)
          
          // Update profile in database
          const { error } = await updateProfile(updatedProfile)
          if (error) {
            console.error('Failed to update profile:', error)
          }
        }
      }
    } catch (error) {
      console.error('Photo change error:', error)
      alert('Error al cambiar la foto. Inténtalo de nuevo.')
    }
  }

  const handleLogout = () => {
    clearSearch()
    localStorage.clear()
    window.location.reload()
  }

  const handleSendPhoneCode = async () => {
    setPhoneError("")
    setIsVerifyingPhone(true)
    const { error } = await signInWithPhone(pendingPhone)
    setIsVerifyingPhone(false)
    if (error) setPhoneError("Error enviando código: " + error.message)
  }

  const handleVerifyPhoneCode = async () => {
    setPhoneError("")
    setIsVerifyingPhone(true)
    const { error } = await verifyOtp(pendingPhone, phoneCode, { full_name: editData.full_name, user_type: userType })
    setIsVerifyingPhone(false)
    if (!error) {
      await updateProfile({ phone: pendingPhone })
      setShowPhoneModal(false)
      setIsEditing(false)
    } else {
      setPhoneError("Código incorrecto o expirado. Intenta de nuevo.")
    }
  }

 // Obtener ubicación por GPS y actualizar en Supabase si cambia
 useEffect(() => {
  if (!profile) return
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      // Solo actualizar si las coordenadas cambiaron
      if (profile.latitude !== lat || profile.longitude !== lng) {
        await updateProfile({ latitude: lat, longitude: lng })
      }
    },
    () => {},
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}, [profile])

const LOCATIONIQ_TOKEN = "pk.a785d8d95c95aaf22418fea22aac0a98"

// Sistema de caching para dirección literaria
useEffect(() => {
  async function fetchAndCacheAddress() {
    if (!profile?.latitude || !profile?.longitude) {
      setAddressLiteral("")
      return
    }

    // Si ya tenemos una dirección guardada, usarla
    if (profile.address) {
      setAddressLiteral(profile.address)
      return
    }

    // Solo hacer la petición si no tenemos dirección guardada
    setIsLoadingAddress(true)
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_TOKEN}&lat=${profile.latitude}&lon=${profile.longitude}&format=json`
      )
      
      if (!res.ok) {
        if (res.status === 429) {
          setAddressLiteral("Límite de peticiones alcanzado")
          return
        }
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      let formattedAddress = ""
      
      if (userType === "buyer") {
        // Para compradores: Ciudad, País
        const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.municipality
        const country = data.address.country
        formattedAddress = [city, country].filter(Boolean).join(", ")
      } else {
        // Para vendedores: Dirección, Ciudad, País
        const road = data.address.road || data.address.street || data.address.house_number
        const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.municipality
        const country = data.address.country
        formattedAddress = [road, city, country].filter(Boolean).join(", ")
      }

      // Guardar la dirección en Supabase para evitar futuras peticiones
      if (formattedAddress) {
        await updateProfile({ address: formattedAddress })
      }
      
      setAddressLiteral(formattedAddress)
    } catch (error) {
      console.error("Error fetching address:", error)
      setAddressLiteral("Error obteniendo dirección")
    } finally {
      setIsLoadingAddress(false)
    }
  }

  fetchAndCacheAddress()
}, [profile?.latitude, profile?.longitude, profile?.address, userType])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // ... (resto del código del componente de perfil)
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              {editData.avatar_url ? (
                <AvatarImage src={editData.avatar_url} alt={editData.full_name} />
              ) : (
                <AvatarFallback className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white text-lg font-semibold">
                  {getInitials(editData.full_name || "")}
                </AvatarFallback>
              )}
            </Avatar>
            {isEditing && (
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0 bg-white"
                onClick={() => setShowPhotoOptions(true)}
              >
                <Camera className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{editData.full_name}</h1>
            <p className="text-sm text-gray-600 capitalize">{userType === "buyer" ? "Comprador" : "Vendedor"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            {isEditing ? "Cancelar" : "Editar"}
          </Button>
        </div>
      </div>

        {/* Photo Options Modal */}
        {showPhotoOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-t-lg w-full max-w-md p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-4">Cambiar foto de perfil</h3>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => handlePhotoChange("camera")}
              disabled={isCapturing || isUploading}
            >
              <Camera className="w-5 h-5" />
              {isCapturing ? "Accediendo a cámara..." : "Tomar foto"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => handlePhotoChange("gallery")}
              disabled={isCapturing || isUploading}
            >
              <Upload className="w-5 h-5" />
              {isCapturing ? "Seleccionando..." : "Seleccionar de galería"}
            </Button>
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-[#FF7300] h-2 rounded-full transition-all duration-300" style={{ width: '50%' }}></div>
              </div>
            )}
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => setShowPhotoOptions(false)}
              disabled={isCapturing || isUploading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent>
          <DialogHeader>Verificar nuevo número</DialogHeader>
          <p className="mb-2">Ingresa el código que enviamos a {pendingPhone}</p>
          <Input
            type="text"
            placeholder="Código de 4 dígitos"
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
            maxLength={4}
            className="mb-2 text-center tracking-widest"
          />
          {phoneError && <p className="text-red-600 text-center mb-2">{phoneError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPhoneModal(false)}>Cancelar</Button>
            <Button onClick={handleVerifyPhoneCode} disabled={isVerifyingPhone || phoneCode.length < 4}>
              Verificar
            </Button>
            <Button onClick={handleSendPhoneCode} disabled={isVerifyingPhone} variant="ghost">
              Reenviar código
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-4 space-y-4">
        {/* Personal Information */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Información Personal
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-gray-900">{profile?.full_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="mt-1"
                />
              ) : (
              <div className="mt-1 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">{profile?.phone}</span>
              </div>
              )}
            </div>

            <div>
              <Label htmlFor="location">Ubicación</Label>
              <div className="mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                {isLoadingAddress ? (
                  <span className="text-gray-500">Obteniendo ubicación...</span>
                ) : addressLiteral ? (
                  <span className="text-gray-900">{addressLiteral}</span>
                ) : (
                  <span className="text-gray-900">Ubicación no disponible</span>
                )}
              </div>
              {showLocationError && <p className="text-red-600 text-sm mt-1">{showLocationError}</p>}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Guardar
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </Card>



        {/* App Settings */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Configuración</h3>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              Notificaciones
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              Privacidad
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              Ayuda y soporte
            </Button>
          </div>
        </Card>

        {/* Logout */}
        <Card className="p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </Card>
      </div>
    </div>
  )
}
