"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { OrderItemsManager } from "@/components/orders/order-items-manager"
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
  order_number: string
  customer_id: string
  vehicle_id: string
  status: string
  description: string
  estimated_cost: number
  final_cost: number
  entry_date: string
  estimated_completion: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relaciones
  customers?: {
    name: string
    email: string
    phone: string
  }
  vehicles?: {
    brand: string
    model: string
    year: number
    license_plate: string
    vin: string
  }
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderTotal, setOrderTotal] = useState(0)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) throw new Error('Error al cargar la orden')
      
      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
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
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ final_cost: total })
      })

      if (!response.ok) {
        console.error('Error updating order total')
      }
    } catch (error) {
      console.error('Error updating order total:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      reception: { label: 'Recepción', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      diagnostic: { label: 'Diagnóstico', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      approval: { label: 'Aprobación', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      repair: { label: 'Reparación', variant: 'default' as const, color: 'bg-orange-100 text-orange-800' },
      parts: { label: 'Esperando Repuestos', variant: 'default' as const, color: 'bg-purple-100 text-purple-800' },
      quality: { label: 'Control de Calidad', variant: 'default' as const, color: 'bg-indigo-100 text-indigo-800' },
      delivery: { label: 'Listo para Entrega', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Orden #{order.order_number}
            </h2>
            <p className="text-muted-foreground">
              {order.customers?.name} - {order.vehicles?.brand} {order.vehicles?.model} {order.vehicles?.year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(order.status)}
          {getStatusBadge(order.status)}
        </div>
      </div>

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
            <div className="flex justify-between">
              <span className="text-sm font-medium">Número:</span>
              <span className="text-sm">#{order.order_number}</span>
            </div>
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
              <p className="font-medium">{order.customers?.name}</p>
              <p className="text-sm text-muted-foreground">{order.customers?.email}</p>
              <p className="text-sm text-muted-foreground">{order.customers?.phone}</p>
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
                {order.vehicles?.brand} {order.vehicles?.model} {order.vehicles?.year}
              </p>
              <p className="text-sm text-muted-foreground">
                Placas: {order.vehicles?.license_plate}
              </p>
              <p className="text-sm text-muted-foreground">
                VIN: {order.vehicles?.vin}
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

