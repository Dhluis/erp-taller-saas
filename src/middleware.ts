import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Rutas públicas que NO requieren autenticación
    const publicRoutes = [
      '/',
      '/auth/login',
      '/auth/register',
      '/auth/signup',
      '/auth/callback',
      '/auth/forgot-password',
      '/auth/reset-password',
    ]

    // Si es ruta pública, permitir acceso
    if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Para todas las demás rutas, permitir acceso
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // En caso de error, permitir acceso para evitar bloqueos
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}