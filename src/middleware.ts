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
 * Middleware principal simplificado para estabilidad máxima
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Rutas públicas y archivos estáticos (Bypass total)
  if (
    PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`)) ||
    pathname.includes('.') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }

  // 2. Rutas de Auth (si ya tiene sesión, ir al dashboard)
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    const { supabase } = createSupabaseMiddlewareClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 3. Rutas protegidas (Dashboard, etc)
  if (MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route))) {
    return updateSession(request)
  }

  // 4. Por defecto, permitir acceso (Catch-all)
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