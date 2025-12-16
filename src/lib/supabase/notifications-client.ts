/**
 * Funciones client-side para gestión de notificaciones
 * ✅ MIGRADO: Ahora usa API Routes en lugar de queries directas
 */

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
 * Obtener todas las notificaciones del usuario actual
 * ✅ MIGRADO: Usa API Route en lugar de query directa
 */
export async function getAllNotifications(): Promise<Notification[]> {
  try {
    const response = await fetch('/api/notifications?limit=50', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error obteniendo notificaciones:', errorData.error);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error en getAllNotifications:', error)
    return []
  }
}

/**
 * Obtener solo notificaciones no leídas
 * ✅ MIGRADO: Usa API Route en lugar de query directa
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const response = await fetch('/api/notifications?is_read=false&limit=50', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error obteniendo notificaciones no leídas:', errorData.error);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error en getUnreadNotifications:', error)
    return []
  }
}

/**
 * Marcar una notificación como leída
 * ✅ MIGRADO: Usa API Route en lugar de query directa
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al marcar notificación como leída');
    }
  } catch (error) {
    console.error('Error marcando notificación como leída:', error)
    throw error
  }
}

/**
 * Marcar todas las notificaciones como leídas
 * ✅ MIGRADO: Usa API Route en lugar de query directa
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const response = await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al marcar todas las notificaciones como leídas');
    }
  } catch (error) {
    console.error('Error en markAllNotificationsAsRead:', error)
    throw error
  }
}

/**
 * Eliminar una notificación
 * ✅ MIGRADO: Usa API Route en lugar de query directa
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar notificación');
    }
  } catch (error) {
    console.error('Error eliminando notificación:', error)
    throw error
  }
}

/**
 * Obtener el conteo de notificaciones no leídas
 * ✅ MIGRADO: Usa API Route en lugar de query directa
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const response = await fetch('/api/notifications?is_read=false&limit=1000', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error obteniendo contador:', errorData.error);
      return 0;
    }

    const result = await response.json();
    return result.data?.length || 0;
  } catch (error) {
    console.error('Error en getUnreadCount:', error)
    return 0
  }
}
