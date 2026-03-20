import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-robust'

// Rutas que requieren middleware (autenticación obligatoria)
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
  '/cotizaciones',
  '/perfil',
  '/settings'
]

// Rutas de autenticación (redirigir al dashboard si ya hay sesión)
const AUTH_ROUTES = [
  '/login',
  '/auth/login',
  '/register',
  '/auth/register',
  '/forgot-password',
  '/reset-password'
]

// Rutas 100% públicas (nunca redirigir al login)
const PUBLIC_ROUTES = [
  '/',
  '/tracking',
  '/api/public',
  '/auth/callback',
  '/manifest.json',
  '/favicon.ico'
]

/**
 * Middleware principal
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Permitir siempre rutas públicas
  const isPublic = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`) || pathname.startsWith(route)
  )

  if (isPublic) {
    console.log(`🔓 [Middleware] Permitida ruta pública: ${pathname}`)
    return NextResponse.next()
  }

  // 2. Manejar rutas que requieren autenticación
  const isProtectedRoute = MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  if (isProtectedRoute || isAuthRoute) {
    console.log(`🔐 [Middleware] Protegiendo ruta: ${pathname}`)
    return updateSession(request)
  }

  // 3. Por defecto, permitir acceso (Catch-all)
  return NextResponse.next()
}

/**
 * Configuración de middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, etc in public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}