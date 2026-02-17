'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { safeFetch } from '@/lib/api'
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  PlusIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface InventoryMovement {
  id: string
  product_id: string
  movement_type: 'entry' | 'exit' | 'adjustment' | 'transfer'
  quantity: number
  previous_stock: number
  new_stock: number
  reference_type: string | null
  reference_id: string | null
  unit_cost: number | null
  total_cost: number | null
  notes: string | null
  created_at: string
  inventory: { id: string; name: string; unit_price: string; current_stock: number } | null
}

interface MovementStats {
  general: {
    total_movements: number
    entries_count: number
    exits_count: number
    adjustments_count: number
    transfers_count: number
    total_value_in: number
    total_value_out: number
    total_quantity_in: number
    total_quantity_out: number
  }
  by_reference: {
    purchase_order: number
    work_order: number
    adjustment: number
    transfer: number
    initial: number
  }
}

export default function MovimientosInventarioPage() {
  const { currency } = useOrgCurrency()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [stats, setStats] = useState<MovementStats>({
    general: {
      total_movements: 0,
      entries_count: 0,
      exits_count: 0,
      adjustments_count: 0,
      transfers_count: 0,
      total_value_in: 0,
      total_value_out: 0,
      total_quantity_in: 0,
      total_quantity_out: 0
    },
    by_reference: {
      purchase_order: 0,
      work_order: 0,
      adjustment: 0,
      transfer: 0,
      initial: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    movement_type: 'all',
    product_id: '',
    start_date: '',
    end_date: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadMovements = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.limit.toString(),
        sortBy: 'created_at',
        sortOrder: 'desc',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all'))
      })

      const result = await safeFetch(`/api/inventory/movements?${params}`)

      // Parseo defensivo: safeFetch pone el body completo en result.data
      // Body puede ser { success, data: { items, pagination } } o directamente { items, pagination }
      const raw = result.data
      const inner = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data?: unknown }).data : raw
      const payload = inner && typeof inner === 'object' ? inner as { items?: unknown[]; pagination?: { total?: number; totalPages?: number; page?: number } } : null
      const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : Array.isArray((raw as { items?: unknown[] })?.items)
            ? (raw as { items: unknown[] }).items
            : []
      const paginationData = payload?.pagination ?? (raw && typeof raw === 'object' && 'pagination' in raw ? (raw as { pagination: { total?: number; totalPages?: number } }).pagination : null)
      const total = paginationData?.total ?? items.length
      const totalPages = paginationData?.totalPages ?? Math.ceil(total / pagination.limit)

      if (result.success) {
        setMovements((items || []) as InventoryMovement[])
        setPagination(prev => ({ ...prev, total, pages: totalPages }))
      } else {
        setLoadError(result.error || 'No se pudieron cargar los movimientos')
        setMovements([])
        setPagination(prev => ({ ...prev, total: 0, pages: 0 }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar movimientos'
      setLoadError(message)
      setMovements([])
      setPagination(prev => ({ ...prev, total: 0, pages: 0 }))
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all'))
      )

      console.log('🔄 [Movimientos] Cargando estadísticas:', params.toString())

      const result = await safeFetch(`/api/inventory/movements/stats?${params}`)
      
      if (result.success && result.data) {
        // ✅ Manejar estructura de respuesta
        const statsData = result.data?.data || result.data
        if (statsData && statsData.general) {
          console.log('✅ [Movimientos] Estadísticas cargadas:', statsData.general)
          setStats(statsData)
        }
      } else {
        console.error('❌ [Movimientos] Error cargando estadísticas:', result.error)
        // Mantener valores por defecto (ya inicializados)
      }
    } catch (error) {
      console.error('❌ [Movimientos] Error loading stats:', error)
      // Mantener valores por defecto (ya inicializados)
    }
  }

  useEffect(() => {
    loadMovements()
    loadStats()
  }, [pagination.page, filters])

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />
      case 'exit':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />
      case 'adjustment':
        return <AdjustmentsHorizontalIcon className="h-4 w-4 text-blue-500" />
      case 'transfer':
        return <ArrowPathIcon className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'entry':
        return 'Entrada'
      case 'exit':
        return 'Salida'
      case 'adjustment':
        return 'Ajuste'
      case 'transfer':
        return 'Transferencia'
      default:
        return type
    }
  }

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'entry':
        return <Badge variant="outline" className="text-green-600 border-green-600">Entrada</Badge>
      case 'exit':
        return <Badge variant="outline" className="text-red-600 border-red-600">Salida</Badge>
      case 'adjustment':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Ajuste</Badge>
      case 'transfer':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Transferencia</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && movements.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <StandardBreadcrumbs 
          currentPage="Movimientos"
          parentPages={[
            { label: 'Inventarios', href: '/inventarios' }
          ]}
        />

        <PageHeader
          title="Movimientos de Inventario"
          description="Historial completo de entradas, salidas y ajustes de inventario"
          actions={
            <div className="flex space-x-2">
              <Button variant="outline">
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Nuevo Movimiento
              </Button>
            </div>
          }
        />

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Movimientos</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {stats?.general?.total_movements ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <ArrowPathIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Entradas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.general?.entries_count ?? 0}
                  </p>
                  <p className="text-xs text-text-muted">
                    {stats?.general?.total_quantity_in ?? 0} unidades
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-100">
                  <ArrowUpIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Salidas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.general?.exits_count ?? 0}
                  </p>
                  <p className="text-xs text-text-muted">
                    {stats?.general?.total_quantity_out ?? 0} unidades
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-100">
                  <ArrowDownIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Valor Neto</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency((stats?.general?.total_value_in ?? 0) - (stats?.general?.total_value_out ?? 0))}
                  </p>
                  <p className="text-xs text-text-muted">
                    Entradas: {formatCurrency(stats?.general?.total_value_in ?? 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5" />
              <span>Filtros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.movement_type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, movement_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de movimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Salida</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="ID del producto"
                value={filters.product_id}
                onChange={(e) => setFilters(prev => ({ ...prev, product_id: e.target.value }))}
              />

              <Input
                type="date"
                placeholder="Fecha inicio"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              />

              <Input
                type="date"
                placeholder="Fecha fin"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

            {/* Tabla de movimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {(movements || []).length === 0 ? (
              <div className="text-center py-12">
                {loadError ? (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <p className="text-amber-800 font-medium">Error al cargar movimientos</p>
                    <p className="text-sm text-amber-700 mt-1">{loadError}</p>
                    <p className="text-xs text-amber-600 mt-2">Comprueba tu sesión o vuelve a intentar.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-400 mb-4">
                      <ArrowPathIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay movimientos de inventario
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Los movimientos de inventario aparecerán aquí cuando se registren entradas, salidas o ajustes de stock.
                    </p>
                  </>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mt-4">
                  <h4 className="font-medium text-blue-900 mb-2">Para crear movimientos:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Ve a la sección de Productos</li>
                    <li>2. Selecciona un producto y crea un movimiento</li>
                    <li>3. Los movimientos aparecerán automáticamente aquí</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Producto</th>
                    <th className="text-left p-4">Tipo</th>
                    <th className="text-left p-4">Cantidad</th>
                    <th className="text-left p-4">Stock</th>
                    <th className="text-left p-4">Costo</th>
                    <th className="text-left p-4">Referencia</th>
                    <th className="text-left p-4">Fecha</th>
                    <th className="text-left p-4">Usuario</th>
                    <th className="text-left p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(movements || []).map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">
                            {movement.inventory?.name || 'Producto desconocido'}
                          </div>
                          <div className="text-sm text-text-muted">
                            ID: {(movement.inventory?.id || movement.inventory_id || 'N/A').slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {getMovementTypeIcon(movement.movement_type)}
                          {getMovementTypeBadge(movement.movement_type)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={movement.movement_type === 'entry' ? 'text-green-600' : 'text-red-600'}>
                          {movement.movement_type === 'entry' ? '+' : '-'}{movement.quantity}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div>{movement.previous_stock} → {movement.new_stock}</div>
                          <div className="text-text-muted">Stock actualizado</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div>{formatCurrency(movement.unit_cost)}</div>
                          <div className="text-sm text-text-muted">
                            Total: {formatCurrency(movement.total_cost)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {movement.reference_type && (
                          <div className="text-sm">
                            <div className="font-medium">{movement.reference_type}</div>
                            {movement.reference_id && (
                              <div className="text-text-muted">{movement.reference_id.slice(0, 8)}...</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{formatDate(movement.created_at)}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-text-secondary">
                          Sistema
                        </div>
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Paginación */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-text-muted">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} movimientos
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
