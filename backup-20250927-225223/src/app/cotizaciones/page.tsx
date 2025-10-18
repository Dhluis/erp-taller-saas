"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Mail,
  ArrowRight,
  Trash2,
  Calendar,
  User,
  Car
} from "lucide-react"
import { getQuotations, createQuotation, updateQuotation, deleteQuotation, getQuotationStats, Quotation, CreateQuotationData, QuotationStats } from "@/lib/supabase/quotations"

interface Quotation {
  id: string
  quotation_number: string
  client_id: string
  vehicle_id: string
  status: string
  valid_until: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  converted_to_order: boolean
  order_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relaciones
  customers?: {
    name: string
    email: string
  }
  vehicles?: {
    brand: string
    model: string
    year: number
    license_plate: string
  }
}

const STATUS_CONFIG = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-800", icon: FileText },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-800", icon: Mail },
  approved: { label: "Aprobada", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Vencida", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  converted: { label: "Convertida", color: "bg-purple-100 text-purple-800", icon: ArrowRight }
}

export default function CotizacionesPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState<QuotationStats>({
    totalQuotations: 0,
    draftQuotations: 0,
    sentQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    expiredQuotations: 0,
    totalValue: 0,
    conversionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [quotationsData, statsData] = await Promise.all([
        getQuotations(),
        getQuotationStats()
      ])
      
      // Si no hay cotizaciones, usar datos mock
      if (quotationsData.length === 0) {
        console.log('Using mock data for quotations')
        const mockQuotations = [
          {
            id: "Q001",
            quotation_number: "COT-2024-001",
            client_id: "C001",
            vehicle_id: "V001",
            status: "sent" as const,
            valid_until: "2024-02-15T00:00:00Z",
            subtotal: 2500,
            discount_amount: 250,
            tax_amount: 360,
            total: 2610,
            converted_to_order: false,
            notes: "Cliente interesado en el paquete completo",
            created_at: "2024-01-15T00:00:00Z",
            updated_at: "2024-01-15T00:00:00Z",
            customers: {
              name: "Juan Pérez",
              email: "juan@email.com"
            },
            vehicles: {
              brand: "Toyota",
              model: "Corolla",
              year: 2020,
              license_plate: "ABC-123"
            }
          },
          {
            id: "Q002",
            quotation_number: "COT-2024-002",
            client_id: "C002",
            vehicle_id: "V002",
            status: "accepted" as const,
            valid_until: "2024-02-10T00:00:00Z",
            subtotal: 1800,
            discount_amount: 0,
            tax_amount: 288,
            total: 2088,
            converted_to_order: true,
            order_id: "WO001",
            notes: "Cliente aprobó inmediatamente",
            created_at: "2024-01-10T00:00:00Z",
            updated_at: "2024-01-12T00:00:00Z",
            customers: {
              name: "María García",
              email: "maria@email.com"
            },
            vehicles: {
              brand: "Honda",
              model: "Civic",
              year: 2019,
              license_plate: "XYZ-789"
            }
          }
        ]
        setQuotations(mockQuotations)
        setStats({
          totalQuotations: mockQuotations.length,
          draftQuotations: mockQuotations.filter(q => q.status === 'draft').length,
          sentQuotations: mockQuotations.filter(q => q.status === 'sent').length,
          acceptedQuotations: mockQuotations.filter(q => q.status === 'accepted').length,
          rejectedQuotations: mockQuotations.filter(q => q.status === 'rejected').length,
          expiredQuotations: mockQuotations.filter(q => q.status === 'expired').length,
          totalValue: mockQuotations.reduce((sum, q) => sum + q.total, 0),
          conversionRate: (mockQuotations.filter(q => q.converted_to_order).length / mockQuotations.length) * 100
        })
      } else {
        setQuotations(quotationsData)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // En caso de error, usar datos mock
      const mockQuotations = [
        {
          id: "Q001",
          quotation_number: "COT-2024-001",
          client_id: "C001",
          vehicle_id: "V001",
          status: "sent" as const,
          valid_until: "2024-02-15T00:00:00Z",
          subtotal: 2500,
          discount_amount: 250,
          tax_amount: 360,
          total: 2610,
          converted_to_order: false,
          notes: "Cliente interesado en el paquete completo",
          created_at: "2024-01-15T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
          customers: {
            name: "Juan Pérez",
            email: "juan@email.com"
          },
          vehicles: {
            brand: "Toyota",
            model: "Corolla",
            year: 2020,
            license_plate: "ABC-123"
          }
        }
      ]
      setQuotations(mockQuotations)
      setStats({
        totalQuotations: 1,
        draftQuotations: 0,
        sentQuotations: 1,
        acceptedQuotations: 0,
        rejectedQuotations: 0,
        expiredQuotations: 0,
        totalValue: 2610,
        conversionRate: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const getQuotationsByStatus = (status: string) => {
    return quotations.filter(q => q.status === status)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
    return (
      <Badge variant="outline" className={config.color}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  const handleStatusChange = async (quotationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Error al actualizar estado')

      loadQuotations()
      loadMetrics()
    } catch (error) {
      console.error('Error updating quotation status:', error)
    }
  }

  const handleDelete = async (quotationId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return

    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar cotización')

      loadQuotations()
      loadMetrics()
    } catch (error) {
      console.error('Error deleting quotation:', error)
    }
  }

  const handleConvertToOrder = async (quotationId: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/convert`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Error al convertir cotización')

      const data = await response.json()
      alert(`Cotización convertida a orden: ${data.order_id}`)
      loadQuotations()
      loadMetrics()
    } catch (error) {
      console.error('Error converting quotation:', error)
    }
  }

  const QuotationRow = ({ quotation }: { quotation: Quotation }) => {
    const isQuotationExpired = isExpired(quotation.valid_until)
    const currentStatus = isQuotationExpired && quotation.status === 'sent' ? 'expired' : quotation.status

    return (
      <TableRow>
        <TableCell className="font-medium">
          {quotation.quotation_number}
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{quotation.customers?.name}</p>
            <p className="text-sm text-muted-foreground">{quotation.customers?.email}</p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {quotation.vehicles?.brand} {quotation.vehicles?.model} {quotation.vehicles?.year}
              </p>
              <p className="text-xs text-muted-foreground">{quotation.vehicles?.license_plate}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatDate(quotation.created_at)}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className={`flex items-center gap-2 ${isQuotationExpired ? 'text-red-600' : ''}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formatDate(quotation.valid_until)}</span>
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(quotation.total)}
        </TableCell>
        <TableCell>
          {getStatusBadge(currentStatus)}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cotizaciones/${quotation.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver PDF
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/cotizaciones/${quotation.id}/editar`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(quotation.id, 'sent')}>
                <Mail className="h-4 w-4 mr-2" />
                Enviar por Email
              </DropdownMenuItem>
              {quotation.status === 'approved' && !quotation.converted_to_order && (
                <DropdownMenuItem onClick={() => handleConvertToOrder(quotation.id)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convertir a Orden
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => handleDelete(quotation.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cotizaciones</h2>
          <p className="text-muted-foreground">
            Gestiona las cotizaciones de servicios y productos
          </p>
        </div>
        <Link href="/cotizaciones/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMonth}</div>
            <p className="text-xs text-muted-foreground">
              Cotizaciones generadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingResponse}</div>
            <p className="text-xs text-muted-foreground">
              Sin respuesta del cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approved}</div>
            <p className="text-xs text-muted-foreground">
              Listas para convertir
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Tasa de conversión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Valor cotizado del mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs y Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
          <CardDescription>
            Gestiona todas las cotizaciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Todas ({quotations.length})</TabsTrigger>
              <TabsTrigger value="draft">Borradores ({getQuotationsByStatus('draft').length})</TabsTrigger>
              <TabsTrigger value="sent">Enviadas ({getQuotationsByStatus('sent').length})</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas ({getQuotationsByStatus('approved').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas ({getQuotationsByStatus('rejected').length})</TabsTrigger>
              <TabsTrigger value="expired">Vencidas ({getQuotationsByStatus('expired').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead>Válida Hasta</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((quotation) => (
                      <QuotationRow key={quotation.id} quotation={quotation} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {Object.keys(STATUS_CONFIG).map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead>Válida Hasta</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getQuotationsByStatus(status).map((quotation) => (
                        <QuotationRow key={quotation.id} quotation={quotation} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {quotations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay cotizaciones registradas</p>
              <p className="text-sm">Haz clic en "Nueva Cotización" para comenzar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

