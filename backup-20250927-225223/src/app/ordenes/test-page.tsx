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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Calendar, 
  Car, 
  User, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Wrench, 
  Package, 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Search
} from "lucide-react"

interface WorkOrder {
  id: string
  customer_name: string
  vehicle_info: string
  status: string
  description: string
  estimated_cost: number
  final_cost: number
  entry_date: string
  estimated_completion: string
  completed_at?: string
  notes: string
  priority: 'low' | 'medium' | 'high'
}

const STATUS_CONFIG = {
  reception: { label: "Recepción", color: "bg-gray-500", icon: FileText },
  diagnostic: { label: "Diagnóstico", color: "bg-yellow-500", icon: AlertCircle },
  approval: { label: "Aprobación", color: "bg-orange-500", icon: Clock },
  repair: { label: "Reparación", color: "bg-blue-500", icon: Wrench },
  parts: { label: "Repuestos", color: "bg-purple-500", icon: Package },
  quality: { label: "Control", color: "bg-indigo-500", icon: CheckCircle },
  delivery: { label: "Entrega", color: "bg-green-500", icon: Car },
  completed: { label: "Completada", color: "bg-gray-400", icon: CheckCircle }
}

export default function TestOrdenesPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null)
  const [formData, setFormData] = useState({
    customer_name: "",
    vehicle_info: "",
    description: "",
    estimated_cost: "",
    estimated_completion: "",
    priority: "medium",
    notes: ""
  })

  // Datos de ejemplo
  useEffect(() => {
    const mockOrders: WorkOrder[] = [
      {
        id: "1",
        customer_name: "Juan Pérez",
        vehicle_info: "Toyota Corolla 2020 - ABC-123",
        status: "reception",
        description: "Revisión general y cambio de aceite",
        estimated_cost: 500,
        final_cost: 0,
        entry_date: "2024-01-15",
        estimated_completion: "2024-01-16",
        notes: "Cliente solicita revisión completa",
        priority: "medium"
      },
      {
        id: "2",
        customer_name: "María García",
        vehicle_info: "Honda Civic 2019 - XYZ-456",
        status: "diagnostic",
        description: "Problema con el motor, ruido extraño",
        estimated_cost: 1200,
        final_cost: 0,
        entry_date: "2024-01-14",
        estimated_completion: "2024-01-18",
        notes: "Requiere diagnóstico completo",
        priority: "high"
      },
      {
        id: "3",
        customer_name: "Carlos López",
        vehicle_info: "Ford Focus 2021 - DEF-789",
        status: "repair",
        description: "Reparación de frenos delanteros",
        estimated_cost: 800,
        final_cost: 750,
        entry_date: "2024-01-13",
        estimated_completion: "2024-01-17",
        notes: "Cambio de pastillas y discos",
        priority: "high"
      },
      {
        id: "4",
        customer_name: "Ana Rodríguez",
        vehicle_info: "Nissan Sentra 2018 - GHI-012",
        status: "completed",
        description: "Mantenimiento preventivo",
        estimated_cost: 300,
        final_cost: 280,
        entry_date: "2024-01-12",
        estimated_completion: "2024-01-15",
        completed_at: "2024-01-15",
        notes: "Servicio completado satisfactoriamente",
        priority: "low"
      },
      {
        id: "5",
        customer_name: "Luis Martínez",
        vehicle_info: "Chevrolet Aveo 2020 - JKL-345",
        status: "parts",
        description: "Cambio de transmisión",
        estimated_cost: 2500,
        final_cost: 0,
        entry_date: "2024-01-11",
        estimated_completion: "2024-01-20",
        notes: "Esperando repuestos de la casa matriz",
        priority: "high"
      }
    ]
    
    setOrders(mockOrders)
    setIsLoading(false)
  }, [])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vehicle_info.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || order.status === filterStatus
    const matchesPriority = filterPriority === "all" || order.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusIcon = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return <FileText className="h-4 w-4 text-gray-500" />
    const IconComponent = config.icon
    return <IconComponent className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return <Badge className="bg-gray-500">{status}</Badge>
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: "Baja", className: "bg-green-500" },
      medium: { label: "Media", className: "bg-yellow-500" },
      high: { label: "Alta", className: "bg-red-500" }
    }
    
    const priorityInfo = priorityMap[priority as keyof typeof priorityMap] || { label: priority, className: "bg-gray-500" }
    return <Badge className={priorityInfo.className}>{priorityInfo.label}</Badge>
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddOrder = () => {
    if (formData.customer_name && formData.vehicle_info && formData.description) {
      const newOrder: WorkOrder = {
        id: `order_${orders.length + 1}`,
        customer_name: formData.customer_name,
        vehicle_info: formData.vehicle_info,
        status: "reception",
        description: formData.description,
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        final_cost: 0,
        entry_date: new Date().toISOString().split('T')[0],
        estimated_completion: formData.estimated_completion,
        notes: formData.notes,
        priority: formData.priority as 'low' | 'medium' | 'high'
      }
      
      setOrders(prev => [newOrder, ...prev])
      setFormData({
        customer_name: "",
        vehicle_info: "",
        description: "",
        estimated_cost: "",
        estimated_completion: "",
        priority: "medium",
        notes: ""
      })
      setIsDialogOpen(false)
    }
  }

  const handleViewOrder = (order: WorkOrder) => {
    setSelectedOrder(order)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando órdenes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
                <DialogDescription>
                  Crear una nueva orden de trabajo para un cliente
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_name">Cliente</Label>
                    <Input
                      id="customer_name"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicle_info">Vehículo</Label>
                    <Input
                      id="vehicle_info"
                      name="vehicle_info"
                      value={formData.vehicle_info}
                      onChange={handleInputChange}
                      placeholder="Marca, modelo, año, placa"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Descripción del Trabajo</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe el trabajo a realizar..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="estimated_cost">Costo Estimado</Label>
                    <Input
                      id="estimated_cost"
                      name="estimated_cost"
                      type="number"
                      value={formData.estimated_cost}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_completion">Fecha Estimada</Label>
                    <Input
                      id="estimated_completion"
                      name="estimated_completion"
                      type="date"
                      value={formData.estimated_completion}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddOrder}>
                  Crear Orden
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              Órdenes registradas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => !['completed'].includes(o.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Órdenes activas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Órdenes finalizadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orders.reduce((sum, order) => sum + order.estimated_cost, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor estimado total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar órdenes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="reception">Recepción</SelectItem>
                  <SelectItem value="diagnostic">Diagnóstico</SelectItem>
                  <SelectItem value="approval">Aprobación</SelectItem>
                  <SelectItem value="repair">Reparación</SelectItem>
                  <SelectItem value="parts">Repuestos</SelectItem>
                  <SelectItem value="quality">Control</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export">Exportar</Label>
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Órdenes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo</CardTitle>
          <CardDescription>
            Lista de todas las órdenes de trabajo del taller
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.customer_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{order.vehicle_info}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{order.description}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      {getStatusBadge(order.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(order.priority)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">${order.estimated_cost.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(order.entry_date).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No se encontraron órdenes</h3>
              <p className="text-muted-foreground">
                Intenta ajustar los filtros para ver más resultados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de la Orden</DialogTitle>
              <DialogDescription>
                Información completa de la orden de trabajo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Vehículo</Label>
                  <p className="text-sm">{selectedOrder.vehicle_info}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Descripción</Label>
                <p className="text-sm">{selectedOrder.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedOrder.status)}
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Prioridad</Label>
                  <div className="mt-1">
                    {getPriorityBadge(selectedOrder.priority)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Costo Estimado</Label>
                  <p className="text-sm font-medium">${selectedOrder.estimated_cost.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha de Entrada</Label>
                  <p className="text-sm">{new Date(selectedOrder.entry_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha Estimada</Label>
                  <p className="text-sm">{new Date(selectedOrder.estimated_completion).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <Label className="text-sm font-medium">Notas</Label>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setSelectedOrder(null)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

