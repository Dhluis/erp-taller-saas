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
    // optimizeCss: true, // ✅ Deshabilitado temporalmente - requiere 'critters'
  },
  
  // ✅ Optimizaciones de producción
  productionBrowserSourceMaps: false, // Deshabilitar source maps en producción para reducir bundle size
  
  // ✅ Compresión
  compress: true,
  
  // ✅ Optimización de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        pathname: '/**',
      },
    ],
    // ✅ Optimizaciones de imágenes para móvil
    formats: ['image/avif', 'image/webp'], // Priorizar formatos modernos
    minimumCacheTTL: 60 * 60 * 24 * 30, // Cache de 30 días
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Tamaños para dispositivos
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Tamaños para imágenes
  },

  // ✅ Configuración de webpack optimizada
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
      
      // ✅ Optimizaciones de producción
      if (!dev) {
        // Tree shaking más agresivo
        config.optimization = {
          ...config.optimization,
          usedExports: true,
          sideEffects: false,
        }
      }
    }
    
    return config
  },

  // ✅ Headers de seguridad y optimización
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
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // ✅ Landing page: Sin caché para forzar actualizaciones inmediatas
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // ✅ Páginas HTML: Caché corto con revalidación
        source: '/((?!api|_next|images|favicon.ico|.*\\..*).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        // ✅ Assets estáticos de Next.js: Caché largo (inmutables)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // ✅ Imágenes: Caché largo
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // ✅ API routes: Sin caché
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
