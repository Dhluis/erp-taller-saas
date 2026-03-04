/**
 * Servicio de Perfil de Usuario
 * Funciones para manejar la información del perfil del usuario
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  address?: string
  avatar_url?: string
  organization_id?: string
  organization_name?: string
  role?: string
  created_at: string
  updated_at: string
}

export interface UpdateProfileData {
  full_name?: string
  phone?: string
  address?: string
  avatar_url?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

/**
 * Obtener perfil del usuario actual
 * NOTA: Esta función está deprecada. Usar el hook useUserProfile() en su lugar.
 */
export async function getUserProfile(): Promise<UserProfile> {
  console.warn('⚠️ getUserProfile() está deprecada. Usar useUserProfile() hook en su lugar.')
  return executeWithErrorHandling(
    async () => {
      console.log('👤 getUserProfile - Obteniendo perfil del usuario...')
      
      // Esta función solo se mantiene por compatibilidad
      // Los componentes deben usar useUserProfile() hook
      throw new Error('Usar useUserProfile() hook en lugar de getUserProfile()')
    },
    {
      operation: 'getUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * Actualizar perfil del usuario
 * NOTA: Esta función está deprecada. La actualización debe hacerse via SessionContext.
 */
export async function updateUserProfile(profileData: UpdateProfileData): Promise<UserProfile> {
  console.warn('⚠️ updateUserProfile() está deprecada.')
  return executeWithErrorHandling(
    async () => {
      console.log('👤 updateUserProfile - Actualizando perfil con datos:', profileData)
      
      // Validaciones básicas
      if (profileData.full_name && !profileData.full_name.trim()) {
        throw new Error('El nombre completo no puede estar vacío')
      }
      
      if (profileData.phone && profileData.phone.length < 10) {
        throw new Error('El número de teléfono debe tener al menos 10 dígitos')
      }
      
      throw new Error('Función deprecada - implementar actualización vía Supabase')
    },
    {
      operation: 'updateUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * Cambiar contraseña del usuario
 */
export async function changeUserPassword(passwordData: ChangePasswordData): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      console.log('🔐 changeUserPassword - Cambiando contraseña...')
      
      // Validaciones de contraseña
      if (!passwordData.currentPassword) {
        throw new Error('La contraseña actual es requerida')
      }
      
      if (!passwordData.newPassword) {
        throw new Error('La nueva contraseña es requerida')
      }
      
      if (passwordData.newPassword.length < 8) {
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres')
      }
      
      // Verificar que la nueva contraseña sea diferente a la actual
      if (passwordData.currentPassword === passwordData.newPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual')
      }
      
      const supabase = getSupabaseClient()
      const newPassword = passwordData.newPassword
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        throw new Error('Error al cambiar la contraseña: ' + error.message)
      }

      console.log('✅ Contraseña cambiada exitosamente')
    },
    {
      operation: 'changeUserPassword',
      table: 'auth.users'
    }
  )
}

/**
 * Subir avatar del usuario
 * @returns URL pública del avatar subido
 */
export async function uploadUserAvatar(file: File, userId: string): Promise<string> {
  return executeWithErrorHandling(
    async () => {
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen')
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('El archivo no puede ser mayor a 5MB')
      }

      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw new Error('Error al subir imagen: ' + uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      return publicUrlData.publicUrl
    },
    { operation: 'uploadUserAvatar', table: 'storage.avatars' }
  )
}

/**
 * Eliminar avatar del usuario desde Supabase Storage
 */
export async function deleteUserAvatar(avatarUrl: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const supabase = getSupabaseClient()
      // Extraer el path del bucket desde la URL pública
      const match = avatarUrl.match(/avatars\/(.+)$/)
      if (!match) return
      const path = match[1]
      const { error } = await supabase.storage.from('avatars').remove([path])
      if (error) throw new Error('Error al eliminar avatar: ' + error.message)
    },
    { operation: 'deleteUserAvatar', table: 'storage.avatars' }
  )
}

/**
 * Obtener configuración de seguridad del usuario
 */
export async function getUserSecuritySettings(): Promise<{
  twoFactorEnabled: boolean
  activeSessions: Array<{
    id: string
    device: string
    location: string
    lastActive: string
  }>
}> {
  return executeWithErrorHandling(
    async () => {
      console.log('🔒 getUserSecuritySettings - Obteniendo configuración de seguridad...')
      
      const securitySettings = {
        twoFactorEnabled: false,
        activeSessions: [] // ✅ Sin datos mock - se implementará cuando se agregue la funcionalidad
      }
      
      console.log('✅ Configuración de seguridad obtenida:', securitySettings)
      return securitySettings
    },
    {
      operation: 'getUserSecuritySettings',
      table: 'user_security_settings'
    }
  )
}
