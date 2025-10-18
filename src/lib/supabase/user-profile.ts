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
 */
export async function getUserProfile(): Promise<UserProfile> {
  return executeWithErrorHandling(
    async () => {
      console.log('👤 getUserProfile - Obteniendo perfil del usuario...')
      
      // TEMPORAL: Usar datos mock hasta que se implemente la integración con Supabase Auth
      const mockProfile: UserProfile = {
        id: 'user-001',
        email: 'admin@eagles.com',
        full_name: 'Admin Usuario',
        phone: '+1 234 567 8900',
        address: 'Calle Principal 123, Ciudad, País',
        avatar_url: '',
        organization_id: '042ab6bd-8979-4166-882a-c244b5e51e51',
        organization_name: 'EAGLES ERP Taller SaaS',
        role: 'Administrador',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString()
      }
      
      console.log('✅ Perfil de usuario obtenido:', mockProfile)
      return mockProfile
    },
    {
      operation: 'getUserProfile',
      table: 'user_profiles'
    }
  )
}

/**
 * Actualizar perfil del usuario
 */
export async function updateUserProfile(profileData: UpdateProfileData): Promise<UserProfile> {
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
      
      // TEMPORAL: Simular actualización del perfil
      const updatedProfile: UserProfile = {
        id: 'user-001',
        email: 'admin@eagles.com',
        full_name: profileData.full_name || 'Admin Usuario',
        phone: profileData.phone || '+1 234 567 8900',
        address: profileData.address || 'Calle Principal 123, Ciudad, País',
        avatar_url: profileData.avatar_url || '',
        organization_id: '042ab6bd-8979-4166-882a-c244b5e51e51',
        organization_name: 'EAGLES ERP Taller SaaS',
        role: 'Administrador',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString()
      }
      
      console.log('✅ Perfil actualizado exitosamente:', updatedProfile)
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return updatedProfile
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
      
      // TEMPORAL: Simular cambio de contraseña exitoso
      console.log('✅ Contraseña cambiada exitosamente')
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 800))
    },
    {
      operation: 'changeUserPassword',
      table: 'auth.users'
    }
  )
}

/**
 * Subir avatar del usuario
 */
export async function uploadUserAvatar(file: File): Promise<string> {
  return executeWithErrorHandling(
    async () => {
      console.log('📸 uploadUserAvatar - Subiendo avatar:', file.name)
      
      // Validaciones del archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen')
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('El archivo no puede ser mayor a 5MB')
      }
      
      // TEMPORAL: Simular subida de avatar
      const mockAvatarUrl = `https://example.com/avatars/user-001-${Date.now()}.jpg`
      
      console.log('✅ Avatar subido exitosamente:', mockAvatarUrl)
      
      // Simular delay de subida
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return mockAvatarUrl
    },
    {
      operation: 'uploadUserAvatar',
      table: 'storage.avatars'
    }
  )
}

/**
 * Eliminar avatar del usuario
 */
export async function deleteUserAvatar(): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      console.log('🗑️ deleteUserAvatar - Eliminando avatar...')
      
      // TEMPORAL: Simular eliminación de avatar
      console.log('✅ Avatar eliminado exitosamente')
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300))
    },
    {
      operation: 'deleteUserAvatar',
      table: 'storage.avatars'
    }
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
      
      // TEMPORAL: Datos mock de configuración de seguridad
      const securitySettings = {
        twoFactorEnabled: false,
        activeSessions: [
          {
            id: 'session-1',
            device: 'Chrome en Windows',
            location: 'Ciudad de México, México',
            lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutos atrás
          },
          {
            id: 'session-2',
            device: 'Safari en iPhone',
            location: 'Ciudad de México, México',
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
          }
        ]
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
