"use client"

export function SplashScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="flex items-center justify-center mb-8">
        <img src="/logo-busqai.png" alt="Busqai" className="h-48 w-auto animate-[scaleIn_1.5s_ease-out]" />
      </div>
      <p className="text-lg text-gray-600 text-center font-medium">Buscador de precios justos</p>

      <style jsx>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
