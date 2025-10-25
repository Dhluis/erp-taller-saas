/**
 * Helpers de Autenticación
 * Funciones para integrar user_profiles con el sistema de autenticación
 * Compatible con multi-tenancy y RLS
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { 
  getUserProfileById, 
  getCurrentUserProfile, 
  createProfileAfterSignup,
  syncAuthUserData,
  updateLastLogin,
  hasUserRole,
  isUserAdmin,
  getUserOrganization
} from '../supabase/user-profiles'

/**
 * Obtener cliente Supabase para autenticación
 */
function getAuthClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: any) =>
          cookieStore.set(name, '', options)
      }
    }
  )
}

/**
 * ============================================
 * FUNCIONES DE AUTENTICACIÓN
 * ============================================
 */

/**
 * Obtener usuario autenticado con su perfil
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = getAuthClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // Obtener perfil del usuario
    const profile = await getUserProfileById(user.id)
    
    return {
      user,
      profile,
      isAuthenticated: true
    }
  } catch (error) {
    console.error('Error al obtener usuario autenticado:', error)
    return null
  }
}

/**
 * Verificar si el usuario está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const authData = await getAuthenticatedUser()
    return authData?.isAuthenticated || false
  } catch (error) {
    console.error('Error al verificar autenticación:', error)
    return false
  }
}

/**
 * Requerir autenticación (redirige si no está autenticado)
 */
export async function requireAuth(redirectTo: string = '/auth/login') {
  const authData = await getAuthenticatedUser()
  
  if (!authData?.isAuthenticated) {
    redirect(redirectTo)
  }
  
  return authData
}

/**
 * ============================================
 * FUNCIONES DE AUTORIZACIÓN
 * ============================================
 */

/**
 * Verificar si el usuario tiene un rol específico
 */
export async function requireRole(role: string, redirectTo: string = '/unauthorized') {
  const authData = await requireAuth()
  
  if (!authData.profile || authData.profile.role !== role) {
    redirect(redirectTo)
  }
  
  return authData
}

/**
 * Verificar si el usuario es administrador
 */
export async function requireAdmin(redirectTo: string = '/unauthorized') {
  const authData = await requireAuth()
  
  if (!authData.profile || !['admin', 'manager'].includes(authData.profile.role)) {
    redirect(redirectTo)
  }
  
  return authData
}

/**
 * Verificar si el usuario tiene acceso a una organización
 */
export async function requireOrganizationAccess(organizationId: string, redirectTo: string = '/unauthorized') {
  const authData = await requireAuth()
  
  if (!authData.profile || authData.profile.organization_id !== organizationId) {
    redirect(redirectTo)
  }
  
  return authData
}

/**
 * Verificar múltiples condiciones de autorización
 */
export async function requireAuthConditions(conditions: {
  roles?: string[]
  organizationId?: string
  isActive?: boolean
}, redirectTo: string = '/unauthorized') {
  const authData = await requireAuth()
  
  if (!authData.profile) {
    redirect(redirectTo)
  }

  const { profile } = authData

  // Verificar roles
  if (conditions.roles && !conditions.roles.includes(profile.role)) {
    redirect(redirectTo)
  }

  // Verificar organización
  if (conditions.organizationId && profile.organization_id !== conditions.organizationId) {
    redirect(redirectTo)
  }

  // Verificar estado activo
  if (conditions.isActive && !profile.is_active) {
    redirect(redirectTo)
  }

  return authData
}

/**
 * ============================================
 * FUNCIONES DE REGISTRO Y LOGIN
 * ============================================
 */

/**
 * Registrar nuevo usuario con perfil
 */
export async function signUpWithProfile(userData: {
  email: string
  password: string
  organizationId: string
  fullName?: string
  role?: string
  phone?: string
  department?: string
  position?: string
}) {
  try {
    const supabase = getAuthClient()
    
    // Registrar usuario en auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          organization_id: userData.organizationId,
          role: userData.role || 'user'
        }
      }
    })

    if (authError) {
      throw new Error(`Error en registro: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario')
    }

    // Crear perfil automáticamente (el trigger también lo hará, pero esto es más controlado)
    try {
      await createProfileAfterSignup(authData.user.id, userData.organizationId, {
        full_name: userData.fullName,
        role: userData.role,
        phone: userData.phone,
        department: userData.department,
        position: userData.position
      })
    } catch (profileError) {
      console.warn('Error al crear perfil (puede que ya exista):', profileError)
    }

    return {
      user: authData.user,
      session: authData.session,
      success: true
    }
  } catch (error) {
    console.error('Error en signUpWithProfile:', error)
    throw error
  }
}

/**
 * Iniciar sesión y actualizar último login
 */
export async function signInWithProfile(email: string, password: string) {
  try {
    const supabase = getAuthClient()
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      throw new Error(`Error en login: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No se pudo autenticar el usuario')
    }

    // Actualizar último login
    try {
      await updateLastLogin(authData.user.id)
    } catch (loginError) {
      console.warn('Error al actualizar último login:', loginError)
    }

    // Sincronizar datos de auth con perfil
    try {
      await syncAuthUserData(authData.user.id)
    } catch (syncError) {
      console.warn('Error al sincronizar datos de auth:', syncError)
    }

    return {
      user: authData.user,
      session: authData.session,
      success: true
    }
  } catch (error) {
    console.error('Error en signInWithProfile:', error)
    throw error
  }
}

/**
 * Cerrar sesión
 */
export async function signOut() {
  try {
    const supabase = getAuthClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(`Error al cerrar sesión: ${error.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error en signOut:', error)
    throw error
  }
}

/**
 * ============================================
 * FUNCIONES DE UTILIDAD
 * ============================================
 */

/**
 * Obtener información de la sesión actual
 */
export async function getCurrentSession() {
  try {
    const supabase = getAuthClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(`Error al obtener sesión: ${error.message}`)
    }

    return session
  } catch (error) {
    console.error('Error al obtener sesión actual:', error)
    return null
  }
}

/**
 * Verificar si el usuario puede acceder a un recurso
 */
export async function canAccessResource(resource: {
  organizationId?: string
  requiredRoles?: string[]
  requireActive?: boolean
}): Promise<boolean> {
  try {
    const authData = await getAuthenticatedUser()
    
    if (!authData?.profile) {
      return false
    }

    const { profile } = authData

    // Verificar organización
    if (resource.organizationId && profile.organization_id !== resource.organizationId) {
      return false
    }

    // Verificar roles
    if (resource.requiredRoles && !resource.requiredRoles.includes(profile.role)) {
      return false
    }

    // Verificar estado activo
    if (resource.requireActive && !profile.is_active) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error al verificar acceso al recurso:', error)
    return false
  }
}

/**
 * Obtener contexto de usuario para componentes
 */
export async function getUserContext() {
  try {
    const authData = await getAuthenticatedUser()
    
    if (!authData?.profile) {
      return null
    }

    const { user, profile } = authData

    return {
      id: user.id,
      email: user.email,
      role: profile.role,
      organizationId: profile.organization_id,
      fullName: profile.full_name,
      isActive: profile.is_active,
      avatarUrl: profile.avatar_url,
      phone: profile.phone,
      department: profile.department,
      position: profile.position,
      preferences: profile.preferences,
      lastLoginAt: profile.last_login_at,
      isAdmin: ['admin', 'manager'].includes(profile.role),
      isVerified: profile.email_verified
    }
  } catch (error) {
    console.error('Error al obtener contexto de usuario:', error)
    return null
  }
}

/**
 * Middleware para verificar autenticación en API routes
 */
export async function withAuth(handler: (user: any, profile: any) => Promise<Response>) {
  return async (request: Request) => {
    try {
      const authData = await getAuthenticatedUser()
      
      if (!authData?.isAuthenticated) {
        return new Response(
          JSON.stringify({ error: 'No autorizado' }), 
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      return await handler(authData.user, authData.profile)
    } catch (error) {
      console.error('Error en middleware de autenticación:', error)
      return new Response(
        JSON.stringify({ error: 'Error interno del servidor' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

/**
 * Middleware para verificar autorización en API routes
 */
export async function withAuthorization(
  conditions: {
    roles?: string[]
    organizationId?: string
    isActive?: boolean
  },
  handler: (user: any, profile: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const authData = await getAuthenticatedUser()
      
      if (!authData?.isAuthenticated) {
        return new Response(
          JSON.stringify({ error: 'No autorizado' }), 
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      const { profile } = authData

      // Verificar condiciones de autorización
      if (conditions.roles && !conditions.roles.includes(profile.role)) {
        return new Response(
          JSON.stringify({ error: 'Permisos insuficientes' }), 
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      if (conditions.organizationId && profile.organization_id !== conditions.organizationId) {
        return new Response(
          JSON.stringify({ error: 'Acceso denegado a esta organización' }), 
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      if (conditions.isActive && !profile.is_active) {
        return new Response(
          JSON.stringify({ error: 'Usuario inactivo' }), 
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      }

      return await handler(authData.user, authData.profile)
    } catch (error) {
      console.error('Error en middleware de autorización:', error)
      return new Response(
        JSON.stringify({ error: 'Error interno del servidor' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}
















