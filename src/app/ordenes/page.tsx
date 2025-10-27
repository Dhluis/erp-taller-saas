"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  Car,
  Clock,
  CheckCircle,
  DollarSign,
  User,
  Calendar,
  Loader2,
  Wrench,
  Edit,
  Trash2,
  Save,
  AlertCircle
} from "lucide-react"
import { getWorkOrders, createWorkOrder, updateWorkOrder, deleteWorkOrder, getWorkOrderStats, WorkOrder, CreateWorkOrderData, WorkOrderStats } from "@/lib/supabase/work-orders"

export default function OrdenesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [stats, setStats] = useState<WorkOrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState<CreateWorkOrderData>({
    customer_name: '',
    vehicle_info: '',
    service_description: '',
    total: 0,
    status: 'pending'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [ordersData, statsData] = await Promise.all([
        getWorkOrders(),
        getWorkOrderStats()
      ])
      
      // Si no hay órdenes, usar datos mock
      if (ordersData.length === 0) {
        console.log('Using mock data for work orders')
        const mockOrders = [
          {
            id: "WO001",
            customer_name: "Juan Pérez",
            vehicle_info: "Honda Civic 2020 - ABC123",
            service_description: "Cambio de aceite y filtro",
            status: "completed" as const,
            total: 850,
            created_at: "2024-01-20T00:00:00Z",
            updated_at: "2024-01-20T00:00:00Z"
          },
          {
            id: "WO002",
            customer_name: "María García",
            vehicle_info: "Toyota Corolla 2019 - XYZ789",
            service_description: "Revisión general y balanceado",
            status: "in_progress" as const,
            total: 1200,
            created_at: "2024-01-19T00:00:00Z",
            updated_at: "2024-01-19T00:00:00Z"
          },
          {
            id: "WO003",
            customer_name: "Carlos López",
            vehicle_info: "Nissan Sentra 2021 - DEF456",
            service_description: "Reparación de frenos",
            status: "pending" as const,
            total: 1500,
            created_at: "2024-01-18T00:00:00Z",
            updated_at: "2024-01-18T00:00:00Z"
          },
          {
            id: "WO004",
            customer_name: "Ana Martínez",
            vehicle_info: "Ford Focus 2018 - JKL012",
            service_description: "Reparación cancelada",
            status: "cancelled" as const,
            total: 0,
            created_at: "2024-01-17T00:00:00Z",
            updated_at: "2024-01-17T00:00:00Z"
          }
        ]
        setOrders(mockOrders)
        setStats({
          totalOrders: mockOrders.length,
          pendingOrders: Array.isArray(mockOrders) ? mockOrders.filter(o => o.status === 'pending').length : 0,
          inProgressOrders: Array.isArray(mockOrders) ? mockOrders.filter(o => o.status === 'in_progress').length : 0,
          completedOrders: Array.isArray(mockOrders) ? mockOrders.filter(o => o.status === 'completed').length : 0,
          cancelledOrders: Array.isArray(mockOrders) ? mockOrders.filter(o => o.status === 'cancelled').length : 0,
          totalRevenue: Array.isArray(mockOrders) ? mockOrders.reduce((sum, o) => sum + o.total, 0) : 0
        })
      } else {
        setOrders(ordersData)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // En caso de error, usar datos mock
      const mockOrders = [
        {
          id: "WO001",
          customer_name: "Juan Pérez",
          vehicle_info: "Honda Civic 2020 - ABC123",
          service_description: "Cambio de aceite y filtro",
          status: "completed" as const,
          total: 850,
          created_at: "2024-01-20T00:00:00Z",
          updated_at: "2024-01-20T00:00:00Z"
        }
      ]
      setOrders(mockOrders)
      setStats({
        totalOrders: 1,
        pendingOrders: 0,
        inProgressOrders: 0,
        completedOrders: 1,
        cancelledOrders: 0,
        totalRevenue: 850
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (editingOrder) {
        await updateWorkOrder(editingOrder.id, formData)
      } else {
        await createWorkOrder(formData)
      }
      await loadData()
      setIsDialogOpen(false)
      setEditingOrder(null)
      setFormData({
        customer_name: '',
        vehicle_info: '',
        service_description: '',
        total: 0,
        status: 'pending'
      })
      alert(editingOrder ? 'Orden actualizada exitosamente' : 'Orden creada exitosamente')
    } catch (error) {
      console.error('Error creating/updating order:', error)
      alert('Error al guardar la orden')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order)
    setFormData({
      customer_name: order.customer_name,
      vehicle_info: order.vehicle_info,
      service_description: order.service_description,
      total: order.total,
      status: order.status
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta orden?")) {
      setIsSubmitting(true)
      try {
        await deleteWorkOrder(id)
        await loadData()
        alert('Orden eliminada exitosamente')
      } catch (error) {
        console.error("Error deleting order:", error)
        alert("Error al eliminar la orden. Inténtalo de nuevo.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleAddOrder = () => {
    setEditingOrder(null)
    setFormData({
      customer_name: '',
      vehicle_info: '',
      service_description: '',
      total: 0,
      status: 'pending'
    })
    setIsDialogOpen(true)
  }

  const filteredOrders = Array.isArray(orders) ? orders.filter(
    (order) =>
      (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.vehicle_info || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500 text-white">{status}</Badge>
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-500 text-white">{status}</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-green-500 text-white">{status}</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-500 text-white">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }


  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando órdenes...</p>
          </div>
        </div>
      </div>
    )
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Órdenes' }
  ]

  return (
    <AppLayout 
      title="Órdenes de Trabajo"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddOrder}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Orden de Trabajo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingOrder ? "Editar Orden de Trabajo" : "Crear Nueva Orden de Trabajo"}</DialogTitle>
                <DialogDescription>
                  {editingOrder ? "Modifica la información del servicio." : "Completa la información del servicio. Los campos marcados con * son obligatorios."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nombre del Cliente *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="Nombre completo del cliente"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vehicle_info">Información del Vehículo *</Label>
                  <Input
                    id="vehicle_info"
                    value={formData.vehicle_info}
                    onChange={(e) => setFormData({...formData, vehicle_info: e.target.value})}
                    placeholder="Marca, modelo, año y placas"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service_description">Descripción del Servicio *</Label>
                  <Textarea
                    id="service_description"
                    value={formData.service_description}
                    onChange={(e) => setFormData({...formData, service_description: e.target.value})}
                    placeholder="Describe el trabajo a realizar"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total">Costo Total *</Label>
                    <Input
                      id="total"
                      type="number"
                      value={formData.total}
                      onChange={(e) => setFormData({...formData, total: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Orden
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Órdenes registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Por iniciar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">Trabajando</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total facturado</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Lista de Órdenes</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, vehículo o ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="w-full">
            <table className="w-full text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">ID</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Cliente</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Vehículo</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Servicio</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Total</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Fecha</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {Array.isArray(filteredOrders) ? filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{order.id}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {order.customer_name}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      {order.vehicle_info}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{order.service_description}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">${(order.total || 0).toLocaleString()}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(order.status)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(order)}
                          disabled={isSubmitting}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(order.id)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}