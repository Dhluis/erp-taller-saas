"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle,
  DollarSign,
  Truck,
  Package,
  XCircle
} from "lucide-react"
import { getPurchaseOrders, getPurchaseOrderStats, createPurchaseOrder, PurchaseOrder, CreatePurchaseOrder } from "@/lib/supabase/purchase-orders"
import { useErrorHandler } from "@/lib/utils/error-handler"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"

export default function OrdenesCompraPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    totalValue: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreatePurchaseOrder>({
    order_number: '',
    supplier_id: '',
    order_date: new Date().toISOString(),
    expected_delivery: new Date().toISOString(),
    status: 'pending',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    notes: ''
  })
  
  // Usar el sistema de manejo de errores
  const { error, handleError, clearError } = useErrorHandler()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    clearError()
    
    try {
      const [ordersData, statsData] = await Promise.all([
        getPurchaseOrders(),
        getPurchaseOrderStats()
      ])
      
      // Si no hay órdenes, usar datos mock
      if (ordersData.length === 0) {
        console.log('Using mock data for purchase orders')
        const mockOrders = [
          {
            id: 'PO-001',
            order_number: 'PO-001',
            supplier_id: 'S001',
            order_date: '2024-01-15T00:00:00Z',
            expected_delivery: '2024-02-15T00:00:00Z',
            status: 'pending' as const,
            subtotal: 15000,
            tax_amount: 1500,
            total_amount: 16500,
            notes: 'Orden pendiente de aprobación',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z'
          },
          {
            id: 'PO-002',
            order_number: 'PO-002',
            supplier_id: 'S002',
            order_date: '2024-01-16T00:00:00Z',
            expected_delivery: '2024-02-20T00:00:00Z',
            status: 'approved' as const,
            subtotal: 8500,
            tax_amount: 850,
            total_amount: 9350,
            notes: 'Orden aprobada',
            created_at: '2024-01-16T00:00:00Z',
            updated_at: '2024-01-16T00:00:00Z'
          }
        ]
        setOrders(mockOrders)
        setStats({
          totalOrders: mockOrders.length,
          pendingOrders: mockOrders.filter(o => o.status === 'pending').length,
          approvedOrders: mockOrders.filter(o => o.status === 'approved').length,
          totalValue: mockOrders.reduce((sum, o) => sum + o.total_amount, 0)
        })
      } else {
        setOrders(ordersData)
        setStats({
          totalOrders: statsData.totalOrders,
          pendingOrders: statsData.pendingOrders,
          approvedOrders: statsData.approvedOrders,
          totalValue: statsData.totalValue
        })
      }
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      handleError(error instanceof Error ? error : new Error('Error loading data'))
      
      // En caso de error, usar datos mock
      const mockOrders = [
        {
          id: 'PO-001',
          order_number: 'PO-001',
          supplier_id: 'S001',
          order_date: '2024-01-15T00:00:00Z',
          expected_delivery: '2024-02-15T00:00:00Z',
          status: 'pending' as const,
          subtotal: 15000,
          tax_amount: 1500,
          total_amount: 16500,
          notes: 'Orden pendiente de aprobación',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z'
        }
      ]
      setOrders(mockOrders)
      setStats({
        totalOrders: 1,
        pendingOrders: 1,
        approvedOrders: 0,
        totalValue: 16500
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const newOrder = await createPurchaseOrder(formData)
      if (newOrder) {
        // Recargar datos
        await loadData()
        setIsDialogOpen(false)
        // Resetear formulario
        setFormData({
          order_number: '',
          supplier_id: '',
          order_date: new Date().toISOString(),
          expected_delivery: '',
          status: 'pending',
          subtotal: 0,
          tax_amount: 0,
          total_amount: 0,
          notes: ''
        })
        alert('Orden de compra creada exitosamente!')
      } else {
        alert('Error al crear la orden de compra')
      }
    } catch (error) {
      console.error('Error creating purchase order:', error)
      alert('Error al crear la orden de compra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white">{status}</Badge>
      case "approved":
        return <Badge className="bg-blue-500 text-white">{status}</Badge>
      case "received":
        return <Badge className="bg-green-500 text-white">{status}</Badge>
      case "cancelled":
        return <Badge className="bg-red-500 text-white">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando órdenes de compra...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Órdenes de Compra"
        parentPages={[
          { label: "Compras", href: "/compras" }
        ]}
      />
      
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Crear Nueva Orden
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
              <DialogHeader className="border-b border-gray-700 pb-4">
                <DialogTitle className="text-white text-xl">Crear Nueva Orden de Compra</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Completa la información de la orden de compra que deseas crear. Los campos marcados con * son obligatorios.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Información Básica</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order_number" className="text-white">
                        Número de Orden *
                      </Label>
                      <Input
                        id="order_number"
                        value={formData.order_number}
                        onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Ej: PO-2024-001"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="supplier_id" className="text-white">
                        ID Proveedor *
                      </Label>
                      <Input
                        id="supplier_id"
                        value={formData.supplier_id}
                        onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        placeholder="ID del proveedor"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Información Financiera */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Información Financiera</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subtotal" className="text-white">
                        Subtotal *
                      </Label>
                      <Input
                        id="subtotal"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.subtotal}
                        onChange={(e) => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tax_amount" className="text-white">
                        Impuestos
                      </Label>
                      <Input
                        id="tax_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.tax_amount}
                        onChange={(e) => setFormData({...formData, tax_amount: parseFloat(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="total_amount" className="text-white">
                        Total *
                      </Label>
                      <Input
                        id="total_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.total_amount}
                        onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Información de Entrega y Estado */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Información de Entrega y Estado</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expected_delivery" className="text-white">
                        Fecha de Entrega Esperada
                      </Label>
                      <Input
                        id="expected_delivery"
                        type="datetime-local"
                        value={formData.expected_delivery ? new Date(formData.expected_delivery).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setFormData({...formData, expected_delivery: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-white">
                        Estado *
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({...formData, status: value as any})}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="pending" className="text-white hover:bg-gray-700">Pendiente</SelectItem>
                          <SelectItem value="approved" className="text-white hover:bg-gray-700">Aprobado</SelectItem>
                          <SelectItem value="ordered" className="text-white hover:bg-gray-700">Ordenado</SelectItem>
                          <SelectItem value="received" className="text-white hover:bg-gray-700">Recibido</SelectItem>
                          <SelectItem value="cancelled" className="text-white hover:bg-gray-700">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notas Adicionales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Información Adicional</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-white">
                      Notas Adicionales
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      placeholder="Información adicional sobre la orden de compra..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter className="bg-gray-800 border-t border-gray-700 pt-4 mt-6">
                  <Button 
                    type="button" 
                    onClick={() => setIsDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Orden'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground">Por aprobar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedOrders}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalValue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monto total de compras</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Historial de Órdenes de Compra</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor o ID..."
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Proveedor</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Total</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Items</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Fecha</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{order.order_number}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{order.supplier_id}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">${(order.total_amount || 0).toLocaleString()}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(order.status)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">-</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{new Date(order.order_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}