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
  read?: boolean
  is_read?: boolean
  created_at: string
  updated_at: string
}

/**
 * Obtener organization_id del usuario actual
 */
async function getUserOrganizationId(): Promise<string> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  // Intentar obtener desde user_metadata
  if (user.user_metadata?.organization_id) {
    return user.user_metadata.organization_id
  }

  // Si no está en metadata, obtener organization_id directamente del perfil
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('organization_id, workshop_id')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError) {
    console.warn('No se pudo obtener organization_id, usando fallback', profileError)
    return '00000000-0000-0000-0000-000000000001'
  }

  // ✅ organization_id está directamente en el perfil del usuario
  if (profile?.organization_id) {
    return profile.organization_id
  }

  // Fallback: intentar obtener desde workshop si existe workshop_id
  if (profile?.workshop_id) {
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('organization_id')
      .eq('id', profile.workshop_id)
      .single()

    if (!workshopError && workshop?.organization_id) {
      return workshop.organization_id
    }
  }

  console.warn('No se pudo obtener organization_id, usando fallback')
  return '00000000-0000-0000-0000-000000000001'
}

/**
 * Obtener todas las notificaciones del usuario actual
 */
export async function getAllNotifications(): Promise<Notification[]> {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('Usuario no autenticado')
      return []
    }

    // Obtener organization_id
    const organizationId = await getUserOrganizationId()

    // Construir query con filtros correctos
    // Filtrar por usuario o notificaciones generales (user_id null)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error obteniendo notificaciones:', error)
      // Si hay error, retornar array vacío en lugar de lanzar excepción
      return []
    }

    // Normalizar campo read/is_read
    const normalized = (data || []).map((n: any) => ({
      ...n,
      read: n.read !== undefined ? n.read : n.is_read || false,
      is_read: n.is_read !== undefined ? n.is_read : n.read || false
    }))

    return normalized
  } catch (error) {
    console.error('Error en getAllNotifications:', error)
    return []
  }
}

/**
 * Obtener solo notificaciones no leídas
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('Usuario no autenticado')
      return []
    }

    // Obtener organization_id
    const organizationId = await getUserOrganizationId()

    // Obtener todas las notificaciones y filtrar en memoria
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error obteniendo notificaciones no leídas:', error)
      return []
    }

    // Normalizar y filtrar solo las no leídas
    const normalized = (data || []).map((n: any) => ({
      ...n,
      read: n.read !== undefined ? n.read : (n.is_read !== undefined ? n.is_read : false),
      is_read: n.is_read !== undefined ? n.is_read : (n.read !== undefined ? n.read : false)
    }))

    // Filtrar solo las no leídas
    return normalized.filter(n => {
      const isRead = n.read !== undefined ? n.read : (n.is_read !== undefined ? n.is_read : false)
      return !isRead
    })
  } catch (error) {
    console.error('Error en getUnreadNotifications:', error)
    return []
  }
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
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener organization_id
    const organizationId = await getUserOrganizationId()

    // Actualizar con ambos campos por compatibilidad
    const updateData: any = {
      updated_at: new Date().toISOString(),
      read: true,
      is_read: true
    }
    
    // Obtener IDs de notificaciones no leídas primero
    const { data: unreadNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${user.id},user_id.is.null`)
    
    if (!unreadNotifications || unreadNotifications.length === 0) {
      return // No hay notificaciones para actualizar
    }
    
    // Filtrar en memoria las que realmente están sin leer
    const unreadIds = unreadNotifications
      .map((n: any) => {
        const isRead = n.read !== undefined ? n.read : (n.is_read !== undefined ? n.is_read : true)
        return !isRead ? n.id : null
      })
      .filter((id: string | null) => id !== null)
    
    if (unreadIds.length === 0) {
      return // No hay notificaciones realmente sin leer
    }
    
    // Actualizar todas las notificaciones no leídas
    const { error } = await supabase
      .from('notifications')
      .update(updateData)
      .in('id', unreadIds)

    if (error) {
      console.error('Error marcando todas como leídas:', error)
      throw error
    }
  } catch (error) {
    console.error('Error en markAllNotificationsAsRead:', error)
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
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return 0
    }

    // Obtener organization_id
    const organizationId = await getUserOrganizationId()

    // Obtener todas las notificaciones y contar las no leídas en memoria
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${user.id},user_id.is.null`)

    if (error) {
      console.error('Error obteniendo contador:', error)
      return 0
    }

    // Contar las no leídas en memoria
    const unreadCount = (data || []).filter((n: any) => {
      const isRead = n.read !== undefined ? n.read : (n.is_read !== undefined ? n.is_read : false)
      return !isRead
    }).length

    return unreadCount
  } catch (error) {
    console.error('Error en getUnreadCount:', error)
    return 0
  }
}
