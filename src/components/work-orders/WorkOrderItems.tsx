'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Trash2, Edit, Wrench, Package, User, DollarSign, Percent, Calculator, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WorkOrderItemsProps {
  orderId: string
  orderStatus: string
  onTotalChange?: (total: number) => void
}

interface OrderItem {
  id: string
  item_type: 'service' | 'product'
  service_id?: string
  inventory_id?: string
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
  service?: { id: string; name: string; category: string }
  product?: { id: string; name: string; code: string }
  mechanic?: { id: string; name: string }
}

interface Service {
  id: string
  code?: string
  name: string
  description?: string
  category: string
  base_price: number
  estimated_hours: number
}

interface Product {
  id: string
  code?: string
  name: string
  description?: string
  price: number
  stock_quantity: number
}

interface Employee {
  id: string
  name: string
  role: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-gray-500' },
  in_progress: { label: 'En Proceso', color: 'bg-blue-500' },
  completed: { label: 'Completado', color: 'bg-green-500' }
}

export function WorkOrderItems({ orderId, orderStatus, onTotalChange }: WorkOrderItemsProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    item_type: 'service' as 'service' | 'product',
    service_id: '',
    inventory_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 16,
    mechanic_id: '',
    status: 'pending',
    notes: ''
  })

  useEffect(() => {
    loadItems()
    loadServices()
    loadProducts()
    loadEmployees()
  }, [orderId])

  async function loadItems() {
    try {
      const response = await fetch(`/api/orders/${orderId}/items`)
      if (!response.ok) throw new Error('Error al cargar items')
      const data = await response.json()
      setItems(data)
      
      // Calcular total y notificar
      const total = data.reduce((sum: number, item: OrderItem) => sum + item.total, 0)
      onTotalChange?.(total)
    } catch (error) {
      console.error('Error cargando items:', error)
      toast.error('Error al cargar items')
    }
  }

  async function loadServices() {
    try {
      const response = await fetch('/api/services')
      if (!response.ok) throw new Error('Error al cargar servicios')
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error('Error cargando servicios:', error)
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch('/api/inventory')
      if (!response.ok) throw new Error('Error al cargar productos')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  async function loadEmployees() {
    try {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Error al cargar empleados')
      const data = await response.json()
      setEmployees(data.filter((e: Employee) => e.role === 'mechanic'))
    } catch (error) {
      console.error('Error cargando empleados:', error)
    }
  }

  function handleOpenAddModal() {
    setEditingItem(null)
    setFormData({
      item_type: 'service',
      service_id: '',
      inventory_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 16,
      mechanic_id: '',
      status: 'pending',
      notes: ''
    })
    setIsAddModalOpen(true)
  }

  function handleOpenEditModal(item: OrderItem) {
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
      mechanic_id: item.mechanic_id || '',
      status: item.status,
      notes: item.notes || ''
    })
    setIsAddModalOpen(true)
  }

  function handleServiceChange(serviceId: string) {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setFormData(prev => ({
        ...prev,
        service_id: serviceId,
        description: service.name,
        unit_price: service.base_price
      }))
    }
  }

  function handleProductChange(productId: string) {
    const product = products.find(p => p.id === productId)
    if (product) {
      setFormData(prev => ({
        ...prev,
        inventory_id: productId,
        description: product.name,
        unit_price: product.price
      }))
    }
  }

  async function handleSaveItem() {
    if (!formData.description.trim()) {
      toast.error('La descripción es obligatoria')
      return
    }

    if (formData.quantity <= 0) {
      toast.error('La cantidad debe ser mayor a cero')
      return
    }

    setLoading(true)
    try {
      const url = editingItem
        ? `/api/orders/${orderId}/items/${editingItem.id}`
        : `/api/orders/${orderId}/items`
      
      const method = editingItem ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Error al guardar item')

      toast.success(editingItem ? 'Item actualizado' : 'Item agregado')
      setIsAddModalOpen(false)
      await loadItems()
    } catch (error) {
      console.error('Error guardando item:', error)
      toast.error('Error al guardar item')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteItem() {
    if (!deletingItemId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/items/${deletingItemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar item')

      toast.success('Item eliminado')
      setShowDeleteDialog(false)
      setDeletingItemId(null)
      await loadItems()
    } catch (error) {
      console.error('Error eliminando item:', error)
      toast.error('Error al eliminar item')
    } finally {
      setLoading(false)
    }
  }

  // Calcular preview de totales en el formulario
  const previewSubtotal = formData.quantity * formData.unit_price
  const previewDiscountAmount = previewSubtotal * (formData.discount_percent / 100)
  const previewSubtotalAfterDiscount = previewSubtotal - previewDiscountAmount
  const previewTaxAmount = previewSubtotalAfterDiscount * (formData.tax_percent / 100)
  const previewTotal = previewSubtotalAfterDiscount + previewTaxAmount

  // Calcular totales generales
  const grandSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const grandDiscountAmount = items.reduce((sum, item) => sum + item.discount_amount, 0)
  const grandTaxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0)
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-4">
      {/* Header con botón agregar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Servicios y Productos</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button type="button" onClick={handleOpenAddModal} disabled={orderStatus === 'completed' || orderStatus === 'cancelled'}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Item
        </Button>
      </div>

      {/* Lista de items */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Tipo y descripción */}
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      {item.item_type === 'service' ? (
                        <Wrench className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Package className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.description}</h4>
                      {item.service && (
                        <p className="text-sm text-muted-foreground">
                          Servicio: {item.service.name} ({item.service.category})
                        </p>
                      )}
                      {item.product && (
                        <p className="text-sm text-muted-foreground">
                          Producto: {item.product.code} - {item.product.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cantidad:</span>
                      <span className="ml-1 font-medium">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Precio Unit.:</span>
                      <span className="ml-1 font-medium">${item.unit_price.toFixed(2)}</span>
                    </div>
                    {item.discount_percent > 0 && (
                      <div>
                        <span className="text-muted-foreground">Descuento:</span>
                        <span className="ml-1 font-medium text-orange-500">
                          {item.discount_percent}% (-${item.discount_amount.toFixed(2)})
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-1 font-bold text-lg">${item.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Mecánico y estado */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={STATUS_LABELS[item.status]?.color || 'bg-gray-500'}>
                      {STATUS_LABELS[item.status]?.label || item.status}
                    </Badge>
                    {item.mechanic && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {item.mechanic.name}
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-sm text-muted-foreground italic">{item.notes}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenEditModal(item)}
                    disabled={orderStatus === 'completed' || orderStatus === 'cancelled'}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setDeletingItemId(item.id)
                      setShowDeleteDialog(true)
                    }}
                    disabled={orderStatus === 'completed' || orderStatus === 'cancelled'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Resumen de totales */}
          <Card className="p-4 bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${grandSubtotal.toFixed(2)}</span>
              </div>
              {grandDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Descuentos:</span>
                  <span className="font-medium text-orange-500">-${grandDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-medium">${grandTaxAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
                <span>TOTAL:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Calculator className="mx-auto h-12 w-12 mb-2" />
            <p>No hay servicios o productos agregados</p>
            <p className="text-sm">Agrega el primer item a esta orden</p>
          </div>
        </Card>
      )}

      {/* Modal Agregar/Editar */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F172A] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem ? 'Editar Item' : 'Agregar Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tipo de item */}
            {!editingItem && (
              <div className="space-y-2">
                <Label className="text-white">Tipo</Label>
                <Select
                  value={formData.item_type}
                  onValueChange={(value: 'service' | 'product') => {
                    setFormData({
                      ...formData,
                      item_type: value,
                      service_id: '',
                      inventory_id: '',
                      description: '',
                      unit_price: 0
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Servicio
                      </div>
                    </SelectItem>
                    <SelectItem value="product">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Producto
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selector de servicio o producto */}
            {!editingItem && formData.item_type === 'service' && (
              <div className="space-y-2">
                <Label className="text-white">Servicio</Label>
                <Select value={formData.service_id} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.base_price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editingItem && formData.item_type === 'product' && (
              <div className="space-y-2">
                <Label className="text-white">Producto</Label>
                <Select value={formData.inventory_id} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ${product.price.toFixed(2)} (Stock: {product.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-2">
              <Label className="text-white">Descripción *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Descripción del servicio o producto..."
              />
            </div>

            {/* Cantidad y precio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Cantidad *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Precio Unitario *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Descuento y IVA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Descuento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">IVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_percent}
                  onChange={(e) => setFormData({ ...formData, tax_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Mecánico y estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Mecánico</Label>
                <Select value={formData.mechanic_id || "none"} onValueChange={(value) => setFormData({ ...formData, mechanic_id: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label className="text-white">Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Preview de totales */}
            <Card className="p-3 bg-[#1E293B] border-gray-700">
              <div className="space-y-1 text-sm text-white">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span>${previewSubtotal.toFixed(2)}</span>
                </div>
                {formData.discount_percent > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Descuento ({formData.discount_percent}%):</span>
                    <span>-${previewDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">IVA ({formData.tax_percent}%):</span>
                  <span>${previewTaxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-gray-700 pt-1">
                  <span>TOTAL:</span>
                  <span>${previewTotal.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveItem} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    {editingItem ? 'Actualizar' : 'Agregar'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#0F172A] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar item?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta acción no se puede deshacer. El item será eliminado de la orden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} disabled={loading}>
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
