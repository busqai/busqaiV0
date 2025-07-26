/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuraciones para estabilidad
  experimental: {
    // Reducir problemas de cache
    optimizePackageImports: ['lucide-react'],
  },
  // Configuraciones de webpack para estabilidad
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Mejorar la estabilidad en desarrollo
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  // Configuraciones de compilación
  compiler: {
    // Reducir el tamaño del bundle
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configuraciones de imágenes
  images: {
    domains: ['localhost'],
  },
}

export default nextConfig
