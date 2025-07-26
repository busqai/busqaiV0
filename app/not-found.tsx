import type { Metadata, Viewport } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Página no encontrada - BusqAI",
  description: "La página que buscas no existe",
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF7300'
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Página no encontrada</h2>
        <p className="text-gray-600 mb-8">La página que buscas no existe o ha sido movida.</p>
        <Link 
          href="/"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF7300] to-[#FFE100] text-white font-semibold rounded-lg hover:from-[#E66600] hover:to-[#F0D000] transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
} 