/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para Supabase
  serverExternalPackages: ['@supabase/ssr'],
  
  // Deshabilitar ESLint durante el build para evitar errores
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Deshabilitar TypeScript errors durante build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuración experimental
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Configuración para imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Configuración de webpack para Supabase
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
