"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Camera, Upload, MapPin, Sparkles, Check, Scale, Package } from "lucide-react"
import { useImageCapture } from "@/hooks/use-image-capture"
import { useImageUpload } from "@/hooks/use-image-upload"
import { useAppStore } from "@/lib/store"
import { createProduct } from "@/lib/supabase"

interface AddProductProps {
  onNavigate: (screen: string) => void
}

export function AddProduct({ onNavigate }: AddProductProps) {
  const [step, setStep] = useState(1)
  const [productData, setProductData] = useState({
    title: "",
    category: "",
    price: "",
    unit: "",
    description: "",
    image: null as string | null,
    location: "",
    stock: "",
    lat: null as number | null,
    lng: null as number | null,
  })
  const { captureFromCamera, selectFromGallery, isCapturing } = useImageCapture()
  const { uploadProductImage, isUploading } = useImageUpload()
  const { user } = useAppStore()
  const [showSuccess, setShowSuccess] = useState(false)

  // Capturar ubicación al iniciar el flujo
  useEffect(() => {
    if (productData.lat === null || productData.lng === null) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setProductData((prev) => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }))
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      }
    }
  }, [])

  const categories = [
    { value: "verduras", label: "Verduras y Hortalizas", icon: "🥬" },
    { value: "frutas", label: "Frutas", icon: "🍎" },
    { value: "carnes", label: "Carnes y Embutidos", icon: "🥩" },
    { value: "lacteos", label: "Lácteos y Huevos", icon: "🥛" },
    { value: "granos", label: "Granos y Cereales", icon: "🌾" },
    { value: "tuberculos", label: "Tubérculos", icon: "🥔" },
    { value: "condimentos", label: "Condimentos y Especias", icon: "🌶️" },
    { value: "bebidas", label: "Bebidas", icon: "🥤" },
    { value: "panaderia", label: "Panadería", icon: "🍞" },
    { value: "otros", label: "Otros", icon: "📦" },
  ]

  const units = [
    { value: "kg", label: "Kilogramo (kg)" },
    { value: "libra", label: "Libra (lb)" },
    { value: "arroba", label: "Arroba (@)" },
    { value: "unidad", label: "Por unidad" },
    { value: "docena", label: "Docena" },
    { value: "litro", label: "Litro (L)" },
    { value: "bolsa", label: "Bolsa" },
    { value: "atado", label: "Atado" },
  ]

  const handleImageUpload = async (type: "camera" | "gallery") => {
    try {
      let result
      
      if (type === "camera") {
        result = await captureFromCamera({ maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
      } else {
        result = await selectFromGallery({ maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
      }

      if (result.error) {
        alert(`Error: ${result.error}`)
        return
      }

      if (result.file && result.dataUrl && user?.id) {
        // Show preview immediately
        setProductData((prev) => ({
          ...prev,
          image: result.dataUrl as string // We know this is a string because of the check above
        }))
        setStep(2)
        
        // Upload to backend in the background
        const uploadResult = await uploadProductImage(result.file, user.id)
        
        if (uploadResult.error) {
          console.error('Upload error:', uploadResult.error)
          // Keep the preview but log the error
        } else if (uploadResult.url) {
          // Update with final URL
          setProductData((prev) => ({
            ...prev,
            image: uploadResult.url as string
          }))
        }
      }
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Error al subir la imagen. Inténtalo de nuevo.')
    }
  }

  const handleAutoTag = () => {
    // Simulate AI auto-tagging based on category
    const suggestions = {
      verduras: { title: "Tomates frescos", unit: "kg" },
      frutas: { title: "Naranjas dulces", unit: "kg" },
      carnes: { title: "Carne de res", unit: "kg" },
      lacteos: { title: "Leche fresca", unit: "litro" },
      granos: { title: "Arroz blanco", unit: "kg" },
      tuberculos: { title: "Papas amarillas", unit: "arroba" },
      condimentos: { title: "Ají amarillo", unit: "kg" },
      bebidas: { title: "Jugo natural", unit: "litro" },
      panaderia: { title: "Pan de batalla", unit: "unidad" },
      otros: { title: "Producto local", unit: "unidad" },
    }

    const suggestion = suggestions[productData.category as keyof typeof suggestions]
    if (suggestion) {
      setProductData((prev) => ({
        ...prev,
        title: suggestion.title,
        unit: suggestion.unit,
      }))
    }
  }

  const handlePriceSuggestion = () => {
    // Simulate price suggestion based on category and unit
    const priceSuggestions = {
      verduras: { kg: "8.50", libra: "4.00", unidad: "1.50" },
      frutas: { kg: "12.00", libra: "5.50", unidad: "2.00" },
      carnes: { kg: "45.00", libra: "20.00" },
      lacteos: { litro: "6.50", unidad: "3.00" },
      granos: { kg: "7.00", arroba: "80.00" },
      tuberculos: { arroba: "120.00", kg: "5.50" },
      condimentos: { kg: "15.00", libra: "7.00" },
      bebidas: { litro: "8.00", unidad: "4.50" },
      panaderia: { unidad: "0.50", docena: "6.00" },
      otros: { unidad: "10.00", kg: "15.00" },
    }

    const categoryPrices = priceSuggestions[productData.category as keyof typeof priceSuggestions]
    if (categoryPrices) {
      const price = categoryPrices[productData.unit as keyof typeof categoryPrices] || "10.00"
      setProductData((prev) => ({ ...prev, price }))
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      alert("Debes iniciar sesión para publicar un producto");
      onNavigate("login");
      return;
    }

    if (!productData.lat || !productData.lng) {
      alert("No se pudo obtener tu ubicación. Por favor, asegúrate de que la aplicación tenga permisos de ubicación.");
      return;
    }

    try {
      const { data, error } = await createProduct({
        seller_id: user.id,
        title: productData.title,
        description: productData.description || "Sin descripción",
        category: productData.category,
        price: Number(productData.price),
        stock: Number(productData.stock),
        image_url: productData.image || "",
        latitude: productData.lat,
        longitude: productData.lng,
        address: productData.location || "Ubicación no especificada",
      });

      if (error) {
        console.error("Error al guardar el producto:", error);
        alert(`Error al publicar el producto: ${error.message}`);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        onNavigate("main");
      }, 2000);
    } catch (error) {
      console.error("Error inesperado:", error);
      alert("Ocurrió un error inesperado al publicar el producto");
    }
  };

  const getStockLabel = () => {
    switch (productData.unit) {
      case "kg":
      case "libra":
      case "arroba":
        return `Stock disponible (${productData.unit})`
      case "litro":
        return "Stock disponible (litros)"
      case "unidad":
        return "Cantidad de unidades"
      case "docena":
        return "Cantidad de docenas"
      case "bolsa":
        return "Cantidad de bolsas"
      case "atado":
        return "Cantidad de atados"
      default:
        return "Stock disponible"
    }
  }

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateStep2 = () => {
    const newErrors: {[key: string]: string} = {};
    if (!productData.category) newErrors.category = "Selecciona una categoría";
    if (!productData.title.trim()) newErrors.title = "El nombre es obligatorio";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep3 = () => {
    const newErrors: {[key: string]: string} = {};
    if (!productData.price || isNaN(Number(productData.price)) || Number(productData.price) <= 0) newErrors.price = "Precio válido requerido";
    if (!productData.stock || isNaN(Number(productData.stock)) || Number(productData.stock) <= 0) newErrors.stock = "Stock válido requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Añadido! ✔</h2>
        <p className="text-gray-600 text-center mb-4">Tu producto ya está en tu catálogo</p>
        <p className="text-sm text-gray-500 text-center">La app te propondrá ajustes de precio si son necesarios</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step > 1 ? setStep(step - 1) : onNavigate("main"))} // Cambiado a 'main'
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Añadir Producto</h1>
          <p className="text-sm text-gray-600">Paso {step} de 4</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="p-4">
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Foto del producto</h2>
              <p className="text-gray-600">Toma una foto o selecciona de tu galería</p>
            </div>

            <div className="space-y-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-32 flex-col gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-[#FF7300] hover:bg-orange-50"
                onClick={() => handleImageUpload("camera")}
                disabled={isCapturing || isUploading}
              >
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  {isCapturing ? "Accediendo a cámara..." : "Tomar foto"}
                </span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full h-32 flex-col gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-[#FF7300] hover:bg-orange-50"
                onClick={() => handleImageUpload("gallery")}
                disabled={isCapturing || isUploading}
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  {isCapturing ? "Seleccionando..." : isUploading ? "Subiendo imagen..." : "Seleccionar de galería"}
                </span>
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Información del producto</h2>
              <p className="text-gray-600">Selecciona la categoría y completa los datos</p>
            </div>

            <div className="flex justify-center mb-6">
              <img
                src={productData.image || "/placeholder.svg"}
                alt="Producto"
                className="w-32 h-32 object-cover rounded-lg"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={productData.category}
                  onValueChange={(value) => setProductData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Nombre del producto</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="title"
                    value={productData.title}
                    onChange={(e) => setProductData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Tomates frescos"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAutoTag}
                    className="shrink-0 bg-transparent"
                    disabled={!productData.category}
                  >
                    Auto
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => { if (validateStep2()) setStep(3); }}
                disabled={!productData.title || !productData.category}
                className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Precio y stock</h2>
              <p className="text-gray-600">Define el precio y cantidad disponible</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="unit">Unidad de medida</Label>
                <Select
                  value={productData.unit}
                  onValueChange={(value) => setProductData((prev) => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        <div className="flex items-center gap-2">
                          {unit.value === "kg" || unit.value === "libra" || unit.value === "arroba" ? (
                            <Scale className="w-4 h-4" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                          <span>{unit.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Precio por {productData.unit} (Bs)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={productData.price}
                    onChange={(e) => setProductData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00 Bs"
                  />
                  <Button variant="outline" onClick={handlePriceSuggestion} className="shrink-0 bg-transparent">
                    Sugerir
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="stock">{getStockLabel()}</Label>
                <Input
                  id="stock"
                  type="number"
                  step={
                    productData.unit === "kg" || productData.unit === "libra" || productData.unit === "arroba"
                      ? "0.1"
                      : "1"
                  }
                  value={productData.stock}
                  onChange={(e) => setProductData((prev) => ({ ...prev, stock: e.target.value }))}
                  placeholder={productData.unit === "unidad" ? "Ej: 50 unidades" : `Ej: 25 ${productData.unit}`}
                />
              </div>

              <Button
                onClick={() => setStep(4)}
                disabled={!productData.price || !productData.stock}
                className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmar producto</h2>
              <p className="text-gray-600">Revisa toda la información antes de añadir</p>
            </div>

            <Card className="p-4">
              <div className="flex gap-4">
                <img
                  src={productData.image || "/placeholder.svg"}
                  alt={productData.title}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{productData.title}</h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {categories.find((c) => c.value === productData.category)?.label}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-lg font-bold text-green-600">
                      Bs {productData.price}/{productData.unit}
                    </span>
                    <span className="text-sm text-gray-600">
                      Stock: {productData.stock} {productData.unit}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Ubicación capturada: {productData.lat && productData.lng ? `${productData.lat.toFixed(5)}, ${productData.lng.toFixed(5)}` : "No disponible"}
                  </div>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
            >
              Añadir Producto
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
