import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'
import { UserRole } from '@/lib/auth/permissions'

/**
 * =====================================================
 * QUERIES PARA GESTIÓN DE USUARIOS
 * =====================================================
 * Sistema completo de gestión de usuarios del sistema
 * con roles y permisos
 */

export interface SystemUser {
  id: string
  email: string
  name?: string
  role: UserRole
  organization_id: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

/**
 * Obtener todos los usuarios de una organización
 */
export async function getAllUsers(
  organizationId: string,
  filters?: {
    role?: UserRole
    is_active?: boolean
    search?: string
    page?: number
    limit?: number
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('system_users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.role) {
      query = query.eq('role', filters.role)
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,` +
        `email.ilike.%${filters.search}%`
      )
    }

    // Paginación
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }, { operation: 'getAllUsers', table: 'system_users' })
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getUserById', table: 'system_users' })
}

/**
 * Obtener usuario por email
 */
export async function getUserByEmail(email: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getUserByEmail', table: 'system_users' })
}

/**
 * Crear nuevo usuario
 */
export async function createUser(data: {
  email: string
  name?: string
  role: UserRole
  organization_id: string
  created_by: string
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Validaciones
    if (!data.email || !data.role || !data.organization_id) {
      throw new Error('Email, rol y organización son requeridos')
    }

    // Verificar que el email no esté duplicado
    const { data: existingUser } = await supabase
      .from('system_users')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingUser) {
      throw new Error(`Ya existe un usuario con el email ${data.email}`)
    }

    // Crear usuario
    const { data: newUser, error } = await supabase
      .from('system_users')
      .insert({
        ...data,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return newUser
  }, { operation: 'createUser', table: 'system_users' })
}

/**
 * Actualizar usuario
 */
export async function updateUser(
  id: string,
  data: {
    name?: string
    role?: UserRole
    is_active?: boolean
    updated_by: string
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que el usuario existe
    const { data: existingUser } = await supabase
      .from('system_users')
      .select('id, email')
      .eq('id', id)
      .single()

    if (!existingUser) {
      throw new Error('Usuario no encontrado')
    }

    // Actualizar usuario
    const { data: updatedUser, error } = await supabase
      .from('system_users')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updatedUser
  }, { operation: 'updateUser', table: 'system_users' })
}

/**
 * Desactivar usuario (soft delete)
 */
export async function deactivateUser(id: string, updated_by: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que el usuario existe
    const { data: existingUser } = await supabase
      .from('system_users')
      .select('id, role')
      .eq('id', id)
      .single()

    if (!existingUser) {
      throw new Error('Usuario no encontrado')
    }

    // No permitir desactivar el último admin
    if (existingUser.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('system_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)

      if (adminCount === 1) {
        throw new Error('No se puede desactivar el último administrador')
      }
    }

    // Desactivar usuario
    const { data: deactivatedUser, error } = await supabase
      .from('system_users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return deactivatedUser
  }, { operation: 'deactivateUser', table: 'system_users' })
}

/**
 * Activar usuario
 */
export async function activateUser(id: string, updated_by: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Activar usuario
    const { data: activatedUser, error } = await supabase
      .from('system_users')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return activatedUser
  }, { operation: 'activateUser', table: 'system_users' })
}

/**
 * Cambiar rol de usuario
 */
export async function changeUserRole(
  id: string,
  newRole: UserRole,
  updated_by: string
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que el usuario existe
    const { data: existingUser } = await supabase
      .from('system_users')
      .select('id, role')
      .eq('id', id)
      .single()

    if (!existingUser) {
      throw new Error('Usuario no encontrado')
    }

    // No permitir cambiar el rol del último admin
    if (existingUser.role === 'admin' && newRole !== 'admin') {
      const { count: adminCount } = await supabase
        .from('system_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)

      if (adminCount === 1) {
        throw new Error('No se puede cambiar el rol del último administrador')
      }
    }

    // Cambiar rol
    const { data: updatedUser, error } = await supabase
      .from('system_users')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
        updated_by
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updatedUser
  }, { operation: 'changeUserRole', table: 'system_users' })
}

/**
 * Obtener usuarios por rol
 */
export async function getUsersByRole(organizationId: string, role: UserRole) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_users')
      .select('id, email, name, role, is_active, last_login, created_at')
      .eq('organization_id', organizationId)
      .eq('role', role)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }, { operation: 'getUsersByRole', table: 'system_users' })
}

/**
 * Buscar usuarios
 */
export async function searchUsers(organizationId: string, query: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('system_users')
      .select('id, email, name, role, is_active')
      .eq('organization_id', organizationId)
      .or(
        `name.ilike.%${query}%,` +
        `email.ilike.%${query}%`
      )
      .order('name', { ascending: true })
      .limit(20)

    if (error) throw error
    return data || []
  }, { operation: 'searchUsers', table: 'system_users' })
}

/**
 * Obtener estadísticas de usuarios
 */
export async function getUserStats(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Total usuarios
    const { count: totalUsers } = await supabase
      .from('system_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Usuarios activos
    const { count: activeUsers } = await supabase
      .from('system_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    // Usuarios por rol
    const { data: roleStats } = await supabase
      .from('system_users')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const roleCounts = roleStats?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Usuarios nuevos (últimos 30 días)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { count: newUsers } = await supabase
      .from('system_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)

    return {
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,
      inactive_users: (totalUsers || 0) - (activeUsers || 0),
      new_users: newUsers || 0,
      role_breakdown: roleCounts
    }
  }, { operation: 'getUserStats', table: 'system_users' })
}

/**
 * Actualizar último login
 */
export async function updateLastLogin(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('system_users')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }, { operation: 'updateLastLogin', table: 'system_users' })
}

/**
 * Verificar si un usuario puede gestionar otros usuarios
 */
export async function canManageUser(
  managerId: string,
  targetUserId: string
): Promise<boolean> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información de ambos usuarios
    const { data: manager } = await supabase
      .from('system_users')
      .select('role, organization_id')
      .eq('id', managerId)
      .single()

    const { data: target } = await supabase
      .from('system_users')
      .select('role, organization_id')
      .eq('id', targetUserId)
      .single()

    if (!manager || !target) return false

    // Verificar misma organización
    if (manager.organization_id !== target.organization_id) return false

    // Verificar jerarquía de roles
    const roleHierarchy: Record<UserRole, number> = {
      admin: 4,
      manager: 3,
      employee: 2,
      viewer: 1
    }

    return roleHierarchy[manager.role as UserRole] > roleHierarchy[target.role as UserRole]
  }, { operation: 'canManageUser', table: 'system_users' })
}

