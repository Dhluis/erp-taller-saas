/**
 * =====================================================
 * SISTEMA DE PERMISOS Y AUTORIZACIÓN
 * =====================================================
 * Sistema completo de permisos basado en roles
 * para el ERP de taller automotriz
 */

export type UserRole = 'ADMIN' | 'ASESOR' | 'MECANICO'
export type Resource = 'customers' | 'quotations' | 'invoices' | 'reports' | 'suppliers' | 'settings' | 'vehicles' | 'inventory' | 'work_orders' | 'purchase_orders' | 'payments' | 'employees' | 'users' | 'whatsapp'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'pay' | 'convert' | 'receive' | 'cancel' | 'adjust'

/**
 * Jerarquía de roles (de mayor a menor privilegio)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,      // Acceso total
  ASESOR: 2,    // Gestión de clientes y órdenes
  MECANICO: 1,   // Solo órdenes asignadas
}

/**
 * Nombres legibles de roles
 */
export const ROLE_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  ASESOR: 'Asesor',
  MECANICO: 'Mecánico',
}

/**
 * Definir permisos por rol
 * 
 * Matriz de permisos para los 3 roles del sistema:
 * - ADMIN: Administrador/Dueño (acceso total)
 * - ASESOR: Asesor/Recepcionista (gestión de clientes y órdenes)
 * - MECANICO: Mecánico (solo órdenes asignadas)
 */
export const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  ADMIN: {
    customers: ['create', 'read', 'update', 'delete'],
    vehicles: ['create', 'read', 'update', 'delete'],
    quotations: ['create', 'read', 'update', 'delete', 'approve'],
    work_orders: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete', 'pay'],
    payments: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
    suppliers: ['create', 'read', 'update', 'delete'],
    purchase_orders: ['create', 'read', 'update', 'delete', 'approve'],
    inventory: ['create', 'read', 'update', 'delete', 'adjust'],
    employees: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update'],
    whatsapp: ['create', 'read', 'update', 'delete']
  },
  ASESOR: {
    customers: ['create', 'read', 'update', 'delete'],
    vehicles: ['create', 'read', 'update', 'delete'],
    quotations: ['create', 'read', 'update'],
    work_orders: ['create', 'read', 'update', 'delete'],
    invoices: [], // ✅ QUITADO: ASESOR no debe ver facturas/ingresos
    payments: [], // ✅ QUITADO: ASESOR no debe ver pagos/cobros
    reports: [], // ✅ QUITADO: ASESOR no debe ver reportes financieros
    suppliers: [],
    purchase_orders: [],
    inventory: ['read', 'update'],
    employees: ['read'],
    users: [],
    settings: [],
    whatsapp: ['read', 'update']
  },
  MECANICO: {
    customers: [], // No acceso directo - solo a través de órdenes asignadas
    vehicles: [], // No acceso directo - solo a través de órdenes asignadas
    quotations: [], // No necesita ver cotizaciones
    work_orders: ['read', 'update'], // Solo órdenes asignadas (validado en canAccessWorkOrder)
    invoices: [],
    payments: [],
    reports: [],
    suppliers: [],
    purchase_orders: [],
    inventory: [], // No acceso directo - solo a través de órdenes asignadas
    employees: [],
    users: [],
    settings: [],
    whatsapp: []
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
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

/**
 * Obtener roles inferiores a un rol dado
 */
export function getInferiorRoles(userRole: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[userRole]
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([role, _]) => role as UserRole)
}

/**
 * Verificar si un usuario puede gestionar otros usuarios
 */
export function canManageUsers(userRole: UserRole): boolean {
  return userRole === 'ADMIN'
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
    case 'ADMIN':
      return 'full'
    case 'ASESOR':
      return 'limited'
    case 'MECANICO':
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

/**
 * Valida si un mecánico puede acceder a una orden específica
 * 
 * @param userId - ID del usuario
 * @param workOrderId - ID de la orden de trabajo
 * @param role - Rol del usuario
 * @param supabaseClient - Cliente de Supabase (opcional, se crea si no se proporciona)
 * @returns true si puede acceder, false en caso contrario
 */
export async function canAccessWorkOrder(
  userId: string,
  workOrderId: string,
  role: UserRole,
  supabaseClient: any // Requerido explícitamente para evitar imports del servidor
): Promise<boolean> {
  // Admin y asesor pueden acceder a todas
  if (role === 'ADMIN' || role === 'ASESOR') {
    return true
  }
  
  // Mecánico: solo órdenes asignadas a él
  if (role === 'MECANICO' && supabaseClient) {
    
    // Obtener la orden
    const { data: workOrder, error: workOrderError } = await supabaseClient
      .from('work_orders')
      .select('assigned_to')
      .eq('id', workOrderId)
      .single()
    
    if (workOrderError || !workOrder || !workOrder.assigned_to) {
      return false
    }
    
    // Verificar si está asignada a este empleado
    // Nota: La tabla employees NO tiene user_id, se relaciona por email
    // Necesitamos obtener el email del usuario desde auth.users
    try {
      // Obtener email del usuario desde auth.users usando Service Role
      const { data: authUser, error: authUserError } = await supabaseClient.auth.admin.getUserById(userId);
      
      if (authUserError || !authUser?.user?.email) {
        return false;
      }
      
      // Buscar employee por email
      const { data: employee, error: employeeError } = await supabaseClient
        .from('employees')
        .select('id')
        .eq('email', authUser.user.email)
        .maybeSingle();
      
      if (employeeError || !employee) {
        return false;
      }
      
      return workOrder.assigned_to === employee.id;
    } catch (error) {
      console.error('[canAccessWorkOrder] Error verificando acceso:', error);
      return false;
    }
  }
  
  return false
}

/**
 * Valida si puede ver reportes financieros
 * Solo el administrador puede ver reportes con información financiera
 * 
 * @param role - Rol del usuario
 * @returns true si puede ver reportes financieros
 */
export function canViewFinancialReports(role: UserRole): boolean {
  return role === 'ADMIN' // Solo admin ve reportes con dinero
}

