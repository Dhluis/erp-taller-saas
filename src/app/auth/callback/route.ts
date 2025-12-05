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
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Manejar token_hash (email confirmation, magic link, etc.)
  if (token_hash && type) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any
      })

      if (!error && data) {
        // ✅ Email confirmado exitosamente, redirigir al dashboard
        return NextResponse.redirect(new URL(next, request.url))
      } else if (error) {
        console.error('❌ Error verificando token:', error)
        // Redirigir al login con mensaje de error
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('error', 'invalid_token')
        loginUrl.searchParams.set('message', 'El enlace de confirmación es inválido o ha expirado.')
        return NextResponse.redirect(loginUrl)
      }
    } catch (err: any) {
      console.error('❌ Excepción verificando token:', err)
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












