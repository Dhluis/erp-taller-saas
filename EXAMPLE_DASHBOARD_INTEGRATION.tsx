// ============================================
// EJEMPLO: Integración completa del Dashboard
// src/app/dashboard/page.tsx
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Users,
  Car
} from 'lucide-react'

interface DashboardStats {
  total: number
  reception: number
  diagnosis: number
  initial_quote: number
  waiting_approval: number
  disassembly: number
  waiting_parts: number
  assembly: number
  testing: number
  ready: number
  completed: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar estadísticas desde la API
  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data)
      } else {
        console.error('Error al cargar stats:', data.error)
      }
    } catch (error) {
      console.error('Error al cargar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar al montar el componente
  useEffect(() => {
    loadStats()
  }, [])

  // Manejar creación exitosa de orden
  const handleOrderCreated = () => {
    console.log('✅ Nueva orden creada, recargando dashboard...')
    loadStats() // Recargar estadísticas
    router.refresh() // Refrescar la página para datos server-side
  }

  // Calcular estadísticas derivadas
  const activeOrders = stats ? stats.total - stats.completed : 0
  const pendingApproval = stats?.waiting_approval || 0
  const inProgress = stats ? (
    stats.diagnosis + 
    stats.disassembly + 
    stats.assembly + 
    stats.testing
  ) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Resumen de órdenes de trabajo y actividad del taller
        </p>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Métricas Principales (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total de Órdenes */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Órdenes Activas
                </CardTitle>
                <Clock className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {loading ? '...' : activeOrders}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  En proceso actualmente
                </p>
              </CardContent>
            </Card>

            {/* Órdenes Completadas */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Completadas
                </CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {loading ? '...' : stats?.completed || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Órdenes finalizadas
                </p>
              </CardContent>
            </Card>

            {/* Esperando Aprobación */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pendientes
                </CardTitle>
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {loading ? '...' : pendingApproval}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Esperando aprobación
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Desglose por Estado */}
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Órdenes por Estado
                </CardTitle>
                <button
                  onClick={loadStats}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  disabled={loading}
                >
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Recepción', value: stats?.reception || 0, color: 'bg-gray-500' },
                    { label: 'Diagnóstico', value: stats?.diagnosis || 0, color: 'bg-purple-500' },
                    { label: 'Cotización', value: stats?.initial_quote || 0, color: 'bg-blue-500' },
                    { label: 'Esperando Aprobación', value: stats?.waiting_approval || 0, color: 'bg-orange-500' },
                    { label: 'Desarmado', value: stats?.disassembly || 0, color: 'bg-pink-500' },
                    { label: 'Esperando Piezas', value: stats?.waiting_parts || 0, color: 'bg-red-500' },
                    { label: 'Armado', value: stats?.assembly || 0, color: 'bg-cyan-500' },
                    { label: 'Pruebas', value: stats?.testing || 0, color: 'bg-teal-500' },
                    { label: 'Listo', value: stats?.ready || 0, color: 'bg-lime-500' },
                    { label: 'Completado', value: stats?.completed || 0, color: 'bg-green-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-gray-700">{item.label}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-full ${item.color} flex items-center justify-end px-2 transition-all duration-500`}
                          style={{
                            width: `${stats?.total ? (item.value / stats.total) * 100 : 0}%`,
                            minWidth: item.value > 0 ? '24px' : '0'
                          }}
                        >
                          {item.value > 0 && (
                            <span className="text-xs font-semibold text-white">
                              {item.value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas Adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  En Reparación
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : inProgress}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Diagnóstico, desarmado, armado y pruebas
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Listos para Entrega
                </CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '...' : stats?.ready || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Vehículos listos para recoger
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Columna Derecha: Acciones Rápidas y Enlaces (1/3) */}
        <div className="space-y-6">
          {/* Acciones Rápidas con Modal */}
          <QuickActions onOrderCreated={handleOrderCreated} />

          {/* Enlaces Rápidos */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-slate-50">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">🔗</span>
                Enlaces Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <a
                href="/clientes"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
              >
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-sm text-gray-900">Clientes</div>
                  <div className="text-xs text-gray-500">Ver todos los clientes</div>
                </div>
              </a>

              <a
                href="/ordenes"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors border border-transparent hover:border-green-200"
              >
                <Car className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm text-gray-900">Órdenes Kanban</div>
                  <div className="text-xs text-gray-500">Tablero de trabajo</div>
                </div>
              </a>

              <a
                href="/reportes"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-200"
              >
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium text-sm text-gray-900">Reportes</div>
                  <div className="text-xs text-gray-500">Análisis y estadísticas</div>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}













