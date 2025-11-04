/**
 * Hook personalizado para usar el contexto de autenticación
 * Re-exporta las funciones del AuthContext para mayor comodidad
 */

import { useAuth as useAuthContext } from '@/contexts/AuthContext'

export { 
  useAuth, 
  useRole, 
  useIsAdmin, 
  useIsManager,
  useIsMechanic, 
  useIsReceptionist, 
  useOrganizationId 
} from '@/contexts/AuthContext'

// Hook adicional para verificar si el usuario está autenticado
export function useIsAuthenticated() {
  const { user, profile } = useAuthContext()
  return !!(user && profile)
}

// Hook para obtener información completa del usuario
export function useUserData() {
  const { user, profile, organization, loading } = useAuthContext()
  
  return {
    isAuthenticated: !!(user && profile),
    isLoading: loading,
    user,
    profile,
    organization,
    hasOrganization: !!organization,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager',
    isMechanic: profile?.role === 'mechanic',
    isReceptionist: profile?.role === 'receptionist',
    organizationId: profile?.organization_id || null,
    userId: user?.id || null,
    userEmail: user?.email || null,
    userName: profile?.name || null,
    userRole: profile?.role || null,
  }
}






