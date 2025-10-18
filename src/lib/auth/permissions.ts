/**
 * =====================================================
 * SISTEMA DE PERMISOS Y AUTORIZACIÓN
 * =====================================================
 * Sistema completo de permisos basado en roles
 * para el ERP de taller automotriz
 */

export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer'
export type Resource = 'customers' | 'quotations' | 'invoices' | 'reports' | 'suppliers' | 'settings' | 'vehicles' | 'inventory' | 'work_orders' | 'purchase_orders'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'pay' | 'convert' | 'receive' | 'cancel'

/**
 * Definir permisos por rol
 */
export const PERMISSIONS = {
  admin: {
    customers: ['create', 'read', 'update', 'delete'],
    vehicles: ['create', 'read', 'update', 'delete'],
    quotations: ['create', 'read', 'update', 'delete', 'approve', 'convert'],
    work_orders: ['create', 'read', 'update', 'delete', 'approve', 'complete'],
    invoices: ['create', 'read', 'update', 'delete', 'pay', 'cancel'],
    reports: ['read'],
    suppliers: ['create', 'read', 'update', 'delete'],
    purchase_orders: ['create', 'read', 'update', 'delete', 'approve', 'receive', 'cancel'],
    inventory: ['create', 'read', 'update', 'delete', 'adjust'],
    settings: ['read', 'update']
  },
  manager: {
    customers: ['create', 'read', 'update'],
    vehicles: ['create', 'read', 'update'],
    quotations: ['create', 'read', 'update', 'approve', 'convert'],
    work_orders: ['create', 'read', 'update', 'approve', 'complete'],
    invoices: ['create', 'read', 'update', 'pay'],
    reports: ['read'],
    suppliers: ['read'],
    purchase_orders: ['read', 'approve'],
    inventory: ['read', 'adjust'],
    settings: ['read']
  },
  employee: {
    customers: ['create', 'read'],
    vehicles: ['create', 'read'],
    quotations: ['create', 'read'],
    work_orders: ['create', 'read', 'update'],
    invoices: ['read'],
    reports: [],
    suppliers: ['read'],
    purchase_orders: ['read'],
    inventory: ['read'],
    settings: []
  },
  viewer: {
    customers: ['read'],
    vehicles: ['read'],
    quotations: ['read'],
    work_orders: ['read'],
    invoices: ['read'],
    reports: ['read'],
    suppliers: ['read'],
    purchase_orders: ['read'],
    inventory: ['read'],
    settings: []
  }
} as const

/**
 * Verificar si un usuario tiene un permiso específico
 */
export function hasPermission(
  userRole: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = PERMISSIONS[userRole]
  if (!rolePermissions) return false
  
  const resourcePermissions = rolePermissions[resource]
  if (!resourcePermissions) return false
  
  return resourcePermissions.includes(action)
}

/**
 * Obtener todos los permisos de un rol
 */
export function getRolePermissions(userRole: UserRole): Record<string, string[]> {
  return PERMISSIONS[userRole] || {}
}

/**
 * Verificar si un usuario puede acceder a un recurso
 */
export function canAccessResource(
  userRole: UserRole,
  resource: Resource
): boolean {
  const rolePermissions = PERMISSIONS[userRole]
  if (!rolePermissions) return false
  
  return resource in rolePermissions
}

/**
 * Obtener acciones permitidas para un recurso y rol
 */
export function getAllowedActions(
  userRole: UserRole,
  resource: Resource
): Action[] {
  const rolePermissions = PERMISSIONS[userRole]
  if (!rolePermissions) return []
  
  const resourcePermissions = rolePermissions[resource]
  if (!resourcePermissions) return []
  
  return resourcePermissions as Action[]
}

/**
 * Verificar múltiples permisos
 */
export function hasAllPermissions(
  userRole: UserRole,
  permissions: Array<{ resource: Resource; action: Action }>
): boolean {
  return permissions.every(({ resource, action }) =>
    hasPermission(userRole, resource, action)
  )
}

/**
 * Verificar al menos un permiso
 */
export function hasAnyPermission(
  userRole: UserRole,
  permissions: Array<{ resource: Resource; action: Action }>
): boolean {
  return permissions.some(({ resource, action }) =>
    hasPermission(userRole, resource, action)
  )
}

/**
 * Obtener recursos accesibles para un rol
 */
export function getAccessibleResources(userRole: UserRole): Resource[] {
  const rolePermissions = PERMISSIONS[userRole]
  if (!rolePermissions) return []
  
  return Object.keys(rolePermissions) as Resource[]
}

/**
 * Verificar si un rol es superior a otro
 */
export function isRoleSuperior(role1: UserRole, role2: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    employee: 2,
    viewer: 1
  }
  
  return roleHierarchy[role1] > roleHierarchy[role2]
}

/**
 * Obtener roles inferiores a un rol dado
 */
export function getInferiorRoles(userRole: UserRole): UserRole[] {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    employee: 2,
    viewer: 1
  }
  
  const currentLevel = roleHierarchy[userRole]
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level < currentLevel)
    .map(([role, _]) => role as UserRole)
}

/**
 * Verificar si un usuario puede gestionar otros usuarios
 */
export function canManageUsers(userRole: UserRole): boolean {
  return ['admin', 'manager'].includes(userRole)
}

/**
 * Verificar si un usuario puede ver reportes
 */
export function canViewReports(userRole: UserRole): boolean {
  return hasPermission(userRole, 'reports', 'read')
}

/**
 * Verificar si un usuario puede aprobar cotizaciones
 */
export function canApproveQuotations(userRole: UserRole): boolean {
  return hasPermission(userRole, 'quotations', 'approve')
}

/**
 * Verificar si un usuario puede procesar pagos
 */
export function canProcessPayments(userRole: UserRole): boolean {
  return hasPermission(userRole, 'invoices', 'pay')
}

/**
 * Verificar si un usuario puede gestionar inventario
 */
export function canManageInventory(userRole: UserRole): boolean {
  return hasPermission(userRole, 'inventory', 'update')
}

/**
 * Obtener nivel de acceso de un rol
 */
export function getAccessLevel(userRole: UserRole): 'full' | 'limited' | 'readonly' {
  switch (userRole) {
    case 'admin':
      return 'full'
    case 'manager':
      return 'limited'
    case 'employee':
      return 'limited'
    case 'viewer':
      return 'readonly'
    default:
      return 'readonly'
  }
}

/**
 * Verificar si un usuario puede acceder a configuraciones
 */
export function canAccessSettings(userRole: UserRole): boolean {
  return hasPermission(userRole, 'settings', 'read')
}

/**
 * Verificar si un usuario puede modificar configuraciones
 */
export function canModifySettings(userRole: UserRole): boolean {
  return hasPermission(userRole, 'settings', 'update')
}

