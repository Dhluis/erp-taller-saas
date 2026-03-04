'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { safeFetch } from '@/lib/api'
import { toast } from 'sonner'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  PlusIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface InventoryItem {
  id: string
  name: string
  unit_price: number
  current_stock: number
}

interface InventoryMovement {
  id: string
  inventory_id: string
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
    total_value_in: number
    total_value_out: number
    total_quantity_in: number
    total_quantity_out: number
  }
}

const EMPTY_STATS: MovementStats = {
  general: {
    total_movements: 0,
    entries_count: 0,
    exits_count: 0,
    adjustments_count: 0,
    total_value_in: 0,
    total_value_out: 0,
    total_quantity_in: 0,
    total_quantity_out: 0,
  },
}

export default function MovimientosInventarioPage() {
  const { currency } = useOrgCurrency()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [stats, setStats] = useState<MovementStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    movement_type: 'all',
    product_search: '',
    start_date: '',
    end_date: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })

  // Modal nuevo movimiento
  const [modalOpen, setModalOpen] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    movement_type: 'entry' as 'entry' | 'exit' | 'adjustment',
    quantity: '',
    unit_cost: '',
    notes: '',
  })

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.limit.toString(),
        sortBy: 'created_at',
        sortOrder: 'desc',
      })
      if (filters.movement_type !== 'all') params.set('movement_type', filters.movement_type)
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date) params.set('end_date', filters.end_date)

      const result = await safeFetch(`/api/inventory/movements?${params}`)
      const raw = result.data
      const inner = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw
      const items: InventoryMovement[] = Array.isArray(inner?.items) ? inner.items : Array.isArray(inner) ? inner : []
      const pag = inner?.pagination ?? null
      const total = pag?.total ?? items.length
      const pages = pag?.totalPages ?? Math.ceil(total / pagination.limit)

      if (result.success) {
        // Client-side filter by product name if search is set
        const filtered = filters.product_search
          ? items.filter(m => m.inventory?.name?.toLowerCase().includes(filters.product_search.toLowerCase()))
          : items
        setMovements(filtered)
        setPagination(p => ({ ...p, total, pages }))
      } else {
        setLoadError(result.error || 'No se pudieron cargar los movimientos')
        setMovements([])
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al cargar movimientos')
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [pagination.page, filters])

  const loadStats = useCallback(async () => {
    try {
      const result = await safeFetch('/api/inventory/movements/stats')
      if (result.success && result.data) {
        const s = (result.data as any)?.data ?? result.data
        if (s?.general) setStats(s)
      }
    } catch { /* stats no críticos */ }
  }, [])

  const loadInventoryItems = useCallback(async (search = '') => {
    const params = new URLSearchParams({ pageSize: '100' })
    if (search) params.set('search', search)
    const result = await safeFetch(`/api/inventory?${params}`)
    const raw = (result.data as any)
    const items: InventoryItem[] = Array.isArray(raw?.data?.items)
      ? raw.data.items
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
          ? raw.data
          : []
    setInventoryItems(items)
  }, [])

  useEffect(() => { loadMovements(); loadStats() }, [loadMovements, loadStats])

  const openModal = () => {
    setForm({ product_id: '', movement_type: 'entry', quantity: '', unit_cost: '', notes: '' })
    setItemSearch('')
    loadInventoryItems()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.product_id) { toast.error('Selecciona un producto'); return }
    if (!form.quantity || Number(form.quantity) <= 0) { toast.error('Ingresa una cantidad válida'); return }
    setSubmitting(true)
    try {
      const result = await safeFetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: form.product_id,
          movement_type: form.movement_type,
          quantity: Number(form.quantity),
          unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
          notes: form.notes || undefined,
        }),
      })
      if (result.success) {
        toast.success('Movimiento registrado exitosamente')
        setModalOpen(false)
        loadMovements()
        loadStats()
      } else {
        toast.error(result.error || 'Error al crear movimiento')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCSV = () => {
    if (movements.length === 0) { toast.error('No hay movimientos para exportar'); return }
    const headers = ['Producto', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Costo Unitario', 'Costo Total', 'Referencia', 'Notas', 'Fecha']
    const rows = movements.map(m => [
      m.inventory?.name ?? 'N/A',
      m.movement_type,
      m.quantity,
      m.previous_stock,
      m.new_stock,
      m.unit_cost ?? '',
      m.total_cost ?? '',
      m.reference_type ?? '',
      m.notes ?? '',
      formatDate(m.created_at),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movimientos-inventario-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV descargado')
  }

  const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; className: string }> = {
      entry: { label: 'Entrada', className: 'text-green-600 border-green-600' },
      exit: { label: 'Salida', className: 'text-red-600 border-red-600' },
      adjustment: { label: 'Ajuste', className: 'text-blue-600 border-blue-600' },
      transfer: { label: 'Transferencia', className: 'text-yellow-600 border-yellow-600' },
    }
    const t = map[type] ?? { label: type, className: '' }
    return <Badge variant="outline" className={t.className}>{t.label}</Badge>
  }

  const selectedItem = inventoryItems.find(i => i.id === form.product_id)

  if (loading && movements.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
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
        <StandardBreadcrumbs currentPage="Movimientos" parentPages={[{ label: 'Inventarios', href: '/inventarios' }]} />

        <PageHeader
          title="Movimientos de Inventario"
          description="Historial completo de entradas, salidas y ajustes de inventario"
          actions={
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={openModal}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Nuevo Movimiento
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Movimientos</p>
                  <p className="text-2xl font-bold">{stats.general.total_movements}</p>
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
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Entradas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.general.entries_count}</p>
                  <p className="text-xs text-muted-foreground">{stats.general.total_quantity_in} unidades</p>
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
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Salidas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.general.exits_count}</p>
                  <p className="text-xs text-muted-foreground">{stats.general.total_quantity_out} unidades</p>
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
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Valor Neto</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(stats.general.total_value_in - stats.general.total_value_out)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Entradas: {formatCurrency(stats.general.total_value_in)}
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
                onValueChange={v => setFilters(p => ({ ...p, movement_type: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Tipo de movimiento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Salida</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar por producto..."
                value={filters.product_search}
                onChange={e => setFilters(p => ({ ...p, product_search: e.target.value }))}
              />
              <Input
                type="date"
                value={filters.start_date}
                onChange={e => setFilters(p => ({ ...p, start_date: e.target.value }))}
              />
              <Input
                type="date"
                value={filters.end_date}
                onChange={e => setFilters(p => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 font-medium">Error al cargar movimientos</p>
                <p className="text-sm text-amber-700 mt-1">{loadError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={loadMovements}>Reintentar</Button>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay movimientos registrados</h3>
                <p className="text-gray-500 mb-4">Usa el botón "Nuevo Movimiento" para registrar entradas, salidas o ajustes de stock.</p>
                <Button onClick={openModal}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Nuevo Movimiento
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-3 font-medium text-muted-foreground">Producto</th>
                        <th className="p-3 font-medium text-muted-foreground">Tipo</th>
                        <th className="p-3 font-medium text-muted-foreground">Cantidad</th>
                        <th className="p-3 font-medium text-muted-foreground">Stock</th>
                        <th className="p-3 font-medium text-muted-foreground">Costo</th>
                        <th className="p-3 font-medium text-muted-foreground">Referencia</th>
                        <th className="p-3 font-medium text-muted-foreground">Notas</th>
                        <th className="p-3 font-medium text-muted-foreground">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(m => (
                        <tr key={m.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-medium">{m.inventory?.name ?? 'Producto desconocido'}</div>
                          </td>
                          <td className="p-3">{getTypeBadge(m.movement_type)}</td>
                          <td className="p-3">
                            <span className={m.movement_type === 'entry' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {m.movement_type === 'entry' ? '+' : '-'}{m.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {m.previous_stock} → <span className="text-foreground font-medium">{m.new_stock}</span>
                          </td>
                          <td className="p-3">
                            <div>{formatCurrency(m.unit_cost)}</div>
                            {m.total_cost && <div className="text-xs text-muted-foreground">Total: {formatCurrency(m.total_cost)}</div>}
                          </td>
                          <td className="p-3 text-muted-foreground">{m.reference_type ?? '-'}</td>
                          <td className="p-3 text-muted-foreground max-w-xs truncate">{m.notes ?? '-'}</td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(m.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Siguiente</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Nuevo Movimiento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Búsqueda de producto */}
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Input
                placeholder="Buscar producto..."
                value={itemSearch}
                onChange={e => { setItemSearch(e.target.value); loadInventoryItems(e.target.value) }}
              />
              {inventoryItems.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {inventoryItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, product_id: item.id })); setItemSearch(item.name) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center ${form.product_id === item.id ? 'bg-primary/10' : ''}`}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">Stock: {item.current_stock}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Stock actual: <span className="font-medium">{selectedItem.current_stock}</span> · Precio: {formatCurrency(selectedItem.unit_price)}
                </p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de movimiento *</Label>
              <Select value={form.movement_type} onValueChange={v => setForm(f => ({ ...f, movement_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Salida</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>

            {/* Costo unitario */}
            <div className="space-y-2">
              <Label>Costo unitario (opcional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unit_cost}
                onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Motivo del movimiento..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Registrar Movimiento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
