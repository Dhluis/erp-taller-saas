'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { TopProducts } from '@/components/dashboard/TopProducts'

interface Product {
  name: string
  totalSold: number
  revenue: number
}

export default function ProductosPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])

  // Simular carga de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      setProducts([
        {
          name: 'Cambio de Aceite Motor',
          totalSold: 45,
          revenue: 22500
        },
        {
          name: 'Filtro de Aire',
          totalSold: 32,
          revenue: 12800
        },
        {
          name: 'Pastillas de Freno',
          totalSold: 28,
          revenue: 19600
        },
        {
          name: 'Alineación y Balanceo',
          totalSold: 22,
          revenue: 13200
        },
        {
          name: 'Diagnóstico Computarizado',
          totalSold: 18,
          revenue: 9000
        }
      ])
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Productos' }
  ]

  return (
    <MainLayout 
      title="Top Productos y Servicios"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Top Productos y Servicios
            </h1>
            <p className="text-text-secondary mt-2">
              Análisis de rendimiento de productos y servicios más vendidos
            </p>
          </div>
        </div>

        {/* Top Products Component */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
            <TopProducts data={products} loading={loading} />
          </div>

          {/* Additional Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Revenue Summary */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                📊 Resumen de Ingresos
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Total Vendido</span>
                  <span className="text-text-primary font-bold">
                    {products.reduce((sum, p) => sum + p.totalSold, 0)} unidades
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Ingresos Totales</span>
                  <span className="text-primary font-bold">
                    ${products.reduce((sum, p) => sum + p.revenue, 0).toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Promedio por Venta</span>
                  <span className="text-success font-bold">
                    ${Math.round(products.reduce((sum, p) => sum + p.revenue, 0) / products.reduce((sum, p) => sum + p.totalSold, 0)).toLocaleString('es-MX')}
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
                  <span className="text-text-secondary">Producto estrella: Cambio de Aceite</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-text-secondary">Crecimiento: +15% vs mes anterior</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span className="text-text-secondary">Oportunidad: Servicios premium</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-primary text-bg-primary rounded-lg font-medium hover:bg-primary-dark transition-colors">
            Exportar Reporte
          </button>
          <button className="px-6 py-3 bg-bg-tertiary text-text-primary border border-border rounded-lg font-medium hover:bg-bg-quaternary transition-colors">
            Configurar Alertas
          </button>
        </div>
      </div>
    </MainLayout>
  )
}

