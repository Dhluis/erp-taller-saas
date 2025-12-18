'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Plus, Search, RefreshCw, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuotations, type Quotation } from '@/hooks/useQuotations'
import { CreateQuotationModal } from '@/components/quotations/CreateQuotationModal'

export const dynamic = 'force-dynamic'

const STATUS_COLORS = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-orange-500',
  converted: 'bg-purple-500',
}

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  converted: 'Convertida',
}

export default function QuotationsPage() {
  // ✅ Hook con paginación
  const {
    quotations,
    loading,
    error,
    pagination,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    setSearch,
    setFilters,
    refresh,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    approveQuotation,
    rejectQuotation
  } = useQuotations({
    page: 1,
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
    autoLoad: true
  })

  // ✅ SOLUCIÓN DEFINITIVA: Forzar array con validación estricta
  const safeQuotations: Quotation[] = (() => {
    try {
      if (Array.isArray(quotations)) {
        return quotations
      }
      return []
    } catch {
      return []
    }
  })()

  // ✅ Debounce para búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Sincronizar búsqueda con debounce
  useEffect(() => {
    setSearch(debouncedSearch)
  }, [debouncedSearch, setSearch])

  // Sincronizar filtro de status
  useEffect(() => {
    if (statusFilter && statusFilter !== 'all') {
      setFilters({ status: statusFilter })
    } else {
      setFilters({})
    }
  }, [statusFilter, setFilters])

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
    } catch {
      return dateString
    }
  }

  return (
    <AppLayout
      title="Cotizaciones"
      breadcrumbs={[{ label: 'Cotizaciones', href: '/cotizaciones' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Cotizaciones</h1>
              <p className="text-text-secondary mt-1">
                Administra cotizaciones y presupuestos
              </p>
            </div>
            {!loading && pagination && pagination.total > 0 && (
              <div className="text-sm text-muted-foreground">
                Total: {pagination.total} | Página {pagination.page} de {pagination.totalPages}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, descripción o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
              className="pl-10"
            />
          </div>
          <Select 
            value={statusFilter || 'all'} 
            onValueChange={(value) => {
              setStatusFilter(value === 'all' ? '' : value)
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="approved">Aprobada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
              <SelectItem value="expired">Vencida</SelectItem>
              <SelectItem value="converted">Convertida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de cotizaciones */}
        <div className="border rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-text-secondary">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Cargando cotizaciones...</p>
            </div>
          ) : safeQuotations.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No hay cotizaciones</p>
              <p className="text-sm mb-4">
                {searchTerm || statusFilter
                  ? 'No se encontraron cotizaciones con los filtros aplicados'
                  : 'Crea tu primera cotización para comenzar'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vigencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  try {
                    // ✅ FORZAR array antes de map
                    const items = Array.isArray(safeQuotations) ? safeQuotations : []
                    if (items.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No hay cotizaciones para mostrar
                          </TableCell>
                        </TableRow>
                      )
                    }
                    return items.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-medium">
                          {quotation.quotation_number}
                        </TableCell>
                        <TableCell>
                          {quotation.customer?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {quotation.vehicle
                            ? `${quotation.vehicle.brand} ${quotation.vehicle.model} - ${quotation.vehicle.license_plate}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(quotation.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[quotation.status] || 'bg-gray-500'}>
                            {STATUS_LABELS[quotation.status] || quotation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(quotation.created_at)}
                        </TableCell>
                        <TableCell>
                          {quotation.valid_until
                            ? formatDate(quotation.valid_until)
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  } catch (error) {
                    console.error('❌ [QuotationsPage] Error en renderizado:', error)
                    return (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-red-500">
                          Error al renderizar cotizaciones
                        </TableCell>
                      </TableRow>
                    )
                  }
                })()}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
              loading={loading}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}

        {/* Modal de crear cotización */}
        <CreateQuotationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          quotation={null}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            refresh()
          }}
        />
      </div>
    </AppLayout>
  )
}
