'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Car, 
  FileText, 
  Package,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

interface DashboardStatsProps {
  data?: {
    orders: {
      current: number
      previous: number
      percentageChange: number
    }
    revenue: {
      current: number
      previous: number
      percentageChange: number
    }
    activeCustomers: number
    lowStockItems: number
  }
  loading?: boolean
}

export function DashboardStats({ data, loading = false }: DashboardStatsProps) {
  const [stats, setStats] = useState(data)

  useEffect(() => {
    if (data) {
      setStats(data)
    }
  }, [data])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-bg-tertiary rounded w-1/2"></div>
                <div className="h-8 bg-bg-tertiary rounded w-3/4"></div>
                <div className="h-3 bg-bg-tertiary rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-text-muted">
              No hay datos disponibles
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statsData = [
    {
      title: 'Órdenes del Mes',
      value: stats.orders.current,
      previous: stats.orders.previous,
      change: stats.orders.percentageChange,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Ingresos',
      value: formatCurrency(stats.revenue.current),
      previous: formatCurrency(stats.revenue.previous),
      change: stats.revenue.percentageChange,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Clientes Activos',
      value: stats.activeCustomers,
      previous: 0,
      change: 0,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockItems,
      previous: 0,
      change: 0,
      icon: Package,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} hover glow={stat.change > 0}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                {stat.change !== 0 && (
                  <div className="flex items-center space-x-1">
                    {stat.change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-error" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        stat.change > 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                    <span className="text-xs text-text-muted">
                      vs mes anterior
                    </span>
                  </div>
                )}
              </div>
              
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface QuickActionsProps {
  onNewOrder?: () => void
  onNewCustomer?: () => void
  onNewQuotation?: () => void
  onViewInventory?: () => void
}

export function QuickActions({
  onNewOrder,
  onNewCustomer,
  onNewQuotation,
  onViewInventory,
}: QuickActionsProps) {
  const actions = [
    {
      title: 'Nueva Orden',
      description: 'Crear orden de trabajo',
      icon: Car,
      onClick: onNewOrder,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Nuevo Cliente',
      description: 'Agregar cliente',
      icon: Users,
      onClick: onNewCustomer,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Nueva Cotización',
      description: 'Crear cotización',
      icon: FileText,
      onClick: onNewQuotation,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Inventario',
      description: 'Ver inventario',
      icon: Package,
      onClick: onViewInventory,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-bg-tertiary transition-all duration-normal group"
            >
              <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform duration-normal`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-xs text-text-secondary">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface RecentActivityProps {
  activities?: Array<{
    id: string
    type: 'order' | 'customer' | 'quotation' | 'invoice'
    title: string
    description: string
    time: string
    status: 'completed' | 'pending' | 'in_progress' | 'cancelled'
  }>
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const mockActivities = [
    {
      id: '1',
      type: 'order' as const,
      title: 'Orden #1234 completada',
      description: 'Reparación de motor - Toyota Corolla',
      time: '2 min',
      status: 'completed' as const,
    },
    {
      id: '2',
      type: 'customer' as const,
      title: 'Nuevo cliente registrado',
      description: 'Juan Pérez - Honda Civic 2020',
      time: '15 min',
      status: 'completed' as const,
    },
    {
      id: '3',
      type: 'quotation' as const,
      title: 'Cotización #5678 enviada',
      description: 'Cambio de aceite y filtros',
      time: '1 hora',
      status: 'pending' as const,
    },
    {
      id: '4',
      type: 'invoice' as const,
      title: 'Factura #9012 generada',
      description: 'Servicio completo - $2,500',
      time: '2 horas',
      status: 'completed' as const,
    },
  ]

  const displayActivities = activities.length > 0 ? activities : mockActivities

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return Car
      case 'customer':
        return Users
      case 'quotation':
        return FileText
      case 'invoice':
        return DollarSign
      default:
        return FileText
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success'
      case 'pending':
        return 'text-warning'
      case 'in_progress':
        return 'text-info'
      case 'cancelled':
        return 'text-error'
      default:
        return 'text-text-muted'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            return (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-bg-tertiary transition-colors duration-normal"
              >
                <div className="p-2 rounded-lg bg-bg-tertiary">
                  <Icon className="h-4 w-4 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {activity.title}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-text-muted">
                      {activity.time}
                    </span>
                    <Badge
                      variant={
                        activity.status === 'completed' ? 'success' :
                        activity.status === 'pending' ? 'warning' :
                        activity.status === 'in_progress' ? 'info' : 'error'
                      }
                      size="sm"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

