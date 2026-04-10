import { NextResponse, type NextRequest } from 'next/server'
import { updateSession, createSupabaseMiddlewareClient } from '@/lib/supabase/middleware-robust'

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
  
  // 1. Permitir siempre rutas públicas y archivos estáticos de PWA
  const isPublic = PUBLIC_ROUTES.some(route => {
    if (route === '/') return pathname === '/'
    return pathname === route || pathname.startsWith(`${route}/`)
  }) || 
  pathname.endsWith('.js') || 
  pathname.endsWith('.json') || 
  pathname.endsWith('.webmanifest') ||
  pathname.startsWith('/icons/') ||
  pathname.startsWith('/images/')

  if (isPublic) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔓 [Middleware] Permitida ruta pública: ${pathname}`)
    }
    return NextResponse.next()
  }

  // 2. Determinar tipo de ruta
  const isProtectedRoute = MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // 3. Manejar rutas de autenticación (Login/Register)
  if (isAuthRoute) {
    const { supabase } = createSupabaseMiddlewareClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      console.log(`🏠 [Middleware] Usuario ya logueado, redirigiendo al dashboard desde: ${pathname}`)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 3. Manejar rutas protegidas (Dashboard, etc)
  if (isProtectedRoute) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [Middleware] Protegiendo ruta: ${pathname}`)
    }
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