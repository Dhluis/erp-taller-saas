"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  Package,
  FileText,
  Receipt
} from "lucide-react"
import { 
  getUnreadNotifications, 
  getAllNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  subscribeToNotifications,
  type Notification 
} from "@/lib/supabase/notifications"

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications()
    
    // Suscribirse a cambios en tiempo real
    const subscription = subscribeToNotifications((payload) => {
      console.log('Notification change:', payload)
      loadNotifications()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadNotifications = async () => {
    const [unread, all] = await Promise.all([
      getUnreadNotifications(),
      getAllNotifications(20)
    ])
    
    setNotifications(all)
    setUnreadCount(unread.length)
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'stock_low':
        return <Package className="h-4 w-4 text-orange-500" />
      case 'order_completed':
        return <FileText className="h-4 w-4 text-green-500" />
      case 'quotation_created':
        return <Receipt className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/10'
      case 'info':
        return 'border-blue-500/20 bg-blue-500/10'
      case 'success':
        return 'border-green-500/20 bg-green-500/10'
      case 'error':
        return 'border-red-500/20 bg-red-500/10'
      case 'stock_low':
        return 'border-orange-500/20 bg-orange-500/10'
      case 'order_completed':
        return 'border-green-500/20 bg-green-500/10'
      case 'quotation_created':
        return 'border-blue-500/20 bg-blue-500/10'
      default:
        return 'border-gray-500/20 bg-gray-500/10'
    }
  }

  const formatTime = (timestamp: string) => {
    const now = new Date()
    const notificationTime = new Date(timestamp)
    const diff = now.getTime() - notificationTime.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId)
    loadNotifications()
  }

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead()
    loadNotifications()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-notifications-trigger>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
          </DialogTitle>
          <DialogDescription>
            Mantente al día con las últimas actividades del taller
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${getTypeColor(notification.type)} ${
                    !notification.read ? 'ring-2 ring-primary/20' : ''
                  } cursor-pointer hover:bg-muted/20 transition-colors`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(notification.created_at)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            Marcar todas como leídas
          </Button>
          <Button variant="ghost" size="sm">
            Ver todas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
