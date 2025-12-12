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
import { Plus, Search, RefreshCw, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSession } from '@/lib/context/SessionContext'
import { CreateQuotationModal } from '@/components/quotations/CreateQuotationModal'

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
  const session = useSession()
  const organizationId = session?.organizationId || null
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Cargar cotizaciones
  const loadQuotations = async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      const url = `/api/quotations?${params.toString()}`
      console.log('[Cotizaciones] 🔍 Cargando con parámetros:', { statusFilter, searchTerm, url })

      const response = await fetch(url, {
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
    if (organizationId) {
      console.log('[Cotizaciones] 🔄 useEffect ejecutado - Recargando cotizaciones', { organizationId, statusFilter, searchTerm });
      loadQuotations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter])

  // Buscar cotizaciones
  const handleSearch = () => {
    loadQuotations()
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
          <Select 
            value={statusFilter} 
            onValueChange={(value) => {
              console.log('[Cotizaciones] 🎯 Select cambió a:', value);
              setStatusFilter(value);
              // El useEffect se ejecutará automáticamente cuando statusFilter cambie
            }}
          >
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
                      <Badge className={STATUS_COLORS[quotation.status]}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Modal de crear cotización */}
        <CreateQuotationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          quotation={null}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            loadQuotations()
          }}
        />
      </div>
    </AppLayout>
  )
}
