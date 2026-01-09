/**
 * Funciones de Autenticación para Client Components
 * Versión simplificada para uso en el navegador
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Crear cliente Supabase para el navegador
 */
function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Iniciar sesión con email y contraseña
 */
export async function signInWithProfile(email: string, password: string) {
  try {
    const supabase = getBrowserClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }

    if (!data.user) {
      throw new Error('No se pudo autenticar el usuario')
    }

    return {
      user: data.user,
      session: data.session,
      error: null
    }
  } catch (error: any) {
    console.error('Error en signInWithProfile:', error)
    return {
      user: null,
      session: null,
      error: error
    }
  }
}

/**
 * Registrar nuevo usuario
 */
export async function signUpWithProfile(userData: {
  email: string
  password: string
  fullName?: string
  organizationId?: string
}) {
  try {
    const supabase = getBrowserClient()
    
    // Obtener URL base de la aplicación
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (await import('@/lib/config/env')).getAppUrl()
    
    console.log('🔄 [signUpWithProfile] Iniciando registro para:', userData.email)
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
        data: {
          full_name: userData.fullName,
          organization_id: userData.organizationId
        }
      }
    })

    console.log('🔍 [signUpWithProfile] Respuesta de signUp:', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      hasError: !!error,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      errorMessage: error?.message,
      errorStatus: error?.status
    })

    // ✅ CRÍTICO: Si el usuario se creó (data.user existe), es ÉXITO
    // Incluso si hay un error menor, si el usuario existe en auth, el registro fue exitoso
    // Esto es importante porque Supabase puede devolver error si requiere confirmación de email
    // pero aún así crea el usuario
    if (data?.user) {
      console.log('✅ [signUpWithProfile] Usuario creado exitosamente en auth:', data.user.id)
      console.log('✅ [signUpWithProfile] Usuario creado exitosamente en auth:', data.user.id)
      
      // Intentar crear el perfil en users (pero NO fallar si hay error)
      try {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            auth_user_id: data.user.id,
            email: data.user.email!,
            full_name: userData.fullName || data.user.email?.split('@')[0] || '',
            organization_id: userData.organizationId || null,
            workshop_id: null,
            role: 'ADMIN',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.warn('⚠️ [signUpWithProfile] Error creando perfil (no crítico):', profileError)
          
          // Si el error es de duplicado, intentar actualizar
          if (profileError.code === '23505') {
            console.log('🔄 [signUpWithProfile] Usuario ya existe en users, actualizando...')
            const { error: updateError } = await supabase
              .from('users')
              .update({
                auth_user_id: data.user.id,
                organization_id: userData.organizationId || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', data.user.id)
            
            if (updateError) {
              console.warn('⚠️ [signUpWithProfile] Error actualizando perfil:', updateError)
            } else {
              console.log('✅ [signUpWithProfile] Perfil actualizado exitosamente')
            }
          }
        } else {
          console.log('✅ [signUpWithProfile] Perfil de usuario creado exitosamente en users')
        }
      } catch (profileErr: any) {
        console.warn('⚠️ [signUpWithProfile] Error en proceso de creación de perfil (no crítico):', profileErr)
        // NO lanzamos error aquí porque el usuario ya se creó en auth
        // El perfil se puede crear después o mediante triggers
      }

      // ✅ SIEMPRE devolver éxito si el usuario se creó en auth
      console.log('✅ [signUpWithProfile] Registro exitoso, retornando usuario')
      return {
        user: data.user,
        session: data.session,
        error: null
      }
    }

    // ✅ Solo si NO hay usuario Y hay error, devolver error
    if (error) {
      console.error('❌ [signUpWithProfile] Error al crear usuario en auth:', error)
      throw error
    }

    // ✅ Caso raro: no hay usuario ni error
    console.error('❌ [signUpWithProfile] Caso inesperado: no hay usuario ni error')
    throw new Error('No se pudo crear el usuario')
    
  } catch (error: any) {
    console.error('❌ [signUpWithProfile] Error capturado:', error)
    return {
      user: null,
      session: null,
      error: error
    }
  }
}

/**
 * Cerrar sesión
 */
export async function signOut() {
  try {
    const supabase = getBrowserClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error en signOut:', error)
    return { success: false, error }
  }
}

/**
 * Obtener usuario actual
 */
export async function getCurrentUser() {
  try {
    const supabase = getBrowserClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw error
    }

    return { user, error: null }
  } catch (error: any) {
    console.error('Error al obtener usuario actual:', error)
    return { user: null, error }
  }
}

/**
 * Obtener sesión actual
 */
export async function getCurrentSession() {
  try {
    const supabase = getBrowserClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    return { session, error: null }
  } catch (error: any) {
    console.error('Error al obtener sesión actual:', error)
    return { session: null, error }
  }
}

/**
 * Enviar email de recuperación de contraseña
 */
export async function resetPassword(email: string) {
  try {
    const supabase = getBrowserClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      throw error
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error al enviar email de recuperación:', error)
    return { success: false, error }
  }
}

/**
 * Actualizar contraseña
 */
export async function updatePassword(newPassword: string) {
  try {
    const supabase = getBrowserClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      throw error
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error al actualizar contraseña:', error)
    return { success: false, error }
  }
}
