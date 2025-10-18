/**
 * Funciones client-side para gestión de notificaciones
 */

import { createClient } from './client'

export interface Notification {
  id: string
  organization_id: string
  user_id: string | null
  type: 'info' | 'warning' | 'success' | 'error' | 'stock_low' | 'order_completed' | 'quotation_created'
  title: string
  message: string
  read: boolean
  created_at: string
  updated_at: string
}

/**
 * Obtener todas las notificaciones del usuario actual
 */
export async function getAllNotifications(): Promise<Notification[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`) // Usuario específico o notificaciones generales
    .order('created_at', { ascending: false })
    .limit(50) // Limitar a las últimas 50

  if (error) {
    console.error('Error obteniendo notificaciones:', error)
    throw error
  }

  return data || []
}

/**
 * Obtener solo notificaciones no leídas
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('read', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo notificaciones no leídas:', error)
    throw error
  }

  return data || []
}

/**
 * Marcar una notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ 
      read: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marcando notificación como leída:', error)
    throw error
  }
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const { error } = await supabase
    .from('notifications')
    .update({ 
      read: true,
      updated_at: new Date().toISOString()
    })
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('read', false)

  if (error) {
    console.error('Error marcando todas como leídas:', error)
    throw error
  }
}

/**
 * Eliminar una notificación
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('Error eliminando notificación:', error)
    throw error
  }
}

/**
 * Obtener el conteo de notificaciones no leídas
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return 0
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('read', false)

  if (error) {
    console.error('Error obteniendo contador:', error)
    return 0
  }

  return count || 0
}
