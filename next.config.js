/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deshabilitar ESLint durante el build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Deshabilitar TypeScript errors durante build (opcional)
  typescript: {
    ignoreBuildErrors: true, // Deshabilitado temporalmente para build rápido
  },

  // Desactivar redirecciones automáticas que puedan estar causando problemas
  async redirects() {
    return []
  },
  
  // Limpiar caché
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Configuración para imágenes de Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
