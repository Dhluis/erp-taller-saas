"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { OrderItemsManager } from "@/components/orders/order-items-manager"
import { useToast } from "@/components/ui/use-toast"
import { safeFetch, safePatch } from "@/lib/api"
import { PageHeader } from '@/components/navigation/page-header'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Car, 
  Wrench, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react"

interface WorkOrder {
  id: string
  order_number?: string
  customer_id: string
  vehicle_id: string
  status: string
  description: string
  estimated_cost?: number
  final_cost?: number
  total_amount?: number
  entry_date: string
  estimated_completion?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relaciones
  customer?: {
    name: string
    email?: string
    phone?: string
  }
  vehicle?: {
    brand: string
    model: string
    year: number
    license_plate: string
    vin?: string
  }
  order_items?: Array<any>
}

// API Response Types
interface OrderResponse {
  success: boolean
  data: WorkOrder
  error?: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.id as string

  const [order, setOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orderTotal, setOrderTotal] = useState(0)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const result = await safeFetch<OrderResponse>(`/api/orders/${orderId}`)
      
      if (!result.success) {
        if (result.status === 404) {
          toast({
            title: "Orden no encontrada",
            description: "La orden solicitada no existe",
            variant: "destructive"
          })
          router.push('/ordenes')
        } else if (result.status === 403) {
          toast({
            title: "Sin permisos",
            description: "No tienes permiso para ver esta orden",
            variant: "destructive"
          })
          router.push('/ordenes')
        } else {
          toast({
            title: "Error al cargar orden",
            description: result.error || "No se pudo cargar la orden",
            variant: "destructive"
          })
        }
        setLoading(false)
        return
      }
      
      if (result.data?.success) {
        const orderData = result.data.data
        // Asegurar que order_items sea un array
        if (orderData && !Array.isArray(orderData.order_items)) {
          orderData.order_items = orderData.order_items || []
        }
        setOrder(orderData)
      } else {
        toast({
          title: "Error",
          description: result.data?.error || "Error al obtener datos de la orden",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading order:', error)
      toast({
        title: "Error",
        description: "Error inesperado al cargar la orden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTotalChange = (newTotal: number) => {
    setOrderTotal(newTotal)
    // Actualizar el total en la base de datos
    updateOrderTotal(newTotal)
  }

  const updateOrderTotal = async (total: number) => {
    try {
      setSaving(true)
      const result = await safePatch(`/api/orders/${orderId}`, { total_amount: total })

      if (!result.success) {
        toast({
          title: "Error al actualizar total",
          description: result.error || "No se pudo actualizar el costo final",
          variant: "destructive"
        })
        return
      }

      if (result.data?.success) {
        // Actualizar el estado local con los nuevos datos
        setOrder(prev => prev ? { ...prev, final_cost: total, total_amount: total } : null)
        toast({
          title: "Total actualizado",
          description: "El costo final se ha actualizado correctamente"
        })
      } else {
        toast({
          title: "Error",
          description: result.data?.error || "Error al actualizar el costo",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating order total:', error)
      toast({
        title: "Error",
        description: "Error inesperado al actualizar el total",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      reception: { label: 'Recepción', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      diagnostic: { label: 'Diagnóstico', variant: 'primary' as const, color: 'bg-blue-100 text-blue-800' },
      approval: { label: 'Aprobación', variant: 'warning' as const, color: 'bg-yellow-100 text-yellow-800' },
      repair: { label: 'Reparación', variant: 'primary' as const, color: 'bg-orange-100 text-orange-800' },
      parts: { label: 'Esperando Repuestos', variant: 'info' as const, color: 'bg-purple-100 text-purple-800' },
      quality: { label: 'Control de Calidad', variant: 'info' as const, color: 'bg-indigo-100 text-indigo-800' },
      delivery: { label: 'Listo para Entrega', variant: 'success' as const, color: 'bg-green-100 text-green-800' },
      completed: { label: 'Completado', variant: 'success' as const, color: 'bg-green-100 text-green-800' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.reception
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'delivery':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'reception':
        return <Clock className="h-5 w-5 text-gray-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />
    }
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cargando...</h2>
              <p className="text-muted-foreground">Obteniendo detalles de la orden</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Orden no encontrada</h2>
              <p className="text-muted-foreground">La orden solicitada no existe</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Page Header con Breadcrumbs */}
      <PageHeader
        title={`Orden ${order.order_number ? `#${order.order_number}` : order.id.substring(0, 8)}`}
        description={`${order.customer?.name} - ${order.vehicle?.brand} ${order.vehicle?.model} ${order.vehicle?.year}`}
        breadcrumbs={[
          { label: 'Órdenes', href: '/ordenes' },
          { label: order.order_number ? `#${order.order_number}` : order.id.substring(0, 8), href: `/ordenes/${order.id}` }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            {getStatusBadge(order.status)}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Información de la Orden */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información de la Orden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.order_number && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Número:</span>
                <span className="text-sm">#{order.order_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium">Estado:</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Fecha de Entrada:</span>
              <span className="text-sm">{formatDate(order.entry_date)}</span>
            </div>
            {order.estimated_completion && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Fecha Estimada:</span>
                <span className="text-sm">{formatDate(order.estimated_completion)}</span>
              </div>
            )}
            {order.completed_at && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Completada:</span>
                <span className="text-sm">{formatDate(order.completed_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{order.customer?.name}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.email}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.phone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Información del Vehículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">
                {order.vehicle?.brand} {order.vehicle?.model} {order.vehicle?.year}
              </p>
              <p className="text-sm text-muted-foreground">
                Placas: {order.vehicle?.license_plate}
              </p>
              <p className="text-sm text-muted-foreground">
                VIN: {order.vehicle?.vin}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Descripción y Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Descripción del Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{order.description}</p>
          {order.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="font-medium mb-2">Notas Adicionales</h4>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Servicios y Productos */}
      <OrderItemsManager 
        orderId={orderId} 
        onTotalChange={handleTotalChange}
      />

      {/* Resumen de Costos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen de Costos
            {saving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Guardando...
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Costo Estimado:</span>
                <span className="text-sm">{formatCurrency(order.estimated_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Costo Final:</span>
                <span className="text-sm font-bold">{formatCurrency(orderTotal || order.final_cost)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Diferencia:</span>
                <span className={`text-sm ${(orderTotal || order.final_cost) - order.estimated_cost >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency((orderTotal || order.final_cost) - order.estimated_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Variación:</span>
                <span className={`text-sm ${(orderTotal || order.final_cost) - order.estimated_cost >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {order.estimated_cost > 0 ? 
                    `${(((orderTotal || order.final_cost) - order.estimated_cost) / order.estimated_cost * 100).toFixed(1)}%` : 
                    'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

