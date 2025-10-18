/**
 * Servicio de Usuarios del Sistema
 * Funciones para manejar usuarios del sistema y administración
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { z } from 'zod'
import { SystemUser, SystemUserInsert, SystemUserUpdate } from '@/types/supabase-simple'
// Esquema de validación para usuarios del sistema
const systemUserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('Debe ser un email válido'),
  first_name: z.string().min(1, 'El nombre no puede estar vacío'),
  last_name: z.string().min(1, 'El apellido no puede estar vacío'),
  role: z.enum(['admin', 'manager', 'employee', 'viewer']).default('employee'),
  is_active: z.boolean().default(true),
  last_login: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type SystemUser = z.infer<typeof systemUserSchema>
export type CreateSystemUser = Omit<SystemUser, 'id' | 'created_at' | 'updated_at' | 'last_login'>
export type UpdateSystemUser = Partial<Omit<SystemUser, 'created_at' | 'updated_at' | 'organization_id'>>

export interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  usersByRole: Array<{
    role: string
    count: number
  }>
  recentLogins: SystemUser[]
}

/**
 * Obtener usuarios del sistema
 */
export async function getSystemUsers(filters?: {
  organization_id?: string
  role?: string
  is_active?: boolean
  search?: string
}): Promise<SystemUser[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('system_users').select('*')

      if (filters) {
        if (filters.organization_id) {
          query = query.eq('organization_id', filters.organization_id)
        }
        if (filters.role) {
          query = query.eq('role', filters.role)
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
        if (filters.search) {
          query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }
      }

      const { data, error } = await query
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch system users: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'getSystemUsers',
      table: 'system_users'
    }
  )
}

/**
 * Obtener estadísticas de usuarios
 */
export async function getUserStats(organizationId?: string): Promise<UserStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('system_users').select('role, is_active, last_login')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch user stats: ${error.message}`)
      }

      const users = data || []
      const totalUsers = users.length
      const activeUsers = users.filter(u => u.is_active).length
      const inactiveUsers = users.filter(u => !u.is_active).length

      // Agrupar por rol
      const usersByRole = users.reduce((acc: any, user: any) => {
        const role = user.role
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

      // Usuarios con login reciente (últimos 7 días)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentLogins = users.filter(u => 
        u.last_login && new Date(u.last_login) >= sevenDaysAgo
      ).slice(0, 10)

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole: usersByRoleArray,
        recentLogins
      }
    },
    {
      operation: 'getUserStats',
      table: 'system_users'
    }
  )
}

/**
 * Crear un nuevo usuario del sistema
 */
export async function createSystemUser(userData: CreateSystemUser): Promise<SystemUser> {
  return executeWithErrorHandling(
    async () => {
      const validatedData = systemUserSchema.omit({ id: true, created_at: true, updated_at: true, last_login: true }).parse(userData)
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('system_users')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create system user: ${error.message}`)
      }

      return data
    },
    {
      operation: 'createSystemUser',
      table: 'system_users'
    }
  )
}

/**
 * Actualizar un usuario del sistema
 */
export async function updateSystemUser(id: string, userData: UpdateSystemUser): Promise<SystemUser> {
  return executeWithErrorHandling(
    async () => {
      const validatedData = systemUserSchema.partial().omit({ created_at: true, updated_at: true, organization_id: true }).parse(userData)
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('system_users')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update system user: ${error.message}`)
      }

      return data
    },
    {
      operation: 'updateSystemUser',
      table: 'system_users'
    }
  )
}

/**
 * Obtener un usuario por su ID
 */
export async function getSystemUserById(id: string): Promise<SystemUser | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('system_users')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(`Failed to fetch system user by ID: ${error.message}`)
      }

      return data
    },
    {
      operation: 'getSystemUserById',
      table: 'system_users'
    }
  )
}

/**
 * Eliminar un usuario del sistema
 */
export async function deleteSystemUser(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { error } = await client
        .from('system_users')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete system user: ${error.message}`)
      }
    },
    {
      operation: 'deleteSystemUser',
      table: 'system_users'
    }
  )
}

/**
 * Buscar usuarios por nombre, apellido o email
 */
export async function searchSystemUsers(searchTerm: string, organizationId?: string): Promise<SystemUser[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('system_users').select('*')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (error) {
        throw new Error(`Failed to search system users: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'searchSystemUsers',
      table: 'system_users'
    }
  )
}

/**
 * Activar/desactivar usuario
 */
export async function toggleUserStatus(id: string, isActive: boolean): Promise<SystemUser> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('system_users')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to toggle user status: ${error.message}`)
      }

      return data
    },
    {
      operation: 'toggleUserStatus',
      table: 'system_users'
    }
  )
}

/**
 * Actualizar último login
 */
export async function updateLastLogin(id: string): Promise<SystemUser> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('system_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update last login: ${error.message}`)
      }

      return data
    },
    {
      operation: 'updateLastLogin',
      table: 'system_users'
    }
  )
}

/**
 * Obtener usuarios por rol
 */
export async function getUsersByRole(role: string, organizationId?: string): Promise<SystemUser[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      let query = client.from('system_users').select('*').eq('role', role)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .order('last_name', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch users by role: ${error.message}`)
      }

      return data || []
    },
    {
      operation: 'getUsersByRole',
      table: 'system_users'
    }
  )
}






