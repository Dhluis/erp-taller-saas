/**
 * Middleware de Autenticación
 * Middleware para Next.js que integra user_profiles con autenticación
 * Compatible con multi-tenancy y RLS
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getUserProfileById } from '../supabase/user-profiles'

/**
 * Rutas que requieren autenticación
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/clientes',
  '/vehiculos',
  '/ordenes',
  '/inventario',
  '/cotizaciones',
  '/facturas',
  '/configuraciones',
  '/reportes'
]

/**
 * Rutas de autenticación (redirigir si ya está autenticado)
 */
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password'
]

/**
 * Rutas públicas (no requieren autenticación)
 */
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/onboarding',
  '/auth/suspended',
  '/demo-setup',
  '/api/auth',
  '/_next',
  '/favicon.ico'
]

/**
 * Crear cliente Supabase para middleware
 */
function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  return { supabase, response }
}

/**
 * Verificar si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  ) || pathname.startsWith('/auth/') // Permitir todas las rutas de auth
}

/**
 * Verificar si una ruta es de autenticación
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

/**
 * Verificar si una ruta está protegida
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  )
}

/**
 * Middleware principal
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { pathname } = request.nextUrl

  try {
    // Verificar si es una ruta pública
    if (isPublicRoute(pathname)) {
      return response
    }

    // Obtener sesión actual
    const { data: { session }, error } = await supabase.auth.getSession()

    // Si no hay sesión y es una ruta protegida, redirigir al login
    if (!session && isProtectedRoute(pathname)) {
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Si hay sesión y es una ruta de auth, redirigir al dashboard
    // EXCEPTO reset-password (permite cambiar contraseña con sesión activa)
    if (session && isAuthRoute(pathname) && pathname !== '/auth/reset-password') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Si hay sesión, verificar el perfil del usuario
    if (session?.user) {
      try {
        // Obtener perfil directamente (en middleware no tenemos organizationId aún)
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }
        
        // Si no tiene perfil y no está en una ruta de onboarding o auth, redirigir al onboarding
        // ✅ Usar /onboarding que es la página funcional (no /auth/setup que usa tabla inexistente)
        if (!profile && !pathname.startsWith('/onboarding') && !pathname.startsWith('/auth/')) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        // Si el usuario está inactivo, redirigir a página de cuenta suspendida
        if (profile && !profile.is_active && !pathname.startsWith('/auth/suspended')) {
          return NextResponse.redirect(new URL('/auth/suspended', request.url))
        }

        // Agregar información del usuario a los headers para uso en componentes
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', session.user.id)
        requestHeaders.set('x-user-email', session.user.email || '')
        requestHeaders.set('x-user-role', profile?.role || 'user')
        requestHeaders.set('x-organization-id', profile?.organization_id || '')

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (profileError) {
        console.error('Error al verificar perfil de usuario:', profileError)
        
        // En caso de error, redirigir al login
        const redirectUrl = new URL('/auth/login', request.url)
        redirectUrl.searchParams.set('error', 'profile_error')
        return NextResponse.redirect(redirectUrl)
      }
    }

    return response
  } catch (error) {
    console.error('Error en middleware de autenticación:', error)
    
    // En caso de error, permitir el acceso pero logear el error
    return response
  }
}

/**
 * Configuración del middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

/**
 * Helper para obtener información del usuario desde los headers
 */
export function getUserFromHeaders(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')
  const userRole = request.headers.get('x-user-role')
  const organizationId = request.headers.get('x-organization-id')

  return {
    id: userId,
    email: userEmail,
    role: userRole,
    organizationId: organizationId,
    isAuthenticated: !!userId
  }
}

/**
 * Helper para verificar permisos en middleware
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Helper para verificar si es administrador
 */
export function isAdmin(userRole: string): boolean {
  return ['admin', 'manager'].includes(userRole)
}