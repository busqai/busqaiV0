"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Copy, Trash2, Edit2, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { List } from "lucide-react" // Declared the List variable

interface ShoppingItem {
  id: string
  text: string
  completed: boolean
}

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItem, setNewItem] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const { toast } = useToast()

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem("shoppingList")
    if (savedItems) {
      setItems(JSON.parse(savedItems))
    }
  }, [])

  // Save items to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem("shoppingList", JSON.stringify(items))
  }, [items])

  const addItem = () => {
    if (newItem.trim()) {
      const item: ShoppingItem = {
        id: Date.now().toString(),
        text: newItem.trim(),
        completed: false,
      }
      setItems([...items, item])
      setNewItem("")
    }
  }

  const toggleItem = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)))
  }

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const startEditing = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const saveEdit = () => {
    if (editText.trim() && editingId) {
      setItems(items.map((item) => (item.id === editingId ? { ...item, text: editText.trim() } : item)))
      setEditingId(null)
      setEditText("")
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  const copyListToClipboard = () => {
    const pendingItems = items.filter((item) => !item.completed)
    if (pendingItems.length === 0) {
      toast({
        title: "Lista vacía",
        description: "No hay productos pendientes para copiar",
      })
      return
    }

    const listText = pendingItems.map((item) => `• ${item.text}`).join("\n")
    navigator.clipboard.writeText(listText).then(() => {
      toast({
        title: "¡Copiado!",
        description: "Lista copiada al portapapeles. Pégala en el chat de búsqueda.",
      })
    })
  }

  const completedCount = items.filter((item) => item.completed).length
  const totalCount = items.length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Mi Lista de Compras</h1>
          <Button
            onClick={copyListToClipboard}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent"
            disabled={items.filter((item) => !item.completed).length === 0}
          >
            <Copy className="w-4 h-4" />
            Copiar
          </Button>
        </div>
        {totalCount > 0 && (
          <p className="text-sm text-gray-600">
            {completedCount} de {totalCount} completados
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Add new item */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Añadir producto a la lista..."
              onKeyPress={(e) => e.key === "Enter" && addItem()}
              className="flex-1"
            />
            <Button
              onClick={addItem}
              disabled={!newItem.trim()}
              className="bg-gradient-to-r from-[#FF7300] to-[#FFE100] hover:from-[#E66600] hover:to-[#F0D000] text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Shopping list items */}
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={`p-3 ${item.completed ? "bg-gray-50" : "bg-white"}`}>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#FF7300] data-[state=checked]:to-[#FFE100]"
                />

                {editingId === item.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={`flex-1 ${item.completed ? "line-through text-gray-500" : "text-gray-900"}`}>
                      {item.text}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(item.id, item.text)}
                        className="p-1 h-auto"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteItem(item.id)}
                        className="p-1 h-auto text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12">
            <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Tu lista está vacía</p>
            <p className="text-sm text-gray-500">Añade productos que necesitas comprar</p>
          </div>
        )}

        {/* Help text */}
        {items.length > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-700 text-center">
              💡 <strong>Tip:</strong> Usa el botón "Copiar" para pegar tu lista en el chat de búsqueda y encontrar
              todos los productos de una vez.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
