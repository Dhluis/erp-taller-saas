"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { Calendar, Car, User, DollarSign, Clock, CheckCircle, AlertCircle, Wrench, Package, FileText, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { OrderServices } from "@/components/orders/order-services"

interface WorkOrder {
  id: string
  customer_id: string
  vehicle_id: string
  status: string
  description: string
  estimated_cost: number
  final_cost: number
  entry_date: string
  estimated_completion: string
  completed_at: string
  notes: string
  customers?: { name: string; phone: string }
  vehicles?: { brand: string; model: string; license_plate: string; year: number }
}

const STATUS_CONFIG = {
  reception: { label: "Recepción", color: "bg-gray-500", icon: FileText },
  diagnostic: { label: "Diagnóstico", color: "bg-yellow-500", icon: AlertCircle },
  approval: { label: "Aprobación", color: "bg-orange-500", icon: Clock },
  repair: { label: "Reparación", color: "bg-blue-500", icon: Wrench },
  parts: { label: "Repuestos", color: "bg-purple-500", icon: Package },
  quality: { label: "Control", color: "bg-indigo-500", icon: CheckCircle },
  delivery: { label: "Entrega", color: "bg-green-500", icon: Car },
  completed: { label: "Archivados", color: "bg-gray-400", icon: FileText }
}

export default function OrdenesPage() {
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null)
  const [selectedOrderTotal, setSelectedOrderTotal] = useState<number>(0)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterVehicle, setFilterVehicle] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== "") {
      fetchVehiclesByCustomer(selectedCustomer)
    } else {
      setVehicles([])
    }
  }, [selectedCustomer])

  const fetchOrders = async () => {
    let query = supabase
      .from("work_orders")
      .select(`
        *,
        customers(name, phone),
        vehicles(brand, model, license_plate, year)
      `)
      .order("created_at", { ascending: false })

    if (filterCustomer && filterCustomer !== "all") {
      query = query.eq("customer_id", filterCustomer)
    }
    if (filterVehicle && filterVehicle !== "all") {
      query = query.eq("vehicle_id", filterVehicle)
    }
    if (dateFrom) {
      query = query.gte("entry_date", dateFrom)
    }
    if (dateTo) {
      query = query.lte("entry_date", dateTo)
    }

    const { data } = await query
    if (data) setOrders(data)
  }

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
    
    if (data) setCustomers(data)
  }

  const fetchVehiclesByCustomer = async (customerId: string) => {
    const { data } = await supabase
      .from("vehicles")
      .select("id, brand, model, license_plate")
      .eq("customer_id", customerId)
    
    if (data) setVehicles(data)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const orderData = {
      customer_id: formData.get("customer_id") as string,
      vehicle_id: formData.get("vehicle_id") as string,
      description: formData.get("description") as string,
      estimated_cost: parseFloat(formData.get("estimated_cost") as string) || 0,
      estimated_completion: formData.get("estimated_completion") as string,
      notes: formData.get("notes") as string,
      status: "reception"
    }

    try {
      const { error } = await supabase
        .from("work_orders")
        .insert([orderData])

      if (error) throw error
      
      alert("Orden de trabajo creada exitosamente!")
      e.currentTarget.reset()
      setSelectedCustomer("")
      setVehicles([])
      setShowNewOrder(false)
      fetchOrders()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al crear la orden")
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from("work_orders")
        .update(updateData)
        .eq("id", orderId)

      if (error) throw error
      
      fetchOrders()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al actualizar el estado")
    }
  }

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status)
  }

  const OrderCard = ({ order }: { order: WorkOrder }) => {
    const StatusIcon = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.icon || FileText
    
    return (
      <Card 
        className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedOrder(order)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-sm">
                #{order.id.slice(0, 8)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date(order.entry_date).toLocaleDateString('es-MX')}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="font-medium text-sm">{order.customers?.name}</p>
            <p className="text-xs text-gray-600">
              {order.vehicles?.brand} {order.vehicles?.model} {order.vehicles?.year}
            </p>
            <p className="text-xs text-gray-500">
              {order.vehicles?.license_plate}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-600 line-clamp-2">{order.description}</p>
            {order.estimated_cost > 0 && (
              <p className="text-sm font-medium mt-2">
                ${order.estimated_cost.toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex justify-between mt-3">
            <Link href={`/ordenes/${order.id}`}>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver Detalles
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                const statuses = Object.keys(STATUS_CONFIG)
                const currentIndex = statuses.indexOf(order.status)
                if (currentIndex < statuses.length - 1) {
                  updateOrderStatus(order.id, statuses[currentIndex + 1])
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const resetFilters = () => {
    setFilterCustomer("all")
    setFilterVehicle("all")
    setDateFrom("")
    setDateTo("")
    fetchOrders()
  }

  return (
    <div className="container-fluid px-4 py-6">
      {/* Header con filtros */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Órdenes de Servicio</h1>
          <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
            <DialogTrigger asChild>
              <Button>Nueva Orden</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
                <DialogDescription>Registra una nueva orden de servicio</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_id">Cliente *</Label>
                    <Select 
                      name="customer_id" 
                      value={selectedCustomer}
                      onValueChange={setSelectedCustomer}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vehicle_id">Vehículo *</Label>
                    <Select name="vehicle_id" required disabled={!selectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCustomer ? "Selecciona un vehículo" : "Primero selecciona un cliente"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción del trabajo *</Label>
                  <Textarea 
                    name="description"
                    placeholder="Describe los servicios a realizar..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_cost">Costo estimado ($)</Label>
                    <Input 
                      name="estimated_cost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_completion">Fecha estimada de entrega</Label>
                    <Input 
                      name="estimated_completion"
                      type="date"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea 
                    name="notes"
                    placeholder="Observaciones..."
                    rows={2}
                  />
                </div>
                
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creando..." : "Crear Orden de Trabajo"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filtrar por cliente</Label>
              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desde</Label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={fetchOrders}>Filtrar</Button>
            <Button onClick={resetFilters} variant="outline">Limpiar</Button>
          </div>
        </Card>
      </div>

      {/* Tablero Kanban */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const statusOrders = getOrdersByStatus(status)
            const Icon = config.icon
            
            return (
              <div key={status} className="w-80">
                <div className={`${config.color} text-white p-3 rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span className="font-semibold">{config.label}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {statusOrders.length}
                    </Badge>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 min-h-[500px] rounded-b-lg">
                  {statusOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                  {statusOrders.length === 0 && (
                    <p className="text-center text-gray-400 text-sm mt-4">
                      Sin órdenes
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de detalles de orden */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Orden #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedOrder.customers?.name}</p>
                  <p className="text-sm">{selectedOrder.customers?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehículo</p>
                  <p className="font-medium">
                    {selectedOrder.vehicles?.brand} {selectedOrder.vehicles?.model} {selectedOrder.vehicles?.year}
                  </p>
                  <p className="text-sm">{selectedOrder.vehicles?.license_plate}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Descripción del trabajo</p>
                <p className="mt-1">{selectedOrder.description}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notas</p>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Fecha de ingreso</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.entry_date).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Costo estimado</p>
                  <p className="font-medium">${selectedOrder.estimated_cost?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado actual</p>
                  <Badge className={STATUS_CONFIG[selectedOrder.status as keyof typeof STATUS_CONFIG]?.color}>
                    {STATUS_CONFIG[selectedOrder.status as keyof typeof STATUS_CONFIG]?.label}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t">
                <OrderServices
                  orderId={selectedOrder.id}
                  orderStatus={selectedOrder.status}
                  onTotalChange={(t) => setSelectedOrderTotal(t)}
                />
                <div className="flex justify-end mt-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total actual</p>
                    <p className="text-lg font-semibold">${selectedOrderTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) => {
                    updateOrderStatus(selectedOrder.id, value)
                    setSelectedOrder(null)
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}