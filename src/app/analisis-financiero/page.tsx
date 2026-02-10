'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  BarChart3,
  Calculator,
  Target,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

export default function AnalisisFinancieroPage() {
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState({
    cashFlow: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    profitByService: {
      maintenance: 0,
      repairs: 0,
      parts: 0,
      labor: 0,
    },
    operatingCosts: {
      current: 0,
      previous: 0,
      percentageChange: 0,
    },
    revenueProjection: {
      nextMonth: 0,
      nextQuarter: 0,
      nextYear: 0,
    },
    profitMargin: {
      current: 0,
      target: 0,
      gap: 0,
    },
    breakEvenPoint: {
      monthly: 0,
      daily: 0,
    },
  })

  // Simular carga de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      setFinancialData({
        cashFlow: {
          current: 45000,
          previous: 38000,
          percentageChange: 18.4,
        },
        profitByService: {
          maintenance: 35.2,
          repairs: 28.7,
          parts: 22.1,
          labor: 14.0,
        },
        operatingCosts: {
          current: 32000,
          previous: 35000,
          percentageChange: -8.6,
        },
        revenueProjection: {
          nextMonth: 135000,
          nextQuarter: 420000,
          nextYear: 1650000,
        },
        profitMargin: {
          current: 28.7,
          target: 32.0,
          gap: 3.3,
        },
        breakEvenPoint: {
          monthly: 25000,
          daily: 833,
        },
      })
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Análisis Financiero' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
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
    if (value > 0) return <TrendingUp className="w-4 h-4" />
    if (value < 0) return <TrendingDown className="w-4 h-4" />
    return <div className="w-4 h-4" />
  }

  if (loading) {
    return (
      <MainLayout title="Análisis Financiero" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Cargando análisis financiero...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Análisis Financiero" breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              💰 Análisis Financiero Avanzado
            </h1>
            <p className="text-text-secondary mt-2">
              Monitoreo detallado de la salud financiera del taller
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="secondary" icon={<Calculator className="h-4 w-4" />}>
              Calcular Proyecciones
            </Button>
            <Button variant="primary" icon={<BarChart3 className="h-4 w-4" />}>
              Generar Reporte
            </Button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Flujo de Caja */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span>Flujo de Caja</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {formatCurrency(financialData.cashFlow.current)}
                  </span>
                  <Badge 
                    variant={financialData.cashFlow.percentageChange > 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    {getChangeIcon(financialData.cashFlow.percentageChange)}
                    <span>{formatPercentage(financialData.cashFlow.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {formatCurrency(financialData.cashFlow.previous)} mes anterior
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Costos Operativos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-warning" />
                <span>Costos Operativos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {formatCurrency(financialData.operatingCosts.current)}
                  </span>
                  <Badge 
                    variant={financialData.operatingCosts.percentageChange < 0 ? 'success' : 'error'}
                    className="flex items-center space-x-1"
                  >
                    {getChangeIcon(financialData.operatingCosts.percentageChange)}
                    <span>{formatPercentage(financialData.operatingCosts.percentageChange)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  vs {formatCurrency(financialData.operatingCosts.previous)} mes anterior
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Margen de Ganancia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Margen de Ganancia</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-text-primary">
                    {financialData.profitMargin.current}%
                  </span>
                  <Badge 
                    variant={financialData.profitMargin.gap > 0 ? 'warning' : 'success'}
                    className="flex items-center space-x-1"
                  >
                    <span>Meta: {financialData.profitMargin.target}%</span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  {financialData.profitMargin.gap > 0 
                    ? `${financialData.profitMargin.gap.toFixed(1)}% para alcanzar la meta`
                    : 'Meta alcanzada'
                  }
                </p>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${Math.min((financialData.profitMargin.current / financialData.profitMargin.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rentabilidad por Servicio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-info" />
              <span>Rentabilidad por Tipo de Servicio</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Mantenimiento</span>
                  <span className="text-lg font-bold text-primary">{financialData.profitByService.maintenance}%</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${financialData.profitByService.maintenance}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Reparaciones</span>
                  <span className="text-lg font-bold text-success">{financialData.profitByService.repairs}%</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-success rounded-full h-2" 
                    style={{ width: `${financialData.profitByService.repairs}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Refacciones</span>
                  <span className="text-lg font-bold text-warning">{financialData.profitByService.parts}%</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-warning rounded-full h-2" 
                    style={{ width: `${financialData.profitByService.parts}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Mano de Obra</span>
                  <span className="text-lg font-bold text-info">{financialData.profitByService.labor}%</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-info rounded-full h-2" 
                    style={{ width: `${financialData.profitByService.labor}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proyecciones y Punto de Equilibrio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proyecciones de Ingresos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span>Proyecciones de Ingresos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Próximo Mes</p>
                    <p className="text-xs text-text-secondary">Proyección basada en tendencias</p>
                  </div>
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(financialData.revenueProjection.nextMonth)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Próximo Trimestre</p>
                    <p className="text-xs text-text-secondary">Proyección Q1 2024</p>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(financialData.revenueProjection.nextQuarter)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-info/10 border border-info/20">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Próximo Año</p>
                    <p className="text-xs text-text-secondary">Proyección anual 2024</p>
                  </div>
                  <span className="text-lg font-bold text-info">
                    {formatCurrency(financialData.revenueProjection.nextYear)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Punto de Equilibrio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-warning" />
                <span>Punto de Equilibrio</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">Mensual</span>
                    <span className="text-2xl font-bold text-warning">
                      {formatCurrency(financialData.breakEvenPoint.monthly)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Ingresos mínimos necesarios para cubrir costos
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">Diario</span>
                    <span className="text-2xl font-bold text-info">
                      {formatCurrency(financialData.breakEvenPoint.daily)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Ingresos diarios mínimos requeridos
                  </p>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Estado: Rentable
                      </p>
                      <p className="text-xs text-text-secondary">
                        Los ingresos actuales superan el punto de equilibrio
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas y Recomendaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span>Alertas y Recomendaciones Financieras</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-1">
                      ⚠️ Margen de Ganancia
                    </p>
                    <p className="text-xs text-text-secondary">
                      Estás 3.3% por debajo de tu meta de margen. Considera revisar precios o reducir costos.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-info mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-1">
                      💡 Oportunidad de Crecimiento
                    </p>
                    <p className="text-xs text-text-secondary">
                      Los servicios de mantenimiento generan 35% de ganancia. Considera expandir esta área.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-1">
                      ✅ Flujo de Caja Saludable
                    </p>
                    <p className="text-xs text-text-secondary">
                      El flujo de caja ha mejorado 18.4% este mes. Excelente gestión financiera.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-1">
                      📊 Revisión Mensual
                    </p>
                    <p className="text-xs text-text-secondary">
                      Programa una revisión detallada de costos operativos para optimizar gastos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

