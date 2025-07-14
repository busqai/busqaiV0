"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Phone, MapPin, Edit2, Check, X, LogOut, Camera, Upload } from "lucide-react"

interface ProfileProps {
  userType: "buyer" | "seller"
  onNavigate: (screen: string) => void
}

export function Profile({ userType, onNavigate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [userData, setUserData] = useState({
    name: "",
    phone: "",
    location: "Santa Cruz, Bolivia",
    avatar: "",
  })
  const [editData, setEditData] = useState(userData)

  useEffect(() => {
    // Load user data from localStorage
    const name = localStorage.getItem("userName") || "Usuario"
    const phone = localStorage.getItem("userPhone") || ""
    const avatar = localStorage.getItem("userAvatar") || ""

    const data = { name, phone, location: "Santa Cruz, Bolivia", avatar }
    setUserData(data)
    setEditData(data)
  }, [])

  const handleSave = () => {
    setUserData(editData)
    localStorage.setItem("userName", editData.name)
    localStorage.setItem("userAvatar", editData.avatar)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(userData)
    setIsEditing(false)
  }

  const handlePhotoChange = (type: "camera" | "gallery") => {
    // Simulate photo selection/capture
    const newAvatar = "/placeholder.svg?height=100&width=100"
    setEditData({ ...editData, avatar: newAvatar })
    setShowPhotoOptions(false)
  }

  const handleLogout = () => {
    localStorage.clear()
    window.location.reload()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              {userData.avatar ? (
                <AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.name} />
              ) : (
                <AvatarFallback className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white text-lg font-semibold">
                  {getInitials(userData.name)}
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
            <h1 className="text-xl font-bold text-gray-900">{userData.name}</h1>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-lg w-full max-w-md p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-4">Cambiar foto de perfil</h3>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => handlePhotoChange("camera")}
            >
              <Camera className="w-5 h-5" />
              Tomar foto
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => handlePhotoChange("gallery")}
            >
              <Upload className="w-5 h-5" />
              Seleccionar de galería
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowPhotoOptions(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

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
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <div className="mt-1 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900">{userData.phone}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="location">Ubicación</Label>
              <div className="mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900">{userData.location}</span>
              </div>
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

        {/* Account Statistics - Solo mostrar para vendedores */}
        {userType === "seller" && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-sm text-gray-600">Productos publicados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">23</p>
                <p className="text-sm text-gray-600">Ventas realizadas</p>
              </div>
            </div>
          </Card>
        )}

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
