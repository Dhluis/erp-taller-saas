import { createClient } from '@/lib/supabase/server'
import { hasPermission, UserRole, Resource, Action } from './permissions'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * FUNCIONES DE VALIDACIÓN DE ACCESO Y AUTENTICACIÓN
 * =====================================================
 * Sistema optimizado de validación de permisos
 * y autenticación de usuarios
 */

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  organization_id: string
  name?: string
  is_active: boolean
}

/**
 * Validar acceso de un usuario a un recurso y acción específica
 */
export async function validateAccess(
  userId: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener usuario y rol de system_users
    const { data: user, error } = await supabase
      .from('system_users')
      .select('id, role, is_active')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return false
    }

    // Verificar que el usuario esté activo
    if (!user.is_active) {
      return false
    }

    // 2. Verificar permisos según PERMISSIONS
    const hasAccess = hasPermission(user.role as UserRole, resource, action)

    // 3. Retornar true/false
    return hasAccess
  }, { operation: 'validateAccess', table: 'system_users' })
}

/**
 * Requerir autenticación y obtener usuario autenticado
 */
export async function requireAuth(req: Request): Promise<AuthenticatedUser> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Verificar token JWT de Supabase
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autorización requerido')
    }

    const token = authHeader.substring(7) // Remover "Bearer "

    // Verificar el token con Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authUser) {
      throw new Error('Token inválido o expirado')
    }

    // 2. Obtener usuario de system_users
    const { data: systemUser, error: userError } = await supabase
      .from('system_users')
      .select('id, email, name, role, organization_id, is_active')
      .eq('email', authUser.email)
      .eq('is_active', true)
      .single()

    if (userError || !systemUser) {
      throw new Error('Usuario no encontrado o inactivo')
    }

    // 3. Retornar usuario autenticado
    return {
      id: systemUser.id,
      email: systemUser.email,
      name: systemUser.name,
      role: systemUser.role as UserRole,
      organization_id: systemUser.organization_id,
      is_active: systemUser.is_active
    }
  }, { operation: 'requireAuth', table: 'system_users' })
}

/**
 * Validar acceso con autenticación completa
 */
export async function validateAccessWithAuth(
  req: Request,
  resource: Resource,
  action: Action
): Promise<AuthenticatedUser> {
  // Obtener usuario autenticado
  const user = await requireAuth(req)

  // Validar permisos
  const hasAccess = await validateAccess(user.id, resource, action)

  if (!hasAccess) {
    throw new Error(`No tienes permisos para ${action} en ${resource}`)
  }

  return user
}

/**
 * Validar acceso a organización específica
 */
export async function validateOrganizationAccess(
  req: Request,
  organizationId: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req)

  if (user.organization_id !== organizationId) {
    throw new Error('No tienes acceso a esta organización')
  }

  return user
}

/**
 * Validar múltiples permisos (todos requeridos)
 */
export async function validateAllPermissions(
  req: Request,
  permissions: Array<{ resource: Resource; action: Action }>
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req)

  for (const { resource, action } of permissions) {
    const hasAccess = await validateAccess(user.id, resource, action)
    if (!hasAccess) {
      throw new Error(`No tienes permisos para ${action} en ${resource}`)
    }
  }

  return user
}

/**
 * Validar múltiples permisos (al menos uno)
 */
export async function validateAnyPermission(
  req: Request,
  permissions: Array<{ resource: Resource; action: Action }>
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req)

  const hasAnyAccess = await Promise.all(
    permissions.map(({ resource, action }) => validateAccess(user.id, resource, action))
  )

  if (!hasAnyAccess.some(access => access)) {
    throw new Error('No tienes ninguno de los permisos requeridos')
  }

  return user
}

/**
 * Validar rol específico
 */
export async function validateRole(
  req: Request,
  allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req)

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Rol ${user.role} no autorizado para esta operación`)
  }

  return user
}

/**
 * Obtener usuario autenticado sin validar permisos
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth(req)
  } catch (error) {
    return null
  }
}

/**
 * Verificar si un usuario puede gestionar otro usuario
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

/**
 * Middleware wrapper para validación de acceso
 */
export function withAccessValidation(
  resource: Resource,
  action: Action,
  handler: (req: Request, user: AuthenticatedUser) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const user = await validateAccessWithAuth(req, resource, action)
      return await handler(req, user)
    } catch (error: any) {
      const status = error.message.includes('Token') || error.message.includes('autenticado') ? 401 : 403
      return new Response(
        JSON.stringify({
          data: null,
          error: error.message || 'Error de autorización'
        }),
        { 
          status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Middleware wrapper para validación de rol
 */
export function withRoleValidation(
  allowedRoles: UserRole[],
  handler: (req: Request, user: AuthenticatedUser) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const user = await validateRole(req, allowedRoles)
      return await handler(req, user)
    } catch (error: any) {
      const status = error.message.includes('Token') || error.message.includes('autenticado') ? 401 : 403
      return new Response(
        JSON.stringify({
          data: null,
          error: error.message || 'Error de autorización'
        }),
        { 
          status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Middleware wrapper para validación de organización
 */
export function withOrganizationValidation(
  handler: (req: Request, user: AuthenticatedUser) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const url = new URL(req.url)
      const organizationId = url.searchParams.get('organization_id')
      
      if (!organizationId) {
        throw new Error('organization_id es requerido')
      }

      const user = await validateOrganizationAccess(req, organizationId)
      return await handler(req, user)
    } catch (error: any) {
      const status = error.message.includes('Token') || error.message.includes('autenticado') ? 401 : 403
      return new Response(
        JSON.stringify({
          data: null,
          error: error.message || 'Error de autorización'
        }),
        { 
          status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

