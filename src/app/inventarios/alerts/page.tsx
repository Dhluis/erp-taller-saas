'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'

interface LowStockItem {
  id: string
  name: string
  sku: string
  quantity: number
  minimum_stock: number
  unit_price: number
  deficit: number
  status: 'out_of_stock' | 'low_stock'
  inventory_categories: {
    name: string
  } | null
}

export default function InventarioAlertsPage() {
  const [loading, setLoading] = useState(true)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])

  // Simular carga de datos
  useEffect(() => {
    const timer = setTimeout(() => {
      setLowStockItems([
        {
          id: '1',
          name: 'Filtro de Aire Motor',
          sku: 'FA-001',
          quantity: 0,
          minimum_stock: 5,
          unit_price: 450.00,
          deficit: 5,
          status: 'out_of_stock',
          inventory_categories: { name: 'Filtros' }
        },
        {
          id: '2',
          name: 'Aceite Motor 5W-30',
          sku: 'AM-002',
          quantity: 2,
          minimum_stock: 10,
          unit_price: 280.00,
          deficit: 8,
          status: 'low_stock',
          inventory_categories: { name: 'Aceites' }
        },
        {
          id: '3',
          name: 'Pastillas de Freno Delanteras',
          sku: 'PF-003',
          quantity: 1,
          minimum_stock: 8,
          unit_price: 1200.00,
          deficit: 7,
          status: 'low_stock',
          inventory_categories: { name: 'Frenos' }
        },
        {
          id: '4',
          name: 'Batería 12V 60Ah',
          sku: 'BT-004',
          quantity: 0,
          minimum_stock: 3,
          unit_price: 2500.00,
          deficit: 3,
          status: 'out_of_stock',
          inventory_categories: { name: 'Eléctrico' }
        },
        {
          id: '5',
          name: 'Amortiguadores Delanteros',
          sku: 'AM-005',
          quantity: 2,
          minimum_stock: 6,
          unit_price: 1800.00,
          deficit: 4,
          status: 'low_stock',
          inventory_categories: { name: 'Suspensión' }
        }
      ])
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Inventario', href: '/inventario' },
    { label: 'Alertas de Stock' }
  ]

  return (
    <MainLayout 
      title="Alertas de Inventario"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Alertas de Inventario
            </h1>
            <p className="text-text-secondary mt-2">
              Monitoreo de productos con stock crítico y bajo
            </p>
          </div>
        </div>

        {/* Low Stock Alert Component */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <LowStockAlert items={lowStockItems} loading={loading} />
          </div>

          {/* Additional Info Panel */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                📊 Resumen Rápido
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Total de Alertas</span>
                  <span className="text-text-primary font-bold">
                    {lowStockItems.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Sin Stock</span>
                  <span className="text-error font-bold">
                    {lowStockItems.filter(item => item.status === 'out_of_stock').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Stock Bajo</span>
                  <span className="text-warning font-bold">
                    {lowStockItems.filter(item => item.status === 'low_stock').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Costo Total Reposición</span>
                  <span className="text-primary font-bold">
                    ${lowStockItems.reduce((sum, item) => sum + (item.deficit * item.unit_price), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                ⚡ Acciones Rápidas
              </h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-primary text-bg-primary rounded-lg font-medium hover:bg-primary-light transition-colors">
                  Generar Orden de Compra
                </button>
                <button className="w-full px-4 py-3 bg-bg-tertiary text-text-primary border border-border rounded-lg font-medium hover:bg-bg-quaternary transition-colors">
                  Exportar Reporte
                </button>
                <button className="w-full px-4 py-3 bg-bg-tertiary text-text-primary border border-border rounded-lg font-medium hover:bg-bg-quaternary transition-colors">
                  Configurar Alertas
                </button>
              </div>
            </div>

            {/* Categories Breakdown */}
            <div className="bg-bg-secondary rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                📦 Por Categoría
              </h3>
              <div className="space-y-3">
                {['Filtros', 'Aceites', 'Frenos', 'Eléctrico', 'Suspensión'].map((category, index) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-text-secondary">{category}</span>
                    <span className="text-text-primary font-bold">
                      {lowStockItems.filter(item => item.inventory_categories?.name === category).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-primary text-bg-primary rounded-lg font-medium hover:bg-primary-light transition-colors">
            Generar Orden de Compra Automática
          </button>
          <button className="px-6 py-3 bg-bg-tertiary text-text-primary border border-border rounded-lg font-medium hover:bg-bg-quaternary transition-colors">
            Configurar Umbrales de Stock
          </button>
        </div>
      </div>
    </MainLayout>
  )
}

