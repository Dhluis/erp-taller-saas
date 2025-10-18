/**
 * Middleware robusto para Supabase
 * Maneja autenticación, sesiones y permisos
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Crear cliente Supabase para middleware
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
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
 * Actualizar sesión de usuario
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, response } = createSupabaseMiddlewareClient(request)
    
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error)
      return redirectToLogin(request)
    }

    // Si no hay sesión, redirigir al login
    if (!session) {
      return redirectToLogin(request)
    }

    // Verificar si el usuario tiene perfil (con fallback por email)
    let { data: profile, error: profileError } = await supabase
      .from('system_users')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single()

    // Si falla con auth_user_id, intentar con email
    if (profileError && (profileError.code === '42703' || profileError.message?.includes('auth_user_id does not exist'))) {
      const { data: profileFallback, error: profileErrorFallback } = await supabase
        .from('system_users')
        .select('*')
        .eq('email', session.user.email)
        .single()
      
      profile = profileFallback
      profileError = profileErrorFallback
    }

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return redirectToLogin(request)
    }

    // Si el perfil no está activo, redirigir al login
    if (profile.status !== 'active') {
      console.error('User profile is inactive')
      return redirectToLogin(request)
    }

    return response
  } catch (error) {
    console.error('Error in updateSession:', error)
    return redirectToLogin(request)
  }
}

/**
 * Manejar callback de autenticación
 */
export async function handleAuthCallback(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, response } = createSupabaseMiddlewareClient(request)
    
    const code = request.nextUrl.searchParams.get('code')
    
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_callback_error', request.url))
      }
    }

    // Redirigir al dashboard después del callback exitoso
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  } catch (error) {
    console.error('Error in handleAuthCallback:', error)
    return NextResponse.redirect(new URL('/auth/login?error=auth_callback_error', request.url))
  }
}

/**
 * Manejar logout
 */
export async function handleLogout(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, response } = createSupabaseMiddlewareClient(request)
    
    await supabase.auth.signOut()
    
    return NextResponse.redirect(new URL('/auth/login', request.url))
  } catch (error) {
    console.error('Error in handleLogout:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

/**
 * Verificar permisos de usuario
 */
export async function checkUserPermissions(
  request: NextRequest,
  requiredRoles: string[] = []
): Promise<{ hasPermission: boolean; user?: any; profile?: any }> {
  try {
    const { supabase } = createSupabaseMiddlewareClient(request)
    
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return { hasPermission: false }
    }

    // Obtener perfil del usuario (con fallback por email)
    let { data: profile, error: profileError } = await supabase
      .from('system_users')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single()

    // Si falla con auth_user_id, intentar con email
    if (profileError && (profileError.code === '42703' || profileError.message?.includes('auth_user_id does not exist'))) {
      const { data: profileFallback, error: profileErrorFallback } = await supabase
        .from('system_users')
        .select('*')
        .eq('email', session.user.email)
        .single()
      
      profile = profileFallback
      profileError = profileErrorFallback
    }

    if (profileError || !profile || profile.status !== 'active') {
      return { hasPermission: false }
    }

    // Si no se requieren roles específicos, cualquier usuario autenticado tiene permiso
    if (requiredRoles.length === 0) {
      return { hasPermission: true, user: session.user, profile }
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasPermission = requiredRoles.includes(profile.role)
    
    return { hasPermission, user: session.user, profile }
  } catch (error) {
    console.error('Error checking user permissions:', error)
    return { hasPermission: false }
  }
}

/**
 * Redirigir al login
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/auth/login', request.url)
  const redirectTo = request.nextUrl.pathname + request.nextUrl.search
  
  if (redirectTo !== '/auth/login') {
    loginUrl.searchParams.set('redirectTo', redirectTo)
  }
  
  return NextResponse.redirect(loginUrl)
}

/**
 * Verificar si es una ruta de autenticación
 */
export function isAuthRoute(pathname: string): boolean {
  const authRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/reset-password-simple',
    '/auth/callback'
  ]
  
  return authRoutes.some(route => pathname.startsWith(route))
}

/**
 * Verificar si es una ruta protegida
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/inventario',
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
    '/configuracion'
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

/**
 * Verificar si es una ruta pública
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/test-fase1',
    '/test-fase2',
    '/test-fase3',
    '/test-fase4',
    '/test-fase5',
    '/test-simple',
    '/test-basic'
  ]
  
  return publicRoutes.some(route => pathname.startsWith(route))
}
