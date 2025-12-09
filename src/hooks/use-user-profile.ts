/**
 * Hook personalizado para manejar el perfil de usuario
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/context/SessionContext'
import { 
  updateUserProfile, 
  changeUserPassword,
  uploadUserAvatar,
  deleteUserAvatar,
  getUserSecuritySettings,
  type UserProfile,
  type UpdateProfileData,
  type ChangePasswordData
} from '@/lib/supabase/user-profile'

export function useUserProfile() {
  const { profile: sessionProfile, isLoading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sincronizar con el perfil de SessionContext
  useEffect(() => {
    // ✅ FIX Bug 1: Manejar tanto el caso truthy como falsy
    if (sessionProfile) {
      setProfile({
        id: sessionProfile.id,
        email: sessionProfile.email,
        full_name: sessionProfile.full_name,
        phone: sessionProfile.phone,
        address: sessionProfile.address,
        avatar_url: sessionProfile.avatar_url,
        organization_id: sessionProfile.organization_id,
        organization_name: sessionProfile.organization_name,
        role: sessionProfile.role,
        created_at: sessionProfile.created_at,
        updated_at: sessionProfile.updated_at
      })
    } else {
      setProfile(null)
    }
    
    // Sincronizar isLoading con SessionContext
    // Solo establecer isLoading = false cuando SessionContext termine de cargar
    if (!sessionLoading) {
      setIsLoading(false)
    }
  }, [sessionProfile, sessionLoading])

  const loadProfile = useCallback(async () => {
    // No hacer nada - el perfil viene de SessionContext
    console.log('✅ useUserProfile - Perfil sincronizado desde SessionContext')
  }, [])

  const updateProfile = useCallback(async (profileData: UpdateProfileData) => {
    try {
      setIsSaving(true)
      setError(null)
      
      // ✅ FIX: updateUserProfile está deprecada - actualizar vía Supabase directamente
      // TODO: Implementar actualización real cuando sea necesario
      console.warn('⚠️ updateProfile - Funcionalidad no implementada aún')
      
      // Por ahora, solo actualizar estado local (no persistir en DB)
      if (profile) {
        const updatedProfile = {
          ...profile,
          ...profileData,
          updated_at: new Date().toISOString()
        }
        setProfile(updatedProfile)
        console.log('✅ Perfil actualizado localmente (no persistido en DB)')
        return updatedProfile
      }
      throw new Error('No hay perfil cargado para actualizar')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el perfil'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [profile])

  const changePassword = useCallback(async (passwordData: ChangePasswordData) => {
    try {
      setIsSaving(true)
      setError(null)
      await changeUserPassword(passwordData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar la contraseña'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      setIsSaving(true)
      setError(null)
      
      // ✅ FIX Bug 2: uploadUserAvatar está deprecada y lanza error
      // TODO: Implementar subida real a Supabase Storage cuando sea necesario
      console.warn('⚠️ uploadAvatar - Funcionalidad no implementada aún')
      throw new Error('La subida de avatar aún no está implementada. Por favor, contacta al administrador.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el avatar'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  const removeAvatar = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      // ✅ FIX Bug 2: deleteUserAvatar y updateUserProfile están deprecadas
      // TODO: Implementar eliminación real cuando sea necesario
      console.warn('⚠️ removeAvatar - Funcionalidad no implementada aún')
      throw new Error('La eliminación de avatar aún no está implementada. Por favor, contacta al administrador.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el avatar'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [])

  // NO llamar loadProfile automáticamente - el perfil viene de SessionContext
  // useEffect vacío removido

  return {
    profile,
    isLoading,
    isSaving,
    error,
    loadProfile,
    updateProfile,
    changePassword,
    uploadAvatar,
    removeAvatar,
    getInitials
  }
}

export function useSecuritySettings() {
  const [securitySettings, setSecuritySettings] = useState<{
    twoFactorEnabled: boolean
    activeSessions: Array<{
      id: string
      device: string
      location: string
      lastActive: string
    }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSecuritySettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const settings = await getUserSecuritySettings()
      setSecuritySettings(settings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar la configuración de seguridad'
      setError(errorMessage)
      console.error('Error loading security settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSecuritySettings()
  }, [loadSecuritySettings])

  return {
    securitySettings,
    isLoading,
    error,
    loadSecuritySettings
  }
}
