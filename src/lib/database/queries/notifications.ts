import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'
import { NotificationType, NotificationPriority } from '@/lib/notifications/service'

/**
 * =====================================================
 * QUERIES PARA GESTIÓN DE NOTIFICACIONES
 * =====================================================
 * Sistema completo de consultas para notificaciones
 * del ERP
 */

export interface Notification {
  id: string
  organization_id: string
  user_id?: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  is_read: boolean
  metadata?: Record<string, any>
  created_at: string
  read_at?: string
}

/**
 * Obtener todas las notificaciones de una organización
 */
export async function getAllNotifications(
  organizationId: string,
  filters?: {
    user_id?: string
    type?: NotificationType
    priority?: NotificationPriority
    is_read?: boolean
    search?: string
    page?: number
    limit?: number
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read)
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,` +
        `message.ilike.%${filters.search}%`
      )
    }

    // Paginación
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }, { operation: 'getAllNotifications', table: 'notifications' })
}

/**
 * Obtener notificación por ID
 */
export async function getNotificationById(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getNotificationById', table: 'notifications' })
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }, { operation: 'markNotificationAsRead', table: 'notifications' })
}

/**
 * Marcar múltiples notificaciones como leídas
 */
export async function markNotificationsAsRead(ids: string[]) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', ids)
      .select()

    if (error) throw error
    return data
  }, { operation: 'markNotificationsAsRead', table: 'notifications' })
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(organizationId: string, userId?: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('is_read', false)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.select()

    if (error) throw error
    return data
  }, { operation: 'markAllNotificationsAsRead', table: 'notifications' })
}

/**
 * Eliminar notificación
 */
export async function deleteNotification(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }, { operation: 'deleteNotification', table: 'notifications' })
}

/**
 * Eliminar múltiples notificaciones
 */
export async function deleteNotifications(ids: string[]) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids)
      .select()

    if (error) throw error
    return data
  }, { operation: 'deleteNotifications', table: 'notifications' })
}

/**
 * Eliminar notificaciones leídas antiguas
 */
export async function deleteOldReadNotifications(organizationId: string, daysOld: number = 30) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    const cutoffDateString = cutoffDate.toISOString()

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('organization_id', organizationId)
      .eq('is_read', true)
      .lt('read_at', cutoffDateString)
      .select()

    if (error) throw error
    return data
  }, { operation: 'deleteOldReadNotifications', table: 'notifications' })
}

/**
 * Obtener notificaciones no leídas
 */
export async function getUnreadNotifications(organizationId: string, userId?: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }, { operation: 'getUnreadNotifications', table: 'notifications' })
}

/**
 * Obtener notificaciones por tipo
 */
export async function getNotificationsByType(
  organizationId: string,
  type: NotificationType,
  limit: number = 20
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }, { operation: 'getNotificationsByType', table: 'notifications' })
}

/**
 * Obtener notificaciones por prioridad
 */
export async function getNotificationsByPriority(
  organizationId: string,
  priority: NotificationPriority,
  limit: number = 20
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('priority', priority)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }, { operation: 'getNotificationsByPriority', table: 'notifications' })
}

/**
 * Obtener estadísticas de notificaciones
 */
export async function getNotificationStats(organizationId: string, userId?: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Total notificaciones
    const { count: totalNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Notificaciones no leídas
    const { count: unreadNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_read', false)

    // Notificaciones por tipo
    const { data: typeStats } = await supabase
      .from('notifications')
      .select('type')
      .eq('organization_id', organizationId)

    const typeCounts = typeStats?.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Notificaciones por prioridad
    const { data: priorityStats } = await supabase
      .from('notifications')
      .select('priority')
      .eq('organization_id', organizationId)

    const priorityCounts = priorityStats?.reduce((acc, notification) => {
      acc[notification.priority] = (acc[notification.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Notificaciones recientes (últimos 7 días)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const startDate = sevenDaysAgo.toISOString().split('T')[0]

    const { count: recentNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)

    return {
      total_notifications: totalNotifications || 0,
      unread_notifications: unreadNotifications || 0,
      read_notifications: (totalNotifications || 0) - (unreadNotifications || 0),
      recent_notifications: recentNotifications || 0,
      type_breakdown: typeCounts,
      priority_breakdown: priorityCounts
    }
  }, { operation: 'getNotificationStats', table: 'notifications' })
}

/**
 * Buscar notificaciones
 */
export async function searchNotifications(
  organizationId: string,
  query: string,
  limit: number = 20
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(
        `title.ilike.%${query}%,` +
        `message.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }, { operation: 'searchNotifications', table: 'notifications' })
}

/**
 * Obtener notificaciones urgentes
 */
export async function getUrgentNotifications(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('priority', 'urgent')
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }, { operation: 'getUrgentNotifications', table: 'notifications' })
}

