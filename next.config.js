/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para Supabase
  serverExternalPackages: ['@supabase/ssr'],
  
  // Deshabilitar TypeScript errors durante build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuración experimental
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Configuración de Turbopack (Next.js 16+)
  // Configuración vacía para silenciar advertencias
  turbopack: {},
  
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

  // Configuración de webpack (solo si se usa --webpack flag)
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
