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
import { Plus, Search, RefreshCw, FileText, Edit, Eye, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuotations, type Quotation } from '@/hooks/useQuotations'
import { CreateQuotationModal } from '@/components/quotations/CreateQuotationModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

  // ✅ VALIDACIÓN DEFENSIVA: Garantizar que quotations siempre sea un array
  const safeQuotations: Quotation[] = Array.isArray(quotations) ? quotations : []

  // ✅ Debounce para búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null)
  const [quotationToView, setQuotationToView] = useState<Quotation | null>(null)
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Handlers para acciones
  const handleEdit = (quotation: Quotation) => {
    setQuotationToEdit(quotation)
    setIsEditModalOpen(true)
  }

  const handleView = async (quotation: Quotation) => {
    try {
      // Cargar cotización completa con items
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setQuotationToView(data.data || quotation)
        setIsViewModalOpen(true)
      } else {
        // Si falla, usar la cotización básica
        setQuotationToView(quotation)
        setIsViewModalOpen(true)
      }
    } catch (error) {
      console.error('Error cargando cotización:', error)
      setQuotationToView(quotation)
      setIsViewModalOpen(true)
    }
  }

  const handleDelete = (quotation: Quotation) => {
    setQuotationToDelete(quotation)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!quotationToDelete) return

    setIsDeleting(true)
    try {
      await deleteQuotation(quotationToDelete.id)
      toast.success('Cotización eliminada exitosamente', {
        description: `La cotización ${quotationToDelete.quotation_number} ha sido eliminada permanentemente.`,
        duration: 5000,
        className: 'bg-green-500/10 border-green-500/50 text-green-400 [&>div]:text-green-300'
      })
      setDeleteDialogOpen(false)
      setQuotationToDelete(null)
    } catch (error: any) {
      console.error('Error eliminando cotización:', error)
      const errorMessage = error?.message || 'Error al eliminar cotización'
      
      // Verificar si es error de estado
      if (errorMessage.includes('convertida') || errorMessage.includes('borrador')) {
        toast.error('No se puede eliminar esta cotización', {
          description: errorMessage,
          duration: 6000
        })
      } else {
        toast.error('Error al eliminar cotización', {
          description: errorMessage,
          duration: 6000
        })
      }
    } finally {
      setIsDeleting(false)
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
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  try {
                    // ✅ Usar safeQuotations que ya está validado como array
                    if (safeQuotations.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            {searchTerm || statusFilter
                              ? 'No se encontraron cotizaciones con los filtros aplicados'
                              : 'Crea tu primera cotización para comenzar'}
                          </TableCell>
                        </TableRow>
                      )
                    }
                    
                    return safeQuotations.map((quotation) => (
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(quotation)}
                              disabled={loading}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(quotation)}
                              disabled={loading || quotation.status === 'converted'}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(quotation)}
                              disabled={loading || quotation.status === 'converted' || quotation.status !== 'draft'}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
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

        {/* Modal de editar cotización */}
        <CreateQuotationModal
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open)
            if (!open) setQuotationToEdit(null)
          }}
          quotation={quotationToEdit}
          onSuccess={() => {
            setIsEditModalOpen(false)
            setQuotationToEdit(null)
            refresh()
          }}
        />

        {/* Modal de ver cotización */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl">Detalles de Cotización</DialogTitle>
              <DialogDescription className="text-slate-400">
                {quotationToView?.quotation_number}
              </DialogDescription>
            </DialogHeader>
            {quotationToView && (
              <div className="space-y-6">
                {/* Información General */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Cliente</p>
                    <p className="font-semibold">{quotationToView.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Vehículo</p>
                    <p className="font-semibold">
                      {quotationToView.vehicle
                        ? `${quotationToView.vehicle.brand} ${quotationToView.vehicle.model} - ${quotationToView.vehicle.license_plate}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Estado</p>
                    <Badge className={STATUS_COLORS[quotationToView.status] || 'bg-gray-500'}>
                      {STATUS_LABELS[quotationToView.status] || quotationToView.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Fecha</p>
                    <p className="font-semibold">{formatDate(quotationToView.created_at)}</p>
                  </div>
                  {quotationToView.valid_until && (
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Vigencia</p>
                      <p className="font-semibold">{formatDate(quotationToView.valid_until)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total</p>
                    <p className="font-semibold text-lg text-cyan-400">
                      {formatCurrency(quotationToView.total_amount)}
                    </p>
                  </div>
                </div>

                {/* Descripción y Notas */}
                {(quotationToView.description || quotationToView.notes) && (
                  <div className="space-y-2">
                    {quotationToView.description && (
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Descripción</p>
                        <p className="text-slate-300">{quotationToView.description}</p>
                      </div>
                    )}
                    {quotationToView.notes && (
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Notas</p>
                        <p className="text-slate-300">{quotationToView.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Items */}
                {quotationToView.items && quotationToView.items.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-3">Items de la Cotización</p>
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Descripción</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Cantidad</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Precio Unit.</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotationToView.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-700">
                              <td className="px-4 py-2">{item.item_name}</td>
                              <td className="px-4 py-2 text-slate-400">{item.description || '-'}</td>
                              <td className="px-4 py-2 text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {formatCurrency(item.total_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totales */}
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(quotationToView.subtotal)}</span>
                      </div>
                      {quotationToView.discount && quotationToView.discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Descuento:</span>
                          <span className="font-semibold text-red-400">
                            -{formatCurrency(quotationToView.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">IVA:</span>
                        <span className="font-semibold">{formatCurrency(quotationToView.tax)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2">
                        <span>Total:</span>
                        <span className="text-cyan-400">{formatCurrency(quotationToView.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmación de eliminación */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-slate-900 text-white border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-500 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                ⚠️ Eliminar Cotización
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Esta acción es irreversible. Se eliminará permanentemente la cotización{' '}
                <strong className="text-white">
                  {quotationToDelete?.quotation_number}
                </strong>
                {' '}y todos sus items asociados.
                <br /><br />
                <span className="text-yellow-400 font-semibold">¿Estás seguro de que deseas continuar?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-none">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}
