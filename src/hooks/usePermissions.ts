'use client'

import { useSession } from '@/lib/context/SessionContext'
import { 
  hasPermission, 
  canViewFinancialReports, 
  UserRole, 
  Resource, 
  Action 
} from '@/lib/auth/permissions'

/**
 * Hook personalizado para verificar permisos basados en el rol del usuario
 */
export function usePermissions() {
  const { profile } = useSession()
  const role = (profile?.role || null) as UserRole | null

  return {
    role,
    isAdmin: role === 'admin',
    isAdvisor: role === 'advisor',
    isMechanic: role === 'mechanic',
    
    // Verificar permisos específicos
    canCreate: (resource: Resource) => {
      if (!role) return false
      return hasPermission(role, resource, 'create')
    },
    
    canRead: (resource: Resource) => {
      if (!role) return false
      return hasPermission(role, resource, 'read')
    },
    
    canUpdate: (resource: Resource) => {
      if (!role) return false
      return hasPermission(role, resource, 'update')
    },
    
    canDelete: (resource: Resource) => {
      if (!role) return false
      return hasPermission(role, resource, 'delete')
    },
    
    // Permisos específicos
    canPayInvoices: () => {
      if (!role) return false
      return hasPermission(role, 'invoices', 'pay')
    },
    
    canViewFinancialReports: () => {
      if (!role) return false
      return canViewFinancialReports(role)
    },
    
    // Verificar permiso genérico
    hasPermission: (resource: Resource, action: Action) => {
      if (!role) return false
      return hasPermission(role, resource, action)
    },
    
    // Helpers para recursos específicos
    canManageUsers: () => {
      if (!role) return false
      return hasPermission(role, 'users', 'create')
    },
    
    canManageSuppliers: () => {
      if (!role) return false
      return hasPermission(role, 'suppliers', 'create')
    },
    
    canManagePurchases: () => {
      if (!role) return false
      return hasPermission(role, 'purchase_orders', 'create')
    },
    
    canManageSettings: () => {
      if (!role) return false
      return hasPermission(role, 'settings', 'update')
    },
    
    canManageWhatsApp: () => {
      if (!role) return false
      return hasPermission(role, 'whatsapp', 'create')
    },
    
    canViewWhatsApp: () => {
      if (!role) return false
      return hasPermission(role, 'whatsapp', 'read')
    },
  }
}

