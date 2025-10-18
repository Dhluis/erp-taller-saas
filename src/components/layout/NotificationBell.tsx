'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Check, 
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Package,
  FileText,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  getUnreadNotifications, 
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '@/lib/supabase/notifications-client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const unread = await getUnreadNotifications()
      setUnreadCount(unread.length)
    } catch (error) {
      console.error('Error cargando contador:', error)
    }
  }

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const all = await getAllNotifications()
      const sorted = all.sort((a, b) => {
        if (a.read === b.read) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        return a.read ? 1 : -1
      })
      setNotifications(sorted)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
      toast.error('Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Marcada como leída')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al marcar como leída')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
      toast.success('Todas marcadas como leídas')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al marcar todas')
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success('Notificación eliminada')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-5 w-5 flex-shrink-0"
    
    switch (type) {
      case 'success':
      case 'order_completed':
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case 'warning':
      case 'stock_low':
        return <AlertCircle className={cn(iconClass, "text-yellow-500")} />
      case 'error':
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case 'payment':
        return <DollarSign className={cn(iconClass, "text-green-500")} />
      case 'quotation':
      case 'quotation_created':
        return <FileText className={cn(iconClass, "text-blue-500")} />
      case 'inventory':
        return <Package className={cn(iconClass, "text-purple-500")} />
      case 'info':
      default:
        return <Info className={cn(iconClass, "text-blue-500")} />
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-[400px] p-0 bg-[#0F172A] border-border"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 bg-[#0F172A]">
          <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todas
            </Button>
          )}
        </div>

        <Separator />

        {/* Lista de notificaciones */}
        {loading ? (
          <div className="flex items-center justify-center py-12 bg-[#0F172A]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-gray-400">Cargando...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#0F172A]">
            <div className="rounded-full bg-[#1E293B] p-4 mb-3">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-white">No hay notificaciones</p>
            <p className="text-xs text-gray-400 mt-1">
              Aquí aparecerán tus notificaciones
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] bg-[#0F172A]">
            <div className="divide-y divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative p-4 transition-colors hover:bg-[#1E293B]/80",
                    !notification.read && "bg-[#1E293B]/50"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Icono */}
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Título y badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "text-sm leading-tight text-white",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>

                      {/* Mensaje */}
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Footer con fecha y acciones */}
                      <div className="flex items-center justify-between pt-1">
                        <time className="text-xs text-gray-500">
                          {format(new Date(notification.created_at), "d 'de' MMM, HH:mm", { locale: es })}
                        </time>

                        {/* Botones de acción */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              className="h-7 px-2 text-xs hover:bg-[#1E293B] text-white"
                              title="Marcar como leída"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                            className="h-7 px-2 text-xs hover:bg-[#1E293B] hover:text-red-500 text-white"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 bg-[#0F172A]">
              <Button 
                variant="ghost" 
                className="w-full text-xs text-gray-400 hover:text-white hover:bg-[#1E293B]"
                onClick={() => {
                  setOpen(false)
                  router.push('/notificaciones')
                }}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
