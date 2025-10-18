/**
 * Hook personalizado para manejar notificaciones
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  getUnreadNotifications, 
  getAllNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  type Notification 
} from '@/lib/supabase/notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const [unread, all] = await Promise.all([
        getUnreadNotifications(),
        getAllNotifications(20)
      ])
      
      setNotifications(all)
      setUnreadCount(unread.length)
    } catch (error) {
      console.error('Error loading notifications:', error)
      // Fallback a datos mock en caso de error
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      await loadNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [loadNotifications])

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      await loadNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [loadNotifications])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead
  }
}
