"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Package, User, Calculator } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { safeFetch, safePost, safePut } from "@/lib/api"
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface Service {
  id: string
  name: string
  description: string
  category: string
  base_price: number
  estimated_hours: number
}

interface InventoryItem {
  id: string
  name: string
  code: string
  price: number
  quantity: number
}

interface Employee {
  id: string
  name: string
  role: string
  specialties: string[]
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

interface AddItemModalProps {
  orderId: string
  item?: OrderItem | null
  onSave: () => void
  onCancel: () => void
}

export function AddItemModal({ orderId, item, onSave, onCancel }: AddItemModalProps) {
  const { currency } = useOrgCurrency()
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

  const [services, setServices] = useState<Service[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
    if (item) {
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
    }
  }, [item])

  const loadData = async () => {
    try {
      // Cargar servicios
      const servicesResult = await safeFetch('/api/services')
      if (servicesResult.success && servicesResult.data) {
        setServices(servicesResult.data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los servicios",
          variant: "destructive"
        })
      }

      // Cargar inventario
      const inventoryResult = await safeFetch('/api/inventory')
      if (inventoryResult.success && inventoryResult.data) {
        setInventory(inventoryResult.data)
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar el inventario",
          variant: "destructive"
        })
      }

      // Cargar empleados (mecánicos)
      const employeesResult = await safeFetch('/api/employees')
      if (employeesResult.success && employeesResult.data) {
        setEmployees(employeesResult.data.filter((emp: Employee) => emp.role === 'mechanic'))
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los empleados",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive"
      })
    }
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

  const calculateTotals = () => {
    const subtotal = formData.quantity * formData.unit_price
    const discountAmount = subtotal * (formData.discount_percent / 100)
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (formData.tax_percent / 100)
    const total = taxableAmount + taxAmount

    return {
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.item_type === 'product') {
      const selectedItem = inventory.find(i => i.id === formData.inventory_id)
      if (selectedItem && formData.quantity > selectedItem.quantity) {
        toast({
          title: "Error de stock",
          description: `Solo hay ${selectedItem.quantity} unidades disponibles`,
          variant: "destructive"
        })
        return
      }
    }

    try {
      setLoading(true)
      const totals = calculateTotals()
      
      const itemData = {
        order_id: orderId,
        ...formData,
        ...totals
      }

      const url = item ? `/api/orders/${orderId}/items/${item.id}` : `/api/orders/${orderId}/items`
      
      let result
      if (item) {
        result = await safePut(url, itemData)
      } else {
        result = await safePost(url, itemData)
      }

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "No se pudo guardar el item",
          variant: "destructive"
        })
        return
      }

      toast({
        title: item ? "Item actualizado" : "Item agregado",
        description: "El item se ha guardado correctamente"
      })

      onSave()
    } catch (error) {
      console.error('Error saving item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el item",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const totals = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        {/* Tipo de Item */}
        <div className="space-y-2">
          <Label htmlFor="item_type">Tipo de Item</Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="item_type"
                checked={formData.item_type === 'product'}
                onCheckedChange={(checked) => 
                  setFormData({...formData, item_type: checked ? 'product' : 'service'})
                }
              />
              <Label htmlFor="item_type">
                {formData.item_type === 'service' ? (
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Servicio
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Producto
                  </div>
                )}
              </Label>
            </div>
          </div>
        </div>

        {/* Selección de Servicio o Producto */}
        <div className="space-y-2">
          {formData.item_type === 'service' ? (
            <>
              <Label htmlFor="service">Servicio</Label>
              <Select value={formData.service_id} onValueChange={handleServiceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex flex-col">
                        <span>{service.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {service.category} - {formatCurrency(service.base_price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Label htmlFor="inventory">Producto</Label>
              <Select value={formData.inventory_id} onValueChange={handleInventorySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {item.quantity} - {formatCurrency(item.price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Descripción del servicio o producto"
            required
          />
        </div>

        {/* Cantidad y Precio */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_price">Precio Unitario</Label>
            <Input
              id="unit_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_price}
              onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
              required
            />
          </div>
        </div>

        {/* Descuento */}
        <div className="space-y-2">
          <Label htmlFor="discount">Descuento (%)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            max="100"
            value={formData.discount_percent}
            onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value) || 0})}
          />
        </div>

        {/* Mecánico */}
        <div className="space-y-2">
          <Label htmlFor="mechanic">Mecánico Responsable</Label>
          <Select value={formData.mechanic_id} onValueChange={(value) => setFormData({...formData, mechanic_id: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar mecánico" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{employee.name}</span>
                    {employee.specialties.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {employee.specialties[0]}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Notas adicionales sobre este item"
            rows={3}
          />
        </div>
      </div>

      {/* Vista previa del cálculo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Vista Previa del Cálculo
          </CardTitle>
          <CardDescription>
            Resumen de los cálculos automáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Descuento ({formData.discount_percent}%):</span>
              <span className="text-red-600">-{formatCurrency(totals.discount_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA ({formData.tax_percent}%):</span>
              <span>{formatCurrency(totals.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : (item ? 'Actualizar' : 'Agregar')}
        </Button>
      </div>
    </form>
  )
}

