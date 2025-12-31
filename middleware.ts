/**
 * Middleware de Next.js para Autenticación, Rate Limiting y Rutas
 * Maneja autenticación, redirecciones, protección de rutas y rate limiting para APIs
 */

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession, handleAuthCallback, handleLogout, checkUserPermissions } from '@/lib/supabase/middleware-robust'

// Rutas que requieren middleware
const MIDDLEWARE_ROUTES = [
  '/dashboard',
  '/inventario',
  '/inventarios',
  '/compras',
  '/ingresos',
  '/clientes',
  '/vehiculos',
  '/ordenes',
  '/cobros',
  '/pagos',
  '/proveedores',
  '/citas',
  '/leads',
  '/campanas',
  '/facturas',
  '/notificaciones',
  '/usuarios',
  '/configuracion',
  '/cotizaciones'
]

// Rutas de autenticación
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
]

// Rutas públicas
const PUBLIC_ROUTES = [
  '/',
  '/test-fase1',
  '/test-fase2',
  '/test-fase3',
  '/test-fase4',
  '/test-fase5',
  '/auth/callback' // ✅ Callback debe ser manejado solo por el route handler
]

/**
 * Verificar si una ruta requiere middleware
 */
function requiresMiddleware(pathname: string): boolean {
  return MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route)) ||
         AUTH_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Verificar si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Middleware principal
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  
  try {
    // 🛡️ RATE LIMITING para rutas /api/*
    if (pathname.startsWith('/api/')) {
      // Excluir rutas ya protegidas o especiales
      const excludedPaths = [
        '/api/auth/',           // Ya protegido
        '/api/webhooks/',       // Ya protegido
        '/api/whatsapp/test-agent',  // Ya protegido
        '/api/whatsapp/config',      // Ya protegido
        '/api/test-',           // Endpoints de prueba
        '/api/health',          // Health check
        '/api/swagger.json',    // Documentación
      ];

      const isExcluded = excludedPaths.some(path => pathname.startsWith(path));
      
      if (!isExcluded) {
        try {
          // Importar dinámicamente rate limiting (necesario para edge runtime)
          const { applyRateLimit } = await import('@/lib/rate-limit/middleware');
          const { rateLimitConfigs } = await import('@/lib/rate-limit/rate-limiter');

          // Determinar configuración según método HTTP
          const method = request.method;
          const isReadOperation = method === 'GET' || method === 'HEAD';
          
          const config = isReadOperation 
            ? rateLimitConfigs.apiRead   // 60 req/min para lectura
            : rateLimitConfigs.apiWrite;  // 30 req/min para escritura

          // Aplicar rate limiting
          const result = await applyRateLimit(request, config);

          if (!result.success) {
            const { createRateLimitErrorResponse } = await import('@/lib/rate-limit/middleware');
            return createRateLimitErrorResponse(result);
          }
        } catch (rateLimitError) {
          // Si hay error en rate limiting, loguear pero permitir continuar (fail-open)
          console.error('❌ Error en rate limiting middleware:', rateLimitError);
          // Continuar con la request para no bloquear la aplicación
        }
      }
      
      // Continuar con la request (rate limiting pasado o excluido)
      return NextResponse.next();
    }

    // ✅ NO interceptar /auth/callback - dejar que el route handler lo maneje completamente
    if (pathname.startsWith('/auth/callback')) {
      return NextResponse.next()
    }

    // Solo procesar rutas que requieren middleware
    if (!requiresMiddleware(pathname) && !isPublicRoute(pathname)) {
      return NextResponse.next()
    }

    // Manejar logout
    if (pathname.startsWith('/logout')) {
      return handleLogout(request)
    }

    // Manejar rutas públicas
    if (isPublicRoute(pathname)) {
      return NextResponse.next()
    }

    // Manejar rutas de autenticación
    if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
      return updateSession(request)
    }

    // Manejar rutas protegidas
    if (MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route))) {
      return updateSession(request)
    }

    // Continuar con la request por defecto
    return NextResponse.next()

  } catch (error) {
    console.error('❌ Error en middleware:', error)
    
    // En caso de error, permitir acceso a rutas públicas
    if (isPublicRoute(pathname)) {
      return NextResponse.next()
    }
    
    // Para rutas protegidas, redirigir al login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

/**
 * Configuración de middleware
 * Ahora incluye rutas /api/* para rate limiting
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * 
     * NOTA: Ahora SÍ incluimos /api/* para aplicar rate limiting
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}







