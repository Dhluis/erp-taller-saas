'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  Package,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

export default function MetricasRendimientoPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    customerRetention: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    profitMargin: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    inventoryTurnover: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    averageOrderValue: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    customerLifetimeValue: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    orderFulfillmentTime: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
  })

  // Simular carga de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        customerRetention: {
          current: 85.5,
          previous: 82.3,
          percentageChange: 3.9,
        },
        profitMargin: {
          current: 28.7,
          previous: 25.2,
          percentageChange: 13.9,
        },
        inventoryTurnover: {
          current: 4.2,
          previous: 3.8,
          percentageChange: 10.5,
        },
        averageOrderValue: {
          current: 1250,
          previous: 1180,
          percentageChange: 5.9,
        },
        customerLifetimeValue: {
          current: 8500,
          previous: 7200,
          percentageChange: 18.1,
        },
        orderFulfillmentTime: {
          current: 2.3,
          previous: 2.8,
          percentageChange: -17.9,
        },
      })
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Métricas de Rendimiento' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-success'
    if (value < 0) return 'text-error'
    return 'text-text-secondary'
  }

  const getChangeIcon = (value: number) => {
    if (value > 0) return '↗'
    if (value < 0) return '↘'
    return '→'
  }

  if (loading) {
    return (
      <MainLayout title="Métricas de Rendimiento" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Cargando métricas...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Métricas de Rendimiento" breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              📊 Métricas Avanzadas de Rendimiento
            </h1>
            <p className="text-text-secondary mt-2">
              Análisis detallado de KPIs clave para optimizar el rendimiento del taller
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="secondary" icon={<BarChart3 className="h-4 w-4" />}>
              Exportar Reporte
            </Button>
            <Button variant="primary" icon={<Activity className="h-4 w-4" />}>
              Actualizar Datos
            </Button>
          </div>
        </div>

        {/* Grid de métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Retención de Clientes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Retención de Clientes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {metrics.customerRetention.current}%
                  </span>
                  <Badge 
                    variant={metrics.customerRetention.percentageChange > 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    <span>{getChangeIcon(metrics.customerRetention.percentageChange)}</span>
                    <span>{formatPercentage(metrics.customerRetention.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {metrics.customerRetention.previous}% mes anterior
                </p>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${metrics.customerRetention.current}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Margen de Ganancia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span>Margen de Ganancia</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {metrics.profitMargin.current}%
                  </span>
                  <Badge 
                    variant={metrics.profitMargin.percentageChange > 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    <span>{getChangeIcon(metrics.profitMargin.percentageChange)}</span>
                    <span>{formatPercentage(metrics.profitMargin.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {metrics.profitMargin.previous}% mes anterior
                </p>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-success rounded-full h-2" 
                    style={{ width: `${metrics.profitMargin.current}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rotación de Inventario */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-info" />
                <span>Rotación de Inventario</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {metrics.inventoryTurnover.current}x
                  </span>
                  <Badge 
                    variant={metrics.inventoryTurnover.percentageChange > 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    <span>{getChangeIcon(metrics.inventoryTurnover.percentageChange)}</span>
                    <span>{formatPercentage(metrics.inventoryTurnover.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {metrics.inventoryTurnover.previous}x mes anterior
                </p>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-info rounded-full h-2" 
                    style={{ width: `${Math.min(metrics.inventoryTurnover.current * 20, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valor Promedio de Orden */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-warning" />
                <span>Valor Promedio de Orden</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {formatCurrency(metrics.averageOrderValue.current)}
                  </span>
                  <Badge 
                    variant={metrics.averageOrderValue.percentageChange > 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    <span>{getChangeIcon(metrics.averageOrderValue.percentageChange)}</span>
                    <span>{formatPercentage(metrics.averageOrderValue.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {formatCurrency(metrics.averageOrderValue.previous)} mes anterior
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Valor de Vida del Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Valor de Vida del Cliente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {formatCurrency(metrics.customerLifetimeValue.current)}
                  </span>
                  <Badge 
                    variant={metrics.customerLifetimeValue.percentageChange > 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    <span>{getChangeIcon(metrics.customerLifetimeValue.percentageChange)}</span>
                    <span>{formatPercentage(metrics.customerLifetimeValue.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {formatCurrency(metrics.customerLifetimeValue.previous)} mes anterior
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tiempo de Cumplimiento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-error" />
                <span>Tiempo de Cumplimiento</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {metrics.orderFulfillmentTime.current} días
                  </span>
                  <Badge 
                    variant={metrics.orderFulfillmentTime.percentageChange < 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    <span>{getChangeIcon(metrics.orderFulfillmentTime.percentageChange)}</span>
                    <span>{formatPercentage(metrics.orderFulfillmentTime.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {metrics.orderFulfillmentTime.previous} días mes anterior
                </p>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-error rounded-full h-2" 
                    style={{ width: `${Math.max(100 - (metrics.orderFulfillmentTime.current * 20), 0)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análisis adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Tendencias de Rendimiento</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Mejora en Eficiencia
                    </p>
                    <p className="text-xs text-text-secondary">
                      Tiempo de cumplimiento reducido en 17.9%
                    </p>
                  </div>
                  <Badge variant="success">Excelente</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Crecimiento de Clientes
                    </p>
                    <p className="text-xs text-text-secondary">
                      Valor de vida del cliente aumentó 18.1%
                    </p>
                  </div>
                  <Badge variant="primary">Bueno</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-info" />
                <span>Recomendaciones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm font-medium text-text-primary mb-1">
                    💡 Optimizar Inventario
                  </p>
                  <p className="text-xs text-text-secondary">
                    Considera ajustar niveles de stock para mejorar la rotación
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                  <p className="text-sm font-medium text-text-primary mb-1">
                    📈 Estrategia de Precios
                  </p>
                  <p className="text-xs text-text-secondary">
                    El margen de ganancia está creciendo, evalúa oportunidades de expansión
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

