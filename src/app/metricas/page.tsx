'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics'
import { useKPIs } from '@/hooks/useKPIs'

interface PerformanceMetricsData {
  averageOrderValue: number
  customerRetentionRate: number
  orderCompletionRate: number
  inventoryTurnover: number
  profitMargin: number
  responseTime: number
}

export default function MetricasPage() {
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<PerformanceMetricsData | null>(null)
  
  // Simular carga de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      setPerformanceData({
        averageOrderValue: 8750.50,
        customerRetentionRate: 85.2,
        orderCompletionRate: 92.8,
        inventoryTurnover: 4.2,
        profitMargin: 28.5,
        responseTime: 25.5
      })
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Métricas de Rendimiento' }
  ]

  return (
    <MainLayout 
      title="Métricas de Rendimiento"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Métricas de Rendimiento
            </h1>
            <p className="text-text-secondary mt-2">
              Indicadores clave de rendimiento del sistema ERP
            </p>
          </div>
        </div>

        {/* Performance Metrics Component */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <PerformanceMetrics data={performanceData} loading={loading} />
          </div>

          {/* Additional Info Panel */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                📈 Resumen de KPIs
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Valor Promedio Orden</span>
                  <span className="text-primary font-bold">
                    ${performanceData?.averageOrderValue.toLocaleString('es-MX', { minimumFractionDigits: 0 }) || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Retención Clientes</span>
                  <span className="text-success font-bold">
                    {performanceData?.customerRetentionRate.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Tasa Completado</span>
                  <span className="text-info font-bold">
                    {performanceData?.orderCompletionRate.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Rotación Inventario</span>
                  <span className="text-warning font-bold">
                    {performanceData?.inventoryTurnover.toFixed(1) || '0'}x
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Margen Ganancia</span>
                  <span className="text-primary font-bold">
                    {performanceData?.profitMargin.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Tiempo Respuesta</span>
                  <span className="text-text-primary font-bold">
                    {performanceData?.responseTime.toFixed(0) || '0'} min
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                🎯 Indicadores de Rendimiento
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-text-secondary">Sistema funcionando óptimamente</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-text-secondary">Rendimiento superior al promedio</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-info rounded-full"></div>
                  <span className="text-text-secondary">Eficiencia operativa alta</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span className="text-text-secondary">Oportunidades de mejora identificadas</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                💡 Recomendaciones
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    Optimizar tiempo de respuesta
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Implementar automatización para reducir tiempos
                  </p>
                </div>
                <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    Mantener retención de clientes
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Programa de fidelización funcionando bien
                  </p>
                </div>
                <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
                  <p className="text-sm text-info font-medium">
                    Mejorar rotación de inventario
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Revisar estrategias de compra
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-primary text-bg-primary rounded-lg font-medium hover:bg-primary-light transition-colors">
            Exportar Reporte de Rendimiento
          </button>
          <button className="px-6 py-3 bg-bg-tertiary text-text-primary border border-border rounded-lg font-medium hover:bg-bg-quaternary transition-colors">
            Configurar Alertas de KPIs
          </button>
        </div>
      </div>
    </MainLayout>
  )
}

