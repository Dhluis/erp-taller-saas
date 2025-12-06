import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Manejar código de autorización (OAuth)
  if (code) {
    console.log('🔄 [Callback] Procesando código OAuth...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      console.log('✅ [Callback] OAuth exitoso, sesión establecida:', {
        userId: data.session.user.id,
        email: data.session.user.email
      })
      return NextResponse.redirect(new URL(next, request.url))
    } else if (error) {
      console.error('❌ [Callback] Error en OAuth:', error)
    }
  }

  // Manejar token_hash (email confirmation, magic link, etc.)
  if (token_hash && type) {
    console.log('🔄 [Callback] Procesando token de confirmación...', { type })
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any
      })

      if (!error && data?.session) {
        console.log('✅ [Callback] Email confirmado exitosamente:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          sessionExists: !!data.session
        })
        // ✅ Email confirmado exitosamente, redirigir al dashboard
        return NextResponse.redirect(new URL(next, request.url))
      } else if (error) {
        console.error('❌ [Callback] Error verificando token:', {
          message: error.message,
          status: error.status,
          name: error.name
        })
        // Redirigir al login con mensaje de error
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('error', 'invalid_token')
        loginUrl.searchParams.set('message', 'El enlace de confirmación es inválido o ha expirado.')
        return NextResponse.redirect(loginUrl)
      } else {
        console.error('❌ [Callback] Verificación exitosa pero sin sesión')
      }
    } catch (err: any) {
      console.error('❌ [Callback] Excepción verificando token:', {
        message: err.message,
        stack: err.stack
      })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'token_error')
      loginUrl.searchParams.set('message', 'Error al procesar el enlace de confirmación.')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Si hay error o no hay código/token, redirigir al login
  const loginUrl = new URL('/auth/login', request.url)
  if (code || token_hash) {
    loginUrl.searchParams.set('error', 'auth_failed')
    loginUrl.searchParams.set('message', 'No se pudo completar la autenticación.')
  }
  return NextResponse.redirect(loginUrl)
}












