import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('🔄 [Callback] Iniciando procesamiento...', { 
    hasCode: !!code, 
    hasTokenHash: !!token_hash, 
    type,
    next,
    fullUrl: request.url
  })

  // ✅ Verificar PRIMERO si es recovery
  const isRecovery = type === 'recovery'
  
  // Crear respuesta temporal (se modificará según el caso después de verificar)
  let response = NextResponse.next()

  // Cliente SSR para manejar la autenticación (con cookies)
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // ✅ Establecer cookie tanto en request como en response
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          // ✅ Eliminar cookie tanto de request como de response
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Cliente Admin para queries que bypasean RLS (solo para verificar perfil)
  // Si no hay service role key, usaremos el anon key (puede fallar con RLS estricto)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = serviceRoleKey 
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    : null
  
  if (!serviceRoleKey) {
    console.warn('⚠️ [Callback] SUPABASE_SERVICE_ROLE_KEY no disponible, usando anon key')
  }

  // Función helper para verificar si el usuario tiene organización (con retry)
  async function checkUserOrganization(userId: string, userEmail?: string): Promise<string | null> {
    console.log('🔍 [Callback] Verificando organización para usuario:', userId)
    
    // Usar el cliente admin si está disponible (bypassea RLS), sino usar el cliente auth
    const client = supabaseAdmin || supabaseAuth
    const clientType = supabaseAdmin ? 'admin' : 'auth'
    
    console.log(`📋 [Callback] Usando cliente ${clientType} para verificar perfil`)
    
    // ✅ Retry hasta 3 veces con delay de 500ms entre intentos
    // Esto permite que el perfil se sincronice si hay un delay en la creación
    const maxRetries = 3
    const retryDelay = 500
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Intentar buscar por auth_user_id primero
        let { data: profile, error } = await client
          .from('users')
          .select('organization_id')
          .eq('auth_user_id', userId)
          .single()

        if (error && error.code === 'PGRST116') {
          // No encontrado por auth_user_id, intentar por email
          if (userEmail) {
            console.log(`🔍 [Callback] Intento ${attempt}/${maxRetries} - Buscando por email:`, userEmail)
            const { data: profileByEmail, error: emailError } = await client
              .from('users')
              .select('organization_id')
              .eq('email', userEmail)
              .single()
            
            if (!emailError && profileByEmail) {
              profile = profileByEmail
              error = null
            }
          }
        }

        // Si encontramos el perfil y tiene organización, retornar
        if (!error && profile?.organization_id) {
          console.log(`✅ [Callback] Perfil encontrado en intento ${attempt}:`, { 
            organization_id: profile.organization_id 
          })
          return profile.organization_id
        }

        // Si no encontramos el perfil pero aún hay intentos, esperar y reintentar
        if (error && attempt < maxRetries) {
          console.log(`⏳ [Callback] Perfil no encontrado en intento ${attempt}, reintentando en ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }

        // Si llegamos aquí, no se encontró el perfil después de todos los intentos
        if (error) {
          console.warn(`⚠️ [Callback] Perfil no encontrado después de ${maxRetries} intentos:`, error.message, error.code)
          return null
        }

        // Si el perfil existe pero no tiene organización
        if (profile && !profile.organization_id) {
          console.warn('⚠️ [Callback] Perfil encontrado pero sin organización')
          return null
        }

      } catch (err: any) {
        console.error(`❌ [Callback] Excepción en intento ${attempt}:`, err.message)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }
        return null
      }
    }

    return null
  }

  // Función helper para crear respuesta de redirección con cookies
  function createRedirectResponse(url: string, sourceResponse?: NextResponse): NextResponse {
    const redirectResponse = NextResponse.redirect(new URL(url, origin))
    
    // Copiar las cookies de sesión a la nueva respuesta
    if (sourceResponse) {
      sourceResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
    }
    
    return redirectResponse
  }

  // Manejar código de autorización (OAuth)
  if (code) {
    console.log('🔄 [Callback] Procesando código OAuth...')
    const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      console.log('✅ [Callback] OAuth exitoso, sesión establecida:', {
        userId: data.session.user.id,
        email: data.session.user.email
      })
      
      // Verificar si el usuario tiene organización
      const organizationId = await checkUserOrganization(
        data.session.user.id, 
        data.session.user.email
      )
      
      // Si el usuario OAuth no tiene organización, debe crear su cuenta primero
      // Cerrar sesión y redirigir al login con mensaje claro
      if (!organizationId) {
        console.warn('⚠️ [Callback] Usuario OAuth sin organización - debe crear cuenta primero')
        
        // Cerrar sesión para que use el flujo normal de registro
        await supabaseAuth.auth.signOut()
        
        // Redirigir al login con mensaje claro
        const loginUrl = new URL('/auth/login', origin)
        loginUrl.searchParams.set('message', 'Debes crear tu cuenta primero para usar Google. Por favor, regístrate gratis.')
        loginUrl.searchParams.set('email', data.session.user.email || '')
        loginUrl.searchParams.set('action', 'register')
        return NextResponse.redirect(loginUrl)
      }
      
      console.log('✅ [Callback] Usuario con organización, redirigiendo a:', next)
      return createRedirectResponse(next, response)
    } else if (error) {
      console.error('❌ [Callback] Error en OAuth:', error)
    }
  }

  // Manejar token_hash (email confirmation, magic link, recovery, etc.)
  if (token_hash && type) {
    console.log('🔄 [Callback] Procesando token de confirmación...', { 
      type, 
      token_hash: token_hash.substring(0, 10) + '...' 
    })
    
    try {
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        token_hash,
        type: type as any
      })

      if (!error && data?.session) {
        console.log('✅ [Callback] Token verificado exitosamente:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          sessionExists: !!data.session,
          type
        })
        
        // ✅ Si es tipo 'recovery', redirigir a reset-password (NO al dashboard)
        if (type === 'recovery' || isRecovery) {
          console.log('🔄 [Callback] Tipo recovery detectado después de verificar token, redirigiendo a reset-password')
          const resetPasswordUrl = new URL('/auth/reset-password', origin)
          
          // Crear respuesta de redirección
          const resetResponse = NextResponse.redirect(resetPasswordUrl)
          
          // Copiar todas las cookies de sesión establecidas por verifyOtp
          // Las cookies ya están en response.cookies, copiarlas a resetResponse
          response.cookies.getAll().forEach(cookie => {
            resetResponse.cookies.set(cookie.name, cookie.value, {
              path: cookie.path,
              domain: cookie.domain,
              maxAge: cookie.maxAge,
              httpOnly: cookie.httpOnly,
              secure: cookie.secure,
              sameSite: cookie.sameSite as any
            })
          })
          
          console.log('✅ [Callback] Redirigiendo a reset-password con cookies de sesión')
          return resetResponse
        }
        
        // Para otros tipos (email confirmation, etc.)
        // Verificar si el usuario tiene organización
        const organizationId = await checkUserOrganization(
          data.session.user.id,
          data.session.user.email
        )
        
        // Si no tiene organización, debe completar el registro primero
        if (!organizationId) {
          console.warn('⚠️ [Callback] Usuario sin organización - debe completar registro')
          // Redirigir a registro para completar la información necesaria
          const registerUrl = new URL('/auth/register', origin)
          registerUrl.searchParams.set('email', data.session.user.email || '')
          registerUrl.searchParams.set('message', 'Por favor completa tu registro para continuar')
          return NextResponse.redirect(registerUrl)
        }
        
        // ✅ Email confirmado exitosamente, redirigir al destino
        console.log('✅ [Callback] Usuario con organización, redirigiendo a:', next)
        return response
        
      } else if (error) {
        console.error('❌ [Callback] Error verificando token:', {
          message: error.message,
          status: error.status,
          name: error.name
        })
        // Redirigir al login con mensaje de error
        const loginUrl = new URL('/auth/login', origin)
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
      const loginUrl = new URL('/auth/login', origin)
      loginUrl.searchParams.set('error', 'token_error')
      loginUrl.searchParams.set('message', 'Error al procesar el enlace de confirmación.')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Si hay error o no hay código/token, redirigir al login
  console.log('⚠️ [Callback] No hay código ni token, redirigiendo al login')
  const loginUrl = new URL('/auth/login', origin)
  if (code || token_hash) {
    loginUrl.searchParams.set('error', 'auth_failed')
    loginUrl.searchParams.set('message', 'No se pudo completar la autenticación.')
  }
  return NextResponse.redirect(loginUrl)
}
