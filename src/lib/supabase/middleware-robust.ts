/**
 * Middleware robusto para Supabase
 * Maneja autenticación, sesiones y permisos
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRedisValue, setRedisValue, incrementCounter, REDIS_KEYS } from '@/lib/rate-limit/redis'
import { invalidateUserProfileCache } from '@/lib/database/queries/users'
// cookies de 'next/headers' no está disponible en middleware, usar request.cookies directamente

/**
 * Crear cliente Supabase para middleware
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  // 🚨 FIX PARA BUILD: Si estamos en fase de compilación, devolver un Proxy seguro
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    const createProxy = (): any => {
      const fn = () => Promise.resolve({ data: null, error: null, session: null, user: null });
      return new Proxy(fn, {
        get: (target, prop) => {
          if (prop === 'then') return undefined;
          return createProxy();
        }
      });
    };
    return { supabase: createProxy(), response: NextResponse.next() };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return { 
      supabase: createServerClient('https://placeholder.supabase.co', 'placeholder', { 
        cookies: {
          get(name: string) { return undefined },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        } 
      }), 
      response 
    }
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
 * Obtener perfil de usuario (con caché en Redis)
 */
async function getCachedUserProfile(supabase: any, user: { id: string, email?: string }) {
  const cacheKey = `${REDIS_KEYS.SESSION_PROFILE}:${user.id}`
  let profile: any = null

  // 1. Intentar obtener de Redis
  try {
    profile = await getRedisValue(cacheKey)
    if (profile) {
      await incrementCounter(REDIS_KEYS.METRICS.CACHE_HITS, 86400 * 30).catch(() => {})
      return { profile, fromCache: true }
    }
    await incrementCounter(REDIS_KEYS.METRICS.CACHE_MISSES, 86400 * 30).catch(() => {})
  } catch (cacheError) {
    console.warn('[Middleware Cache] ⚠️ Error leyendo caché:', cacheError)
  }

  // 2. Si no hay en caché, consultar DB (users)
  // FIX: Usar tabla 'users' y columna 'auth_user_id' que es la principal del ERP
  let { data: dbProfile, error: profileError } = await (supabase as any)
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  // Fallback por email si el id no mapea directo
  if (profileError && user.email) {
    const { data: profileFallback, error: profileErrorFallback } = await (supabase as any)
      .from('system_users')
      .select('*')
      .eq('email', user.email)
      .single()
    
    if (profileFallback) {
      dbProfile = profileFallback
      profileError = null
    }
  }

  if (profileError || !dbProfile) {
    return { profile: null, error: profileError }
  }

  // 3. Guardar en Redis (TTL 5 min)
  try {
    await setRedisValue(cacheKey, dbProfile, 300)
  } catch (saveError) {
    console.warn('[Middleware Cache] ⚠️ Error guardando en caché:', saveError)
  }

  return { profile: dbProfile, fromCache: false }
}

/**
 * Actualizar sesión de usuario
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, response } = createSupabaseMiddlewareClient(request)
    
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      if (error) console.error('Error getting session:', error)
      
      // 🚨 SALVAGUARDA: No redirigir si ya estamos en una ruta de auth
      if (isAuthRoute(request.nextUrl.pathname)) {
        return response
      }
      
      return redirectToLogin(request)
    }

    const { profile, error: profileError } = await getCachedUserProfile(supabase, session.user)

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return redirectToLogin(request)
    }

    // Verificar si el perfil está activo (soporta status e is_active)
    const isActive = profile.status === 'active' || profile.is_active === true || profile.is_active === 'true'
    
    if (!isActive) {
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
    
    // Invalidad caché antes de salir
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await invalidateUserProfileCache(user.id)
    }

    await supabase.auth.signOut()
    
    return NextResponse.redirect(new URL('/auth/login', request.url))
  } catch (error) {
    console.error('Error in handleLogout:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

/**
 * Verificar permisos de usuario (usando caché)
 */
export async function checkUserPermissions(
  request: NextRequest,
  requiredRoles: string[] = []
): Promise<{ hasPermission: boolean; user?: any; profile?: any }> {
  try {
    const { supabase } = createSupabaseMiddlewareClient(request)
    
    let { data: { session }, error } = await supabase.auth.getSession()

    // ✅ FIX ROBUSTO PARA API ROUTES: 
    // Si no hay sesión, intentar recrear el cliente parseando cookies manualmente de los headers
    if (!session || error) {
      const cookieHeader = request.headers.get('cookie') || ''
      if (cookieHeader) {
        const { createServerClient } = await import('@supabase/ssr')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        
        const cookieMap = new Map<string, string>()
        cookieHeader.split(';').forEach(c => {
          const [name, ...valueParts] = c.trim().split('=')
          if (name && valueParts.length > 0) cookieMap.set(name.trim(), valueParts.join('=').trim())
        })

        const fallbackClient = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            get(name) { return cookieMap.get(name) },
            set() {}, remove() {}
          }
        })
        const { data: { session: fallbackSession } } = await fallbackClient.auth.getSession()
        if (fallbackSession) session = fallbackSession
      }
    }

    if (!session) {
      return { hasPermission: false }
    }

    const { profile, error: profileError } = await getCachedUserProfile(supabase, session.user)

    if (profileError || !profile) {
      return { hasPermission: false }
    }

    // Si no se requieren roles específicos, cualquier usuario activo tiene permiso
    if (requiredRoles.length === 0) {
      return { hasPermission: true, user: session.user, profile }
    }

    // Normalizar roles para comparación case-insensitive
    const normalizedRequired = requiredRoles.map(r => r.toUpperCase())
    const userRole = (profile.role || '').toUpperCase()
    
    // Soporte para variaciones de nombres de roles (ej. ADMIN vs ADMINISTRADOR)
    const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR'
    const hasPermission = normalizedRequired.includes(userRole) || (normalizedRequired.includes('ADMIN') && isAdmin)
    
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
    '/configuraciones/usuarios',
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
