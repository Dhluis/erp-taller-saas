"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Edit, Package, Wrench } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface Service {
  id: string
  code: string
  name: string
  description: string
  category: string
  base_price: number
  estimated_hours: number
}

interface InventoryItem {
  id: string
  code: string
  name: string
  price: number
  quantity: number
}

interface OrderItem {
  id?: string
  order_id: string
  service_id?: string
  inventory_id?: string
  item_type: 'service' | 'product'
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  subtotal: number
  tax_amount: number
  total: number
  mechanic_id?: string
  status: string
  notes?: string
}

interface OrderServicesProps {
  orderId: string
  orderStatus: string
  onTotalChange?: (total: number) => void
}

export function OrderServices({ orderId, orderStatus, onTotalChange }: OrderServicesProps) {
  const { currency } = useOrgCurrency()
  const [items, setItems] = useState<OrderItem[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const { toast } = useToast()

  // Estado del formulario
  const [formData, setFormData] = useState({
    item_type: 'service' as 'service' | 'product',
    service_id: '',
    inventory_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 16,
    notes: '',
    mechanic_id: ''
  })

  useEffect(() => {
    loadOrderItems()
    loadServices()
    loadInventory()
  }, [orderId])

  const loadOrderItems = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/items`)
      const data = await response.json()
      setItems(data)
      calculateTotal(data)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services')
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const loadInventory = async () => {
    try {
      const response = await fetch('/api/inventory')
      const data = await response.json()
      setInventory(data)
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  const calculateTotal = (itemsList: OrderItem[]) => {
    const total = itemsList.reduce((sum, item) => sum + item.total, 0)
    onTotalChange?.(total)
  }

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setFormData({
        ...formData,
        service_id: serviceId,
        description: service.name,
        unit_price: service.base_price
      })
    }
  }

  const handleInventorySelect = (inventoryId: string) => {
    const item = inventory.find(i => i.id === inventoryId)
    if (item) {
      setFormData({
        ...formData,
        inventory_id: inventoryId,
        description: item.name,
        unit_price: item.price
      })
    }
  }

  const calculateItemTotals = (data: typeof formData) => {
    const subtotal = data.quantity * data.unit_price
    const discountAmount = subtotal * (data.discount_percent / 100)
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (data.tax_percent / 100)
    const total = taxableAmount + taxAmount

    return {
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total
    }
  }

  const handleSubmit = async () => {
    try {
      const totals = calculateItemTotals(formData)
      const itemData = {
        order_id: orderId,
        ...formData,
        ...totals
      }

      const url = editingItem 
        ? `/api/orders/${orderId}/items/${editingItem.id}`
        : `/api/orders/${orderId}/items`
      
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })

      if (response.ok) {
        toast({
          title: editingItem ? "Item actualizado" : "Item agregado",
          description: "El item se ha guardado correctamente"
        })
        setIsDialogOpen(false)
        resetForm()
        loadOrderItems()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el item",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este item?')) return

    try {
      const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Item eliminado",
          description: "El item se ha eliminado correctamente"
        })
        loadOrderItems()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el item",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      item_type: 'service',
      service_id: '',
      inventory_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 16,
      notes: '',
      mechanic_id: ''
    })
    setEditingItem(null)
  }

  const openEditDialog = (item: OrderItem) => {
    setEditingItem(item)
    setFormData({
      item_type: item.item_type,
      service_id: item.service_id || '',
      inventory_id: item.inventory_id || '',
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_percent: item.tax_percent,
      notes: item.notes || '',
      mechanic_id: item.mechanic_id || ''
    })
    setIsDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      in_progress: { label: 'En Proceso', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'success' as const }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Servicios y Productos</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Item' : 'Agregar Item'}</DialogTitle>
              <DialogDescription>
                Agrega un servicio o producto a la orden de trabajo
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item_type">Tipo</Label>
                  <Select
                    value={formData.item_type}
                    onValueChange={(value) => setFormData({...formData, item_type: value as 'service' | 'product'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">
                        <div className="flex items-center">
                          <Wrench className="h-4 w-4 mr-2" />
                          Servicio
                        </div>
                      </SelectItem>
                      <SelectItem value="product">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Producto
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  {formData.item_type === 'service' ? (
                    <>
                      <Label htmlFor="service">Servicio</Label>
                      <Select
                        value={formData.service_id}
                        onValueChange={handleServiceSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar servicio" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {formatCurrency(service.base_price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <>
                      <Label htmlFor="inventory">Producto</Label>
                      <Select
                        value={formData.inventory_id}
                        onValueChange={handleInventorySelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} - Stock: {item.quantity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descripción del servicio o producto"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="unit_price">Precio Unitario</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Descuento %</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas adicionales sobre este item"
                  rows={3}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateItemTotals(formData).subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(calculateItemTotals(formData).discount_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({formData.tax_percent}%):</span>
                    <span>{formatCurrency(calculateItemTotals(formData).tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateItemTotals(formData).total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingItem ? 'Actualizar' : 'Agregar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">P. Unit</TableHead>
            <TableHead className="text-right">Desc.</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">IVA</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.item_type === 'service' ? (
                  <Wrench className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
              </TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
              <TableCell className="text-right">
                {item.discount_percent > 0 && `${item.discount_percent}%`}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.tax_amount)}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(item.total)}
              </TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-muted p-4 rounded-lg w-80">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(items.reduce((sum, item) => sum + item.subtotal, 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Descuentos:</span>
                <span>-{formatCurrency(items.reduce((sum, item) => sum + item.discount_amount, 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA:</span>
                <span>{formatCurrency(items.reduce((sum, item) => sum + item.tax_amount, 0))}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



