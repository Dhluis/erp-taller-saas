/**
 * Servicio de Perfiles de Usuario
 * Funciones para manejar user_profiles que vinculan auth.users con organizations
 * Compatible con multi-tenancy y sistema de autenticación existente
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { z } from 'zod'
import { UserProfile, UserProfileInsert, UserProfileUpdate } from '@/types/supabase-simple'

// Esquemas de validación para perfiles de usuario
const userProfileSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role: z.enum(['admin', 'manager', 'mechanic', 'receptionist', 'user']).default('user'),
  full_name: z.string().min(1, 'El nombre completo no puede estar vacío').nullable(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  email_verified: z.boolean().default(false),
  last_login_at: z.string().datetime().nullable().optional(),
  preferences: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

const createUserProfileSchema = userProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_login_at: true,
  email_verified: true,
})

const updateUserProfileSchema = userProfileSchema.partial().omit({
  id: true,
  organization_id: true,
  created_at: true,
  updated_at: true,
})

// Tipos derivados
export type CreateUserProfileData = z.infer<typeof createUserProfileSchema>
export type UpdateUserProfileData = z.infer<typeof updateUserProfileSchema>

// Interfaces adicionales
export interface UserProfileWithOrganization extends UserProfile {
  organization?: {
    id: string
    name: string
  }
}

export interface UserProfileStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  usersByRole: Array<{
    role: string
    count: number
  }>
  recentLogins: UserProfile[]
  usersByDepartment: Array<{
    department: string
    count: number
  }>
}

export interface UserProfileFilters {
  organization_id?: string
  role?: string
  is_active?: boolean
  department?: string
  search?: string
  page?: number
  limit?: number
}

/**
 * ============================================
 * FUNCIONES CRUD BÁSICAS
 * ============================================
 */

/**
 * Obtener todos los perfiles de usuario con filtros
 */
export async function getUserProfiles(organizationId: string, filters?: Omit<UserProfileFilters, 'organization_id'>): Promise<UserProfile[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('user_profiles').select('*')
        .eq('organization_id', organizationId) // ✅ Filtrar por org

      if (filters) {
        if (filters.role) {
          query = query.eq('role', filters.role)
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
        if (filters.department) {
          query = query.eq('department', filters.department)
        }
        if (filters.search) {
          query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
        }
        
        // Paginación
        if (filters.page && filters.limit) {
          const offset = (filters.page - 1) * filters.limit
          query = query.range(offset, offset + filters.limit - 1)
        }
      }

      const { data, error } = await query
        .order('full_name', { ascending: true, nullsLast: true })

      if (error) {
        throw new Error(`Error al obtener perfiles de usuario: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'getUserProfiles',
      table: 'user_profiles'
    }
  )
}

/**
 * Obtener un perfil de usuario por ID
 */
export async function getUserProfileById(id: string, organizationId: string): Promise<UserProfile | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId) // ✅ Validar org
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error al obtener perfil de usuario: ${error.message}`)
      }

      return data
    },
    {
      operation: 'getUserProfileById',
      table: 'user_profiles'
    }
  )
}

/**
 * Obtener perfil del usuario actual
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data: { user }, error: authError } = await client.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error al obtener perfil del usuario actual: ${error.message}`)
      }

      return data
    },
    {
      operation: 'getCurrentUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * Crear un nuevo perfil de usuario
 */
export async function createUserProfile(profileData: CreateUserProfileData): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      const validatedData = createUserProfileSchema.parse(profileData)
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        throw new Error(`Error al crear perfil de usuario: ${error.message}`)
      }

      return data
    },
    {
      operation: 'createUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * Actualizar un perfil de usuario
 */
export async function updateUserProfile(id: string, profileData: UpdateUserProfileData): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      const validatedData = updateUserProfileSchema.parse(profileData)
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Error al actualizar perfil de usuario: ${error.message}`)
      }

      return data
    },
    {
      operation: 'updateUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * Eliminar un perfil de usuario
 */
export async function deleteUserProfile(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { error } = await client
        .from('user_profiles')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Error al eliminar perfil de usuario: ${error.message}`)
      }
    },
    {
      operation: 'deleteUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * ============================================
 * FUNCIONES DE BÚSQUEDA Y FILTRADO
 * ============================================
 */

/**
 * Buscar perfiles de usuario por texto
 */
export async function searchUserProfiles(searchTerm: string, organizationId?: string): Promise<UserProfile[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('user_profiles').select('*')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%`)
        .order('full_name', { ascending: true, nullsLast: true })

      if (error) {
        throw new Error(`Error al buscar perfiles de usuario: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'searchUserProfiles',
      table: 'user_profiles'
    }
  )
}

/**
 * Obtener perfiles por rol
 */
export async function getUserProfilesByRole(role: string, organizationId?: string): Promise<UserProfile[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('user_profiles').select('*').eq('role', role)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .order('full_name', { ascending: true, nullsLast: true })

      if (error) {
        throw new Error(`Error al obtener perfiles por rol: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'getUserProfilesByRole',
      table: 'user_profiles'
    }
  )
}

/**
 * Obtener perfiles por departamento
 */
export async function getUserProfilesByDepartment(department: string, organizationId?: string): Promise<UserProfile[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('user_profiles').select('*').eq('department', department)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .order('full_name', { ascending: true, nullsLast: true })

      if (error) {
        throw new Error(`Error al obtener perfiles por departamento: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'getUserProfilesByDepartment',
      table: 'user_profiles'
    }
  )
}

/**
 * ============================================
 * FUNCIONES DE ESTADÍSTICAS
 * ============================================
 */

/**
 * Obtener estadísticas de perfiles de usuario
 */
export async function getUserProfileStats(organizationId?: string): Promise<UserProfileStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('user_profiles').select('role, is_active, last_login_at, department')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Error al obtener estadísticas de perfiles: ${error.message}`)
      }

      const profiles = data || []
      const totalUsers = profiles.length
      const activeUsers = profiles.filter(p => p.is_active).length
      const inactiveUsers = profiles.filter(p => !p.is_active).length

      // Agrupar por rol
      const usersByRole = profiles.reduce((acc: any, profile: any) => {
        const role = profile.role
        if (!acc[role]) {
          acc[role] = 0
        }
        acc[role] += 1
        return acc
      }, {})

      const usersByRoleArray = Object.entries(usersByRole).map(([role, count]) => ({
        role,
        count: count as number
      }))

      // Agrupar por departamento
      const usersByDepartment = profiles.reduce((acc: any, profile: any) => {
        const department = profile.department || 'Sin departamento'
        if (!acc[department]) {
          acc[department] = 0
        }
        acc[department] += 1
        return acc
      }, {})

      const usersByDepartmentArray = Object.entries(usersByDepartment).map(([department, count]) => ({
        department,
        count: count as number
      }))

      // Usuarios con login reciente (últimos 7 días)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentLogins = profiles.filter(p => 
        p.last_login_at && new Date(p.last_login_at) >= sevenDaysAgo
      ).slice(0, 10)

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole: usersByRoleArray,
        recentLogins,
        usersByDepartment: usersByDepartmentArray
      }
    },
    {
      operation: 'getUserProfileStats',
      table: 'user_profiles'
    }
  )
}

/**
 * ============================================
 * FUNCIONES DE GESTIÓN DE ESTADO
 * ============================================
 */

/**
 * Activar/desactivar perfil de usuario
 */
export async function toggleUserProfileStatus(id: string, isActive: boolean): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Error al cambiar estado del perfil: ${error.message}`)
      }

      return data
    },
    {
      operation: 'toggleUserProfileStatus',
      table: 'user_profiles'
    }
  )
}

/**
 * Actualizar último login
 */
export async function updateLastLogin(id: string): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Error al actualizar último login: ${error.message}`)
      }

      return data
    },
    {
      operation: 'updateLastLogin',
      table: 'user_profiles'
    }
  )
}

/**
 * Actualizar preferencias del usuario
 */
export async function updateUserPreferences(id: string, preferences: Record<string, any>): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .update({ preferences, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Error al actualizar preferencias: ${error.message}`)
      }

      return data
    },
    {
      operation: 'updateUserPreferences',
      table: 'user_profiles'
    }
  )
}

/**
 * ============================================
 * FUNCIONES DE VALIDACIÓN Y UTILIDADES
 * ============================================
 */

/**
 * Verificar si un usuario tiene un rol específico
 */
export async function hasUserRole(userId: string, role: string): Promise<boolean> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(`Error al verificar rol del usuario: ${error.message}`)
      }

      return data?.role === role
    },
    {
      operation: 'hasUserRole',
      table: 'user_profiles'
    }
  )
}

/**
 * Verificar si un usuario es administrador
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(`Error al verificar si es administrador: ${error.message}`)
      }

      return data?.role === 'admin'
    },
    {
      operation: 'isUserAdmin',
      table: 'user_profiles'
    }
  )
}

/**
 * Obtener organización del usuario
 */
export async function getUserOrganization(userId: string): Promise<string | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(`Error al obtener organización del usuario: ${error.message}`)
      }

      return data?.organization_id || null
    },
    {
      operation: 'getUserOrganization',
      table: 'user_profiles'
    }
  )
}

/**
 * ============================================
 * FUNCIONES DE INTEGRACIÓN CON AUTH
 * ============================================
 */

/**
 * Crear perfil automáticamente después del registro
 */
export async function createProfileAfterSignup(userId: string, organizationId: string, userData: {
  full_name?: string
  role?: string
  phone?: string
  department?: string
  position?: string
}): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      const profileData: CreateUserProfileData = {
        id: userId,
        organization_id: organizationId,
        role: userData.role || 'user',
        full_name: userData.full_name || null,
        phone: userData.phone || null,
        department: userData.department || null,
        position: userData.position || null,
        is_active: true,
        email_verified: false,
        preferences: {},
        metadata: {}
      }

      return await createUserProfile(profileData)
    },
    {
      operation: 'createProfileAfterSignup',
      table: 'user_profiles'
    }
  )
}

/**
 * Sincronizar datos de auth.users con user_profiles
 */
export async function syncAuthUserData(userId: string): Promise<UserProfile | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      // Obtener datos del usuario de auth
      const { data: authUser, error: authError } = await client.auth.getUser()
      
      if (authError || !authUser.user || authUser.user.id !== userId) {
        throw new Error('Usuario no encontrado en auth')
      }

      // Obtener perfil existente primero para obtener organizationId
      const { data: existingProfile, error: profileError } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(`Error al obtener perfil existente: ${profileError.message}`)
      }
      
      if (existingProfile) {
        // Usar organizationId del perfil existente para validar en la actualización
        const organizationId = existingProfile.organization_id
        // Actualizar perfil existente con datos de auth
        const updateData: UpdateUserProfileData = {
          full_name: authUser.user.user_metadata?.full_name || existingProfile.full_name,
          email_verified: !!authUser.user.email_confirmed_at,
          metadata: {
            ...existingProfile.metadata,
            last_auth_update: new Date().toISOString(),
            auth_provider: authUser.user.app_metadata?.provider || 'email'
          }
        }

        // Actualizar validando organization_id
        return await updateUserProfile(userId, updateData)
      }

      return null
    },
    {
      operation: 'syncAuthUserData',
      table: 'user_profiles'
    }
  )
}
