import { create } from "zustand"

interface User {
  phone: string
  name: string
  type: "buyer" | "seller"
  balance?: number
}

interface Product {
  id: string
  name: string
  price: number
  distance: number
  rating: number
  image: string
  seller: string
  location: { lat: number; lng: number }
}

interface AppState {
  user: User | null
  selectedProduct: Product | null
  setUser: (user: User) => void
  setSelectedProduct: (product: Product | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  selectedProduct: null,
  setUser: (user) => set({ user }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
}))
