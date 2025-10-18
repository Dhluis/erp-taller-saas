/**
 * Middleware de Autenticación Robusto para Supabase
 * Maneja sesiones, autenticación y redirecciones de forma segura
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { config, validateConfig } from '@/lib/config'
import { handleError } from '@/lib/errors'

// Rutas que requieren autenticación
const PROTECTED_ROUTES = [
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

// Rutas que requieren roles específicos
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  '/usuarios': ['admin', 'manager'],
  '/configuracion': ['admin'],
  '/dashboard': ['admin', 'manager', 'employee']
}

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/test-fase1',
  '/test-fase2',
  '/test-fase3',
  '/test-fase4',
  '/test-fase5'
]

/**
 * Verificar si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Verificar si una ruta está protegida
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Obtener roles requeridos para una ruta
 */
function getRequiredRoles(pathname: string): string[] {
  for (const [route, roles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      return roles
    }
  }
  return []
}

/**
 * Crear cliente Supabase para middleware
 */
function createMiddlewareClient(request: NextRequest) {
  try {
    validateConfig()
    
    return createServerClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // En middleware, las cookies se manejan en el response
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'erp-taller-saas-middleware'
          }
        }
      }
    )
  } catch (error) {
    console.error('❌ Error creando cliente de middleware:', error)
    throw error
  }
}

/**
 * Middleware principal de autenticación
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  
  try {
    // Crear cliente Supabase
    const supabase = createMiddlewareClient(request)
    
    // Obtener usuario y sesión
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Si hay error de autenticación, limpiar sesión
    if (userError || sessionError) {
      console.warn('⚠️ Error de autenticación:', userError?.message || sessionError?.message)
      
      // Si es una ruta protegida, redirigir al login
      if (isProtectedRoute(pathname)) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      // Continuar con la request para rutas públicas
      return NextResponse.next()
    }
    
    // Si no hay usuario y es una ruta protegida, redirigir al login
    if (!user && isProtectedRoute(pathname)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Si hay usuario y está en login/register, redirigir al dashboard
    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Verificar roles si es necesario
    if (user && isProtectedRoute(pathname)) {
      const requiredRoles = getRequiredRoles(pathname)
      
      if (requiredRoles.length > 0) {
        // Obtener rol del usuario desde la base de datos
        const { data: userProfile, error: profileError } = await supabase
          .from('system_users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profileError || !userProfile) {
          console.warn('⚠️ No se pudo obtener el perfil del usuario:', profileError?.message)
          
          // Redirigir a página de acceso denegado
          return NextResponse.redirect(new URL('/access-denied', request.url))
        }
        
        // Verificar si el usuario tiene el rol requerido
        if (!requiredRoles.includes(userProfile.role)) {
          console.warn('⚠️ Usuario sin permisos para acceder a:', pathname)
          
          // Redirigir a página de acceso denegado
          return NextResponse.redirect(new URL('/access-denied', request.url))
        }
      }
    }
    
    // Crear response con cookies actualizadas
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    
    // Actualizar cookies de sesión si es necesario
    if (session) {
      const expiresAt = new Date(session.expires_at! * 1000)
      const now = new Date()
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()
      
      // Si la sesión expira en menos de 5 minutos, refrescar
      if (timeUntilExpiry < 5 * 60 * 1000) {
        try {
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabase.auth.refreshSession()
          
          if (!refreshError && refreshedSession) {
            // Actualizar cookies con la nueva sesión
            response.cookies.set('sb-access-token', refreshedSession.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7 // 7 días
            })
            
            response.cookies.set('sb-refresh-token', refreshedSession.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30 // 30 días
            })
          }
        } catch (refreshError) {
          console.warn('⚠️ Error refrescando sesión:', refreshError)
        }
      }
    }
    
    return response
    
  } catch (error) {
    const appError = handleError(error)
    console.error('❌ Error en middleware de autenticación:', appError.message)
    
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
 * Middleware para manejar callbacks de autenticación
 */
export async function handleAuthCallback(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  if (code) {
    try {
      const supabase = createMiddlewareClient(request)
      
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Error intercambiando código por sesión:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
      }
      
      if (session) {
        const response = NextResponse.redirect(`${origin}${next}`)
        
        // Establecer cookies de sesión
        response.cookies.set('sb-access-token', session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 días
        })
        
        response.cookies.set('sb-refresh-token', session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 días
        })
        
        return response
      }
    } catch (error) {
      console.error('❌ Error en callback de autenticación:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }
  }
  
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}

/**
 * Middleware para logout
 */
export async function handleLogout(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createMiddlewareClient(request)
    
    // Cerrar sesión en Supabase
    await supabase.auth.signOut()
    
    // Crear response de redirección
    const response = NextResponse.redirect(new URL('/login', request.url))
    
    // Limpiar cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    return response
    
  } catch (error) {
    console.error('❌ Error en logout:', error)
    
    // Redirigir al login incluso si hay error
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    return response
  }
}

/**
 * Verificar permisos de usuario
 */
export async function checkUserPermissions(
  request: NextRequest,
  requiredRole?: string
): Promise<{ hasPermission: boolean; user: any | null; error?: string }> {
  try {
    const supabase = createMiddlewareClient(request)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { hasPermission: false, user: null, error: 'User not authenticated' }
    }
    
    if (!requiredRole) {
      return { hasPermission: true, user }
    }
    
    // Obtener rol del usuario
    const { data: userProfile, error: profileError } = await supabase
      .from('system_users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      return { hasPermission: false, user, error: 'User profile not found' }
    }
    
    const hasPermission = userProfile.role === requiredRole || userProfile.role === 'admin'
    
    return { hasPermission, user }
    
  } catch (error) {
    const appError = handleError(error)
    return { hasPermission: false, user: null, error: appError.message }
  }
}
