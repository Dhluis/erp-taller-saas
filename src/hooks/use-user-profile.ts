/**
 * Hook personalizado para manejar el perfil de usuario
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/context/SessionContext'
import {
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

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al actualizar perfil')
      }

      const json = await res.json()
      if (json.profile && profile) {
        setProfile({ ...profile, ...json.profile })
      }
      return json.profile
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

      if (!profile?.id) throw new Error('Perfil no cargado')
      const publicUrl = await uploadUserAvatar(file, profile.id)

      // Persistir la URL en la DB
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl })
      })

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
      return publicUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el avatar'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [profile])

  const removeAvatar = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)

      if (profile?.avatar_url) {
        await deleteUserAvatar(profile.avatar_url)
      }

      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: null })
      })

      setProfile(prev => prev ? { ...prev, avatar_url: undefined } : prev)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el avatar'
      setError(errorMessage)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [profile])

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
