'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileText,
  Receipt,
  Search,
  Filter,
  CheckCheck,
  Home,
  ChevronRight,
} from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { type Notification } from '@/lib/supabase/notifications'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NotificacionesPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRead, setFilterRead] = useState<string>('all')

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'stock_low':
        return <Package className="h-5 w-5 text-orange-500" />
      case 'order_completed':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'quotation_created':
        return <Receipt className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeLabel = (type: Notification['type']) => {
    const labels = {
      warning: 'Advertencia',
      info: 'Información',
      success: 'Éxito',
      error: 'Error',
      stock_low: 'Stock Bajo',
      order_completed: 'Orden Completada',
      quotation_created: 'Cotización Creada',
    }
    return labels[type] || 'Otro'
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

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  // Filtrar notificaciones
  const filteredNotifications = notifications.filter((notification) => {
    // Filtro de búsqueda
    const matchesSearch =
      searchTerm === '' ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro por tipo
    const matchesType =
      filterType === 'all' || notification.type === filterType

    // Filtro por estado de lectura
    const matchesRead =
      filterRead === 'all' ||
      (filterRead === 'unread' && !notification.read) ||
      (filterRead === 'read' && notification.read)

    return matchesSearch && matchesType && matchesRead
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <a
          href="/dashboard"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Inicio</span>
        </a>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Bell className="h-4 w-4 text-blue-500" />
          <span>Notificaciones</span>
        </div>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notificaciones</h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0
                ? `${unreadCount} notificaciones sin leer`
                : 'Todas las notificaciones leídas'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notificaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro por tipo */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de notificación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="info">Información</SelectItem>
              <SelectItem value="success">Éxito</SelectItem>
              <SelectItem value="warning">Advertencia</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="stock_low">Stock Bajo</SelectItem>
              <SelectItem value="order_completed">Orden Completada</SelectItem>
              <SelectItem value="quotation_created">
                Cotización Creada
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por lectura */}
          <Select value={filterRead} onValueChange={setFilterRead}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">No leídas</SelectItem>
              <SelectItem value="read">Leídas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Sin leer</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notifications.length - unreadCount}
              </p>
              <p className="text-sm text-muted-foreground">Leídas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Filter className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredNotifications.length}</p>
              <p className="text-sm text-muted-foreground">Filtradas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de notificaciones */}
      {isLoading ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p>Cargando notificaciones...</p>
          </div>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay notificaciones</p>
            <p className="text-sm">
              {searchTerm || filterType !== 'all' || filterRead !== 'all'
                ? 'No se encontraron notificaciones con los filtros aplicados'
                : 'No tienes notificaciones en este momento'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-5 ${getTypeColor(notification.type)} ${
                !notification.read ? 'ring-2 ring-primary/20' : ''
              } cursor-pointer hover:shadow-md transition-all`}
              onClick={() =>
                !notification.read && handleMarkAsRead(notification.id)
              }
            >
              <div className="flex items-start gap-4">
                {/* Icono */}
                <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-semibold ${
                          !notification.read ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(notification.type)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(
                          new Date(notification.created_at),
                          "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
                          { locale: es }
                        )}
                      </span>
                    </div>

                    {!notification.read && (
                      <Badge variant="default" className="text-xs">
                        Nueva
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}







