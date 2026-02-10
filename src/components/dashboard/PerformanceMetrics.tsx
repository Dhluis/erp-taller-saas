'use client'

import { 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface PerformanceMetrics {
  averageOrderValue: number
  customerRetentionRate: number
  orderCompletionRate: number
  inventoryTurnover: number
  profitMargin: number
  responseTime: number
}

interface PerformanceMetricsProps {
  data: PerformanceMetrics | null
  loading?: boolean
}

export function PerformanceMetrics({ data, loading = false }: PerformanceMetricsProps) {
  const { currency } = useOrgCurrency();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(0)} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes.toFixed(0)}m`
  }

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          📊 Métricas de Rendimiento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-bg-tertiary animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          📊 Métricas de Rendimiento
        </h3>
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No hay datos de rendimiento disponibles</p>
        </div>
      </div>
    )
  }

  const metrics = [
    {
      title: 'Valor Promedio de Orden',
      value: formatCurrency(data.averageOrderValue),
      icon: CurrencyDollarIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      trend: data.averageOrderValue > 5000 ? 'up' : 'down',
      description: 'Ingreso promedio por orden'
    },
    {
      title: 'Retención de Clientes',
      value: formatPercentage(data.customerRetentionRate),
      icon: UserGroupIcon,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      trend: data.customerRetentionRate > 80 ? 'up' : 'down',
      description: 'Porcentaje de clientes que regresan'
    },
    {
      title: 'Tasa de Completado',
      value: formatPercentage(data.orderCompletionRate),
      icon: ArrowUpIcon,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'border-info/30',
      trend: data.orderCompletionRate > 90 ? 'up' : 'down',
      description: 'Órdenes completadas exitosamente'
    },
    {
      title: 'Rotación de Inventario',
      value: data.inventoryTurnover.toFixed(1),
      icon: CubeIcon,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      trend: data.inventoryTurnover > 4 ? 'up' : 'down',
      description: 'Veces que se renueva el inventario'
    },
    {
      title: 'Margen de Ganancia',
      value: formatPercentage(data.profitMargin),
      icon: ChartBarIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      trend: data.profitMargin > 25 ? 'up' : 'down',
      description: 'Ganancia neta por venta'
    },
    {
      title: 'Tiempo de Respuesta',
      value: formatTime(data.responseTime),
      icon: ClockIcon,
      color: 'text-text-secondary',
      bgColor: 'bg-bg-tertiary',
      borderColor: 'border-border',
      trend: data.responseTime < 30 ? 'up' : 'down',
      description: 'Tiempo promedio de atención'
    }
  ]

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          📊 Métricas de Rendimiento
        </h3>
        <span className="text-sm text-text-secondary">
          Indicadores clave de rendimiento
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-lg border transition-all hover:shadow-lg
              ${metric.bgColor} ${metric.borderColor}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${metric.bgColor} ${metric.borderColor}
                `}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-primary">
                    {metric.title}
                  </h4>
                  <p className="text-xs text-text-secondary">
                    {metric.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {metric.trend === 'up' ? (
                  <ArrowUpIcon className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-error" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </span>
              
              <div className={`
                px-2 py-1 rounded text-xs font-medium
                ${metric.trend === 'up' 
                  ? 'bg-success/20 text-success' 
                  : 'bg-error/20 text-error'
                }
              `}>
                {metric.trend === 'up' ? 'Excelente' : 'Mejorar'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-text-secondary">
            <ChartBarIcon className="w-5 h-5" />
            <span className="text-sm">Rendimiento general del sistema</span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-text-secondary">Óptimo</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <span className="text-text-secondary">Regular</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-error rounded-full"></div>
              <span className="text-text-secondary">Crítico</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
