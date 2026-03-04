/**
 * Hook personalizado para manejar notificaciones
 */

import { useState, useEffect, useCallback } from 'react'
import type { Notification } from '@/lib/supabase/notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const [allRes, unreadRes] = await Promise.all([
        fetch('/api/notifications?limit=20'),
        fetch('/api/notifications?is_read=false&limit=50')
      ])
      const allJson = await allRes.json()
      const unreadJson = await unreadRes.json()

      console.log('[Notif] all status:', allRes.status, '| count:', (allJson.data || []).length, '| error:', allJson.error)
      console.log('[Notif] unread status:', unreadRes.status, '| count:', (unreadJson.data || []).length, '| error:', unreadJson.error)

      setNotifications(allJson.data || [])
      setUnreadCount((unreadJson.data || []).length)
    } catch (error) {
      console.error('[Notif] Error loading notifications:', error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })
      await loadNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [loadNotifications])

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      await loadNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [loadNotifications])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30_000)
    return () => clearInterval(interval)
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
