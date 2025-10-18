/**
 * Hook personalizado para manejar el perfil de usuario
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  getUserProfile, 
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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const userProfile = await getUserProfile()
      setProfile(userProfile)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el perfil'
      setError(errorMessage)
      console.error('Error loading user profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (profileData: UpdateProfileData) => {
    try {
      setIsSaving(true)
      setError(null)
      const updatedProfile = await updateUserProfile(profileData)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el perfil'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

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
      const avatarUrl = await uploadUserAvatar(file)
      if (profile) {
        const updatedProfile = await updateUserProfile({ avatar_url: avatarUrl })
        setProfile(updatedProfile)
      }
      return avatarUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el avatar'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [profile, updateProfile])

  const removeAvatar = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)
      await deleteUserAvatar()
      if (profile) {
        const updatedProfile = await updateUserProfile({ avatar_url: '' })
        setProfile(updatedProfile)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el avatar'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [profile, updateProfile])

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

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
