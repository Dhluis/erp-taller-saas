/**
 * Middleware de Next.js
 * Integra autenticación con user_profiles y multi-tenancy
 */

import { NextResponse, type NextRequest } from 'next/server'

const MIDDLEWARE_ROUTES = [
  '/dashboard', '/inventario', '/compras', '/ingresos', '/clientes', '/vehiculos',
  '/ordenes', '/cobros', '/pagos', '/proveedores', '/citas', '/leads', '/campanas',
  '/facturas', '/notificaciones', '/usuarios', '/configuracion'
]
const AUTH_ROUTES = [
  '/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'
]
const PUBLIC_ROUTES = [
  '/', '/test-fase1', '/test-fase2', '/test-fase3', '/test-fase4', '/test-fase5'
]

function requiresMiddleware(pathname: string): boolean {
  return MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route)) ||
         AUTH_ROUTES.some(route => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  
  try {
    // Redirigir /dashboard/overview a /dashboard
    if (pathname === '/dashboard/overview') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Simplified middleware to always allow access for now
    return NextResponse.next()
  } catch (error) {
    console.error('❌ Error en middleware:', error)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}