import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Callback de Autenticación Simplificado
 * 
 * SOLO hace dos cosas:
 * 1. Verificar el token/código de autenticación
 * 2. Establecer la sesión en las cookies
 * 
 * La lógica de redirección (onboarding vs dashboard) la maneja el FRONTEND
 * en SessionContext y DashboardLayout, que ya tienen esa lógica.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  
  // VERSION: 2024-12-08-v4 - Log completo para debug
  console.log('═══════════════════════════════════════════════════')
  console.log('🔄 [Callback v4] INICIO - Procesando autenticación')
  console.log('═══════════════════════════════════════════════════')
  console.log('📋 URL completa:', url.toString())
  console.log('📋 Parámetros:', { 
    code: code ? code.substring(0, 10) + '...' : null,
    token_hash: token_hash ? token_hash.substring(0, 10) + '...' : null,
    type,
    origin
  })
  console.log('📋 Todos los searchParams:', Object.fromEntries(searchParams.entries()))
  
  // SIEMPRE redirigir a /dashboard - el frontend decidirá si va a onboarding
  const redirectUrl = new URL('/dashboard', origin)
  const response = NextResponse.redirect(redirectUrl)

  // Cliente Supabase con cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Guardar en request Y response
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    // Manejar código OAuth (Google, GitHub, etc.)
    if (code) {
      console.log('🔄 [Callback] Procesando código OAuth...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ [Callback v4] Error OAuth:', error.message)
        console.log('═══════════════════════════════════════════════════')
        return redirectToLogin(origin, 'Error de autenticación OAuth')
      }
      
      if (data?.session) {
        console.log('✅ [Callback v4] OAuth exitoso:', data.session.user.email)
        console.log('✅ [Callback v4] Cookies establecidas, redirigiendo a /dashboard')
        console.log('═══════════════════════════════════════════════════')
        return response
      }
    }

    // Manejar token de confirmación de email
    if (token_hash && type) {
      console.log('🔄 [Callback] Verificando token de email...')
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any
      })

      if (error) {
        console.error('❌ [Callback v4] Error verificando token:', error.message)
        console.log('═══════════════════════════════════════════════════')
        return redirectToLogin(origin, 'El enlace de confirmación es inválido o ha expirado')
      }

      if (data?.session) {
        console.log('✅ [Callback v4] Email confirmado:', data.session.user.email)
        console.log('✅ [Callback v4] Cookies establecidas, redirigiendo a /dashboard')
        console.log('═══════════════════════════════════════════════════')
        return response
      } else {
        console.warn('⚠️ [Callback v4] Token verificado pero NO hay sesión')
      }
    }

    // Si no hay código ni token, redirigir al login
    console.warn('⚠️ [Callback v4] No hay código ni token válido')
    console.log('═══════════════════════════════════════════════════')
    return redirectToLogin(origin, 'Enlace de autenticación inválido')

  } catch (err: any) {
    console.error('❌ [Callback v4] Error inesperado:', err.message)
    console.log('═══════════════════════════════════════════════════')
    return redirectToLogin(origin, 'Error procesando autenticación')
  }
}

function redirectToLogin(origin: string, message: string): NextResponse {
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'auth_failed')
  loginUrl.searchParams.set('message', message)
  return NextResponse.redirect(loginUrl)
}
