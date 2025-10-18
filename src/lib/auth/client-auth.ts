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
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          organization_id: userData.organizationId
        }
      }
    })

    if (error) {
      throw error
    }

    // Si el usuario se creó exitosamente, crear el perfil en system_users
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('system_users')
          .insert({
            email: data.user.email!,
            name: userData.fullName,
            organization_id: userData.organizationId,
            role: 'admin', // Primer usuario siempre es admin
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.warn('Error creando perfil de usuario:', profileError)
          // No lanzamos error aquí porque el usuario ya se creó en auth
        }
      } catch (profileErr) {
        console.warn('Error en proceso de creación de perfil:', profileErr)
        // No lanzamos error aquí porque el usuario ya se creó en auth
      }
    }

    return {
      user: data.user,
      session: data.session,
      error: null
    }
  } catch (error: any) {
    console.error('Error en signUpWithProfile:', error)
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
