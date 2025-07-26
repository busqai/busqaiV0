import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface User {
  id: string
  phone: string
  name: string
  type: "buyer" | "seller"
  balance?: number
  email?: string
  avatar?: string
  latitude?: number
  longitude?: number
  address?: string
}

export interface Product {
  id: string
  name: string
  title: string
  price: number
  distance: number
  rating: number
  image: string
  image_url: string
  seller: string | { full_name?: string }
  seller_id: string
  location: { lat: number; lng: number }
  latitude: number
  longitude: number
  description: string
  category: string
  stock: number
  is_available: boolean
  is_visible: boolean
  created_at: string
  updated_at: string
}

interface Message {
  type: "user" | "ai"
  content: string
  products?: Product[]
}

interface AppState {
  user: User | null
  selectedProduct: Product | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchMessages: Message[]
  setSearchMessages: (messages: Message[]) => void
  addSearchMessage: (message: Message) => void
  clearSearch: () => void
  setUser: (user: User) => void
  setSelectedProduct: (product: Product | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  user: null,
  selectedProduct: null,
      searchQuery: "",
      searchMessages: [],
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchMessages: (messages) => set({ searchMessages: messages }),
      addSearchMessage: (message) => set({ searchMessages: [...get().searchMessages, message] }),
      clearSearch: () => set({ searchQuery: "", searchMessages: [] }),
  setUser: (user) => set({ user }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
    }),
    {
      name: "busqai-app-store",
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        searchMessages: state.searchMessages,
        user: state.user,
      }),
    }
  )
)
