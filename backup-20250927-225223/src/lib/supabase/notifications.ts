import { createClient } from './client'

export interface Notification {
  id: string
  organization_id: string
  user_id?: string
  type: 'info' | 'warning' | 'success' | 'error' | 'stock_low' | 'order_completed' | 'quotation_created'
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
  read_at?: string
}

export interface CreateNotificationData {
  type: Notification['type']
  title: string
  message: string
  data?: any
  user_id?: string
}

const supabase = createClient()

// Obtener notificaciones no leídas
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

// Obtener todas las notificaciones
export async function getAllNotifications(limit = 50): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching all notifications:', error)
    return []
  }
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

// Marcar todas las notificaciones como leídas
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('read', false)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

// Crear nueva notificación
export async function createNotification(data: CreateNotificationData): Promise<Notification | null> {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        user_id: data.user_id
      }])
      .select()
      .single()

    if (error) throw error
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

// Obtener contador de notificaciones no leídas
export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching notifications count:', error)
    return 0
  }
}

// Suscribirse a cambios en notificaciones
export function subscribeToNotifications(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('notifications-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications'
    }, callback)
    .subscribe()

  return subscription
}

// Funciones helper para crear notificaciones específicas
export async function createStockLowNotification(productId: string, productName: string, currentStock: number) {
  return createNotification({
    type: 'stock_low',
    title: 'Stock Bajo',
    message: `El producto "${productName}" tiene menos de 10 unidades en stock (${currentStock} disponibles)`,
    data: { product_id: productId, current_stock: currentStock }
  })
}

export async function createOrderCompletedNotification(orderId: string, customerName: string) {
  return createNotification({
    type: 'order_completed',
    title: 'Orden Completada',
    message: `La orden de trabajo #${orderId} ha sido completada para ${customerName}`,
    data: { order_id: orderId, customer_name: customerName }
  })
}

export async function createQuotationCreatedNotification(quotationId: string, customerName: string) {
  return createNotification({
    type: 'quotation_created',
    title: 'Nueva Cotización',
    message: `Se ha creado una nueva cotización #${quotationId} para ${customerName}`,
    data: { quotation_id: quotationId, customer_name: customerName }
  })
}

