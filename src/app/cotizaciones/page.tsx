'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CreateQuotationModal } from '@/components/quotations/CreateQuotationModal'
import { QuotationPreview } from '@/components/quotations/QuotationPreview'

// Disable static generation
export const dynamic = 'force-dynamic'

interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  vehicle_id: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted'
  valid_until: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  created_at: string
  customers?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  vehicles?: {
    id: string
    brand: string
    model: string
    license_plate: string
    year?: number
  }
  quotation_items?: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
}

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
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)

  // Cargar cotizaciones
  const loadQuotations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      const response = await fetch(`/api/quotations?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Error al cargar cotizaciones')
      }

      const result = await response.json()
      if (result.success) {
        setQuotations(result.data || [])
      } else {
        throw new Error(result.error || 'Error al cargar cotizaciones')
      }
    } catch (error: any) {
      console.error('Error cargando cotizaciones:', error)
      toast.error(error.message || 'Error al cargar cotizaciones')
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuotations()
  }, [statusFilter])

  // Buscar cotizaciones
  const handleSearch = () => {
    loadQuotations()
  }

  // Eliminar cotización
  const handleDelete = async (quotation: Quotation) => {
    if (quotation.status !== 'draft') {
      toast.error('Solo se pueden eliminar cotizaciones en estado borrador')
      return
    }

    if (!confirm(`¿Estás seguro de eliminar la cotización ${quotation.quotation_number}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar cotización')
      }

      toast.success('Cotización eliminada exitosamente')
      loadQuotations()
    } catch (error: any) {
      console.error('Error eliminando cotización:', error)
      toast.error(error.message || 'Error al eliminar cotización')
    }
  }

  // Cambiar estado
  const handleStatusChange = async (quotationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar estado')
      }

      toast.success('Estado actualizado exitosamente')
      loadQuotations()
    } catch (error: any) {
      console.error('Error actualizando estado:', error)
      toast.error(error.message || 'Error al actualizar estado')
    }
  }

  // Ver cotización
  const handleView = async (quotation: Quotation) => {
    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al cargar cotización')
      }

      const result = await response.json()
      if (result.success) {
        setSelectedQuotation(result.data)
        setIsPreviewOpen(true)
      }
    } catch (error: any) {
      console.error('Error cargando cotización:', error)
      toast.error(error.message || 'Error al cargar cotización')
    }
  }

  // Editar cotización
  const handleEdit = async (quotation: Quotation) => {
    if (quotation.status !== 'draft') {
      toast.error('Solo se pueden editar cotizaciones en estado borrador')
      return
    }

    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al cargar cotización')
      }

      const result = await response.json()
      if (result.success) {
        setEditingQuotation(result.data)
        setIsCreateModalOpen(true)
      }
    } catch (error: any) {
      console.error('Error cargando cotización:', error)
      toast.error(error.message || 'Error al cargar cotización')
    }
  }

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
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Cotizaciones</h1>
            <p className="text-text-secondary mt-1">
              Administra cotizaciones y presupuestos
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
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
          <Button variant="outline" onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button variant="outline" onClick={loadQuotations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>

        {/* Tabla de cotizaciones */}
        <div className="border rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-text-secondary">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Cargando cotizaciones...</p>
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No hay cotizaciones</p>
              <p className="text-sm mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'No se encontraron cotizaciones con los filtros aplicados'
                  : 'Crea tu primera cotización para comenzar'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Cotización
                </Button>
              )}
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">
                      {quotation.quotation_number}
                    </TableCell>
                    <TableCell>
                      {quotation.customers?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {quotation.vehicles
                        ? `${quotation.vehicles.brand} ${quotation.vehicles.model} - ${quotation.vehicles.license_plate}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(quotation.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_COLORS[quotation.status]}
                      >
                        {STATUS_LABELS[quotation.status]}
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
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(quotation)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          {quotation.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleEdit(quotation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {quotation.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(quotation)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                          {quotation.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(quotation.id, 'sent')}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Enviar
                            </DropdownMenuItem>
                          )}
                          {quotation.status === 'sent' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(quotation.id, 'approved')}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Marcar como Aprobada
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Modal de crear/editar */}
        <CreateQuotationModal
          open={isCreateModalOpen}
          onOpenChange={(open) => {
            setIsCreateModalOpen(open)
            if (!open) {
              setEditingQuotation(null)
            }
          }}
          quotation={editingQuotation}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            setEditingQuotation(null)
            loadQuotations()
          }}
        />

        {/* Modal de vista previa */}
        {selectedQuotation && (
          <QuotationPreview
            quotation={selectedQuotation}
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
          />
        )}
      </div>
    </AppLayout>
  )
}
