import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Pencil, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

interface InventoryProps {
  onNavigate: (screen: string) => void
}

interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  image_url: string
  category: string
  is_visible: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export function Inventory({ onNavigate }: InventoryProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editData, setEditData] = useState<Partial<Product> | null>(null)
  // Fetch products from Supabase
  const fetchProducts = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Error al cargar los productos. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchProducts()
  }, [user])

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setEditData({ ...product })
  }

  const handleEditChange = (field: keyof Product, value: any) => {
    if (!editData) return
    setEditData({ ...editData, [field]: value })
  }

  const handleEditSave = async () => {
    if (!editData || !editData.id || !user) return
    
    try {
      const { error } = await supabase
        .from('products')
        .update({
          title: editData.title,
          price: editData.price,
          stock: editData.stock,
          is_available: editData.is_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', editData.id)
        .eq('seller_id', user.id)
      
      if (error) throw error
      
      // Refresh products after update
      await fetchProducts()
      setEditingProduct(null)
      setEditData(null)
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Error al actualizar el producto. Inténtalo de nuevo.')
    }
  }

  const handleEditCancel = () => {
    setEditingProduct(null)
    setEditData(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header - Consistente con otros módulos */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi Inventario</h1>
          <p className="text-sm text-gray-600">Gestiona tus productos</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Package className="w-4 h-4" />
          {products.length}
        </Badge>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => (
              <Card key={product.id} className="p-4 flex items-center">
                <div className="flex gap-3 flex-1">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-bold text-green-600">Bs {product.price.toFixed(2)}</span>
                      <span className="text-sm text-gray-600">Stock: {product.stock}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={product.is_available ? 'default' : 'secondary'} className="text-xs">
                        {product.is_available ? 'Disponible' : 'No disponible'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={() => handleEditClick(product)}
                  aria-label="Editar producto"
                >
                  <Pencil className="w-5 h-5 text-gray-500" />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
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
      <Button
        onClick={() => onNavigate("addProduct")}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white shadow-lg z-10"
      >
        <Plus className="w-6 h-6" />
      </Button>
      <Dialog open={!!editingProduct} onOpenChange={handleEditCancel}>
        <DialogContent>
          <DialogHeader>Editar producto</DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título del producto</Label>
                <Input
                  id="edit-title"
                  value={editData.title || ''}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  placeholder="Título del producto"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Input
                  id="edit-description"
                  value={editData.description || ''}
                  onChange={(e) => handleEditChange("description", e.target.value)}
                  placeholder="Descripción del producto"
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Precio</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editData.price}
                  onChange={(e) => handleEditChange("price", parseFloat(e.target.value))}
                  placeholder="Precio"
                />
              </div>
              <div>
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editData.stock}
                  onChange={(e) => handleEditChange("stock", parseInt(e.target.value))}
                  placeholder="Stock"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleEditCancel}>Cancelar</Button>
                <Button onClick={handleEditSave} className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white">Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 