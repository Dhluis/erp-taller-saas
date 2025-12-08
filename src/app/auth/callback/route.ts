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
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  
  // SIEMPRE redirigir a /dashboard - el frontend decidirá si va a onboarding
  const redirectUrl = new URL('/dashboard', origin)
  const response = NextResponse.redirect(redirectUrl)

  // VERSION: 2024-12-08-v3 - Si no ves esto en logs, el deployment no se actualizó
  console.log('🔄 [Callback v3] Procesando autenticación...', { 
    hasCode: !!code, 
    hasTokenHash: !!token_hash, 
    type,
    version: '2024-12-08-v3'
  })

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
        console.error('❌ [Callback] Error OAuth:', error.message)
        return redirectToLogin(origin, 'Error de autenticación OAuth')
      }
      
      if (data?.session) {
        console.log('✅ [Callback] OAuth exitoso:', data.session.user.email)
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
        console.error('❌ [Callback] Error verificando token:', error.message)
        return redirectToLogin(origin, 'El enlace de confirmación es inválido o ha expirado')
      }

      if (data?.session) {
        console.log('✅ [Callback] Email confirmado:', data.session.user.email)
        return response
      }
    }

    // Si no hay código ni token, redirigir al login
    console.warn('⚠️ [Callback] No hay código ni token válido')
    return redirectToLogin(origin, 'Enlace de autenticación inválido')

  } catch (err: any) {
    console.error('❌ [Callback] Error inesperado:', err.message)
    return redirectToLogin(origin, 'Error procesando autenticación')
  }
}

function redirectToLogin(origin: string, message: string): NextResponse {
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'auth_failed')
  loginUrl.searchParams.set('message', message)
  return NextResponse.redirect(loginUrl)
}
