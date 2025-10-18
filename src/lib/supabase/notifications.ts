/**
 * Servicio de Notificaciones
 * Funciones para manejar notificaciones del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Notification, NotificationInsert, NotificationUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Notification
export type { Notification }

export interface NotificationStats {
  total: number
  unread: number
  byType: {
    info: number
    success: number
    warning: number
    error: number
  }
}

/**
 * Obtener notificaciones del usuario
 */
export async function getNotifications(limit: number = 20): Promise<Notification[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getNotifications',
      table: 'notifications'
    }
  )
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`)
      }
    },
    {
      operation: 'markNotificationAsRead',
      table: 'notifications'
    }
  )
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
      
      if (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`)
      }
    },
    {
      operation: 'markAllNotificationsAsRead',
      table: 'notifications'
    }
  )
}

/**
 * Obtener estadísticas de notificaciones
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('notifications')
        .select('type, read')
      
      if (error) {
        throw new Error(`Failed to fetch notification stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const unread = data?.filter(n => !n.read).length || 0
      
      const byType = {
        info: data?.filter(n => n.type === 'info').length || 0,
        success: data?.filter(n => n.type === 'success').length || 0,
        warning: data?.filter(n => n.type === 'warning').length || 0,
        error: data?.filter(n => n.type === 'error').length || 0
      }
      
      return {
        total,
        unread,
        byType
      }
    },
    {
      operation: 'getNotificationStats',
      table: 'notifications'
    }
  )
}

/**
 * Crear notificación
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('notifications')
        .insert({
          ...notification,
          read: false
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createNotification',
      table: 'notifications'
    }
  )
}

/**
 * Obtener notificaciones no leídas
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  return executeWithErrorHandling(
    async () => {
      console.log('🔔 getUnreadNotifications - Obteniendo de la base de datos...')
      
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('❌ Error obteniendo notificaciones no leídas:', error)
        throw new Error(`Failed to fetch unread notifications: ${error.message}`)
      }
      
      console.log(`✅ ${data?.length || 0} notificaciones no leídas encontradas`)
      return data || []
    },
    {
      operation: 'getUnreadNotifications',
      table: 'notifications'
    }
  )
}

/**
 * Obtener todas las notificaciones
 */
export async function getAllNotifications(limit: number = 20): Promise<Notification[]> {
  return executeWithErrorHandling(
    async () => {
      console.log('🔔 getAllNotifications - Obteniendo de la base de datos...')
      
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('❌ Error obteniendo todas las notificaciones:', error)
        throw new Error(`Failed to fetch all notifications: ${error.message}`)
      }
      
      console.log(`✅ ${data?.length || 0} notificaciones obtenidas`)
      return data || []
    },
    {
      operation: 'getAllNotifications',
      table: 'notifications'
    }
  )
}

/**
 * Suscribirse a notificaciones en tiempo real
 */
export function subscribeToNotifications(callback: (payload: any) => void) {
  const client = getSupabaseClient()
  
  const subscription = client
    .channel('notifications')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications' 
      }, 
      callback
    )
    .subscribe()
  
  return subscription
}
