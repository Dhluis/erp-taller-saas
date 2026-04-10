import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'
import { UserRole } from '@/lib/auth/permissions'
import { deleteRedisKey, REDIS_KEYS } from '@/lib/rate-limit/redis'

/**
 * Invalida el caché del perfil del usuario en Redis
 */
export async function invalidateUserProfileCache(userId: string) {
  try {
    const key = `${REDIS_KEYS.SESSION_PROFILE}:${userId}`;
    await deleteRedisKey(key);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache Invalidation] 🔄 Invalidaded: ${key}`);
    }
  } catch (error) {
    console.warn('[Cache Invalidation] ⚠️ Error invalidando caché:', error);
  }
}

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
 * Obtener perfil de usuario por AUTH ID con caché en Redis
 */
export async function getCachedProfileByAuthId(authUserId: string, supabaseClient?: any) {
  const cacheKey = `${REDIS_KEYS.SESSION_PROFILE}:${authUserId}`;
  
  // 1. Intentar obtener de Redis
  try {
    const { getRedisValue } = await import('@/lib/rate-limit/redis');
    const cached = await getRedisValue(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    console.warn('[Cache] ⚠️ Error leyendo caché:', err);
  }

  // 2. Si no hay en caché, consultar DB
  const supabase = (supabaseClient || await createClient()) as any;
  
  // Intento 1: Tabla 'users' (Principal)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, auth_user_id, email, full_name, role, phone, is_active, organization_id, created_at, updated_at, avatar_url, workshop_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  let finalData = userData;

  // Intento 2: Tabla 'system_users' (Fallback / Legacy / Admin-created)
  if (!finalData && !userError) {
    console.log(`🔍 [Profile Query] Usuario ${authUserId} no encontrado en 'users', buscando en 'system_users'...`);
    const { data: systemData } = await supabase
      .from('system_users')
      .select('id, email, first_name, last_name, role, is_active, organization_id, created_at, updated_at, auth_user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
      
    if (systemData) {
      console.log(`✅ [Profile Query] Usuario encontrado en 'system_users'`);
      // Adaptar formato a lo que espera el resto de la app
      finalData = {
        ...systemData,
        full_name: `${systemData.first_name || ''} ${systemData.last_name || ''}`.trim() || systemData.email?.split('@')[0] || 'Usuario'
      };
    }
  }

  if (!finalData) return null;

  // 3. Guardar en Redis (TTL 5 min para datos de sesión)
  try {
    const { setRedisValue } = await import('@/lib/rate-limit/redis');
    await setRedisValue(cacheKey, finalData, 300);
  } catch (err) {
    console.warn('[Cache] ⚠️ Error guardando en caché:', err);
  }

  return finalData;
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
    const supabase = (await createClient()) as any
    
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
    const supabase = (await createClient()) as any
    
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
    const supabase = (await createClient()) as any
    
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
    const supabase = (await createClient()) as any

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
        email: data.email,
        first_name: data.name?.split(' ')[0] || '',
        last_name: data.name?.split(' ').slice(1).join(' ') || '',
        role: data.role,
        organization_id: data.organization_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
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
    const supabase = (await createClient()) as any

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
        first_name: data.name?.split(' ')[0],
        last_name: data.name?.split(' ').slice(1).join(' '),
        role: data.role,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select('*, auth_user_id')
      .single()

    if (error) throw error
    
    // Invalidad caché tras actualizar usando auth_user_id
    if (updatedUser && (updatedUser as any).auth_user_id) {
      await invalidateUserProfileCache((updatedUser as any).auth_user_id);
    }
    
    return updatedUser
  }, { operation: 'updateUser', table: 'system_users' })
}

/**
 * Desactivar usuario (soft delete)
 */
export async function deactivateUser(id: string, updated_by: string) {
  return executeWithErrorHandling(async () => {
    const supabase = (await createClient()) as any

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
    if (existingUser.role === 'ADMIN') {
      const { count: adminCount } = await supabase
        .from('system_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ADMIN')
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
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select('*, auth_user_id')
      .single()

    if (error) throw error
    
    // Invalidad caché tras desactivar usando auth_user_id
    if (deactivatedUser && (deactivatedUser as any).auth_user_id) {
      await invalidateUserProfileCache((deactivatedUser as any).auth_user_id);
    }
    
    return deactivatedUser
  }, { operation: 'deactivateUser', table: 'system_users' })
}

/**
 * Activar usuario
 */
export async function activateUser(id: string, updated_by: string) {
  return executeWithErrorHandling(async () => {
    const supabase = (await createClient()) as any

    // Activar usuario
    const { data: activatedUser, error } = await supabase
      .from('system_users')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select('*, auth_user_id')
      .single()

    if (error) throw error
    
    // Invalidad caché tras activar usando auth_user_id
    if (activatedUser && (activatedUser as any).auth_user_id) {
      await invalidateUserProfileCache((activatedUser as any).auth_user_id);
    }
    
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
    const supabase = (await createClient()) as any

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
    if (existingUser.role === 'ADMIN' && newRole !== 'ADMIN') {
      const { count: adminCount } = await supabase
        .from('system_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ADMIN')
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
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select('*, auth_user_id')
      .single()

    if (error) throw error
    
    // Invalidad caché tras cambiar rol usando auth_user_id
    if (updatedUser && (updatedUser as any).auth_user_id) {
      await invalidateUserProfileCache((updatedUser as any).auth_user_id);
    }
    
    return updatedUser
  }, { operation: 'changeUserRole', table: 'system_users' })
}

/**
 * Obtener usuarios por rol
 */
export async function getUsersByRole(organizationId: string, role: UserRole) {
  return executeWithErrorHandling(async () => {
    const supabase = (await createClient()) as any
    
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
    const supabase = (await createClient()) as any

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
    const supabase = (await createClient()) as any

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
    const supabase = (await createClient()) as any

    const { data, error } = await supabase
      .from('system_users')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select('*, auth_user_id')
      .single()

    if (error) throw error

    // Invalidad caché tras login usando auth_user_id
    if (data && (data as any).auth_user_id) {
      await invalidateUserProfileCache((data as any).auth_user_id);
    }

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
    const supabase = (await createClient()) as any

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
      ADMIN: 4,
      ASESOR: 3,
      MECANICO: 2
    } as any

    return roleHierarchy[manager.role as UserRole] > roleHierarchy[target.role as UserRole]
  }, { operation: 'canManageUser', table: 'system_users' })
}

