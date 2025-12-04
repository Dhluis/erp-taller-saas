/**
 * Hook personalizado para usar el contexto de autenticación
 * Ahora usa SessionContext unificado para mejor performance
 */

import { useSession, useAuth as useAuthCompat } from '@/lib/context/SessionContext'

// Re-exportar hook de compatibilidad
export { useAuth } from '@/lib/context/SessionContext'

// Hook para obtener el rol del usuario
export function useRole() {
  const { profile } = useAuthCompat()
  return profile?.role || null
}

// Hooks de verificación de roles
export function useIsAdmin() {
  const { profile } = useAuthCompat()
  return profile?.role === 'admin'
}

export function useIsManager() {
  const { profile } = useAuthCompat()
  return profile?.role === 'manager'
}

export function useIsMechanic() {
  const { profile } = useAuthCompat()
  return profile?.role === 'mechanic'
}

export function useIsReceptionist() {
  const { profile } = useAuthCompat()
  return profile?.role === 'receptionist'
}

// Hook para obtener organizationId directamente
export function useOrganizationId() {
  const { organizationId } = useSession()
  return organizationId
}

// Hook adicional para verificar si el usuario está autenticado
export function useIsAuthenticated() {
  const { user, profile } = useAuthCompat()
  return !!(user && profile)
}

// Hook para obtener información completa del usuario
export function useUserData() {
  const { user, profile, workshop, organizationId, isLoading } = useSession()
  
  return {
    isAuthenticated: !!(user && profile),
    isLoading,
    user,
    profile,
    organization: workshop,
    hasOrganization: !!organizationId,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager',
    isMechanic: profile?.role === 'mechanic',
    isReceptionist: profile?.role === 'receptionist',
    organizationId: organizationId || null,
    userId: user?.id || null,
    userEmail: user?.email || null,
    userName: profile?.name || null,
    userRole: profile?.role || null,
  }
}






