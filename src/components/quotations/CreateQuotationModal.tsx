'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Save,
  Send,
  X,
  Calculator,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
}

interface Vehicle {
  id: string
  brand: string
  model: string
  license_plate: string
  year?: number
  customer_id: string
}

interface QuotationItem {
  id?: string
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
}

interface Quotation {
  id?: string
  customer_id: string
  vehicle_id: string
  valid_until: string
  terms_and_conditions: string
  notes: string
  status: string
  quotation_items?: QuotationItem[]
}

interface CreateQuotationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation?: Quotation | null
  onSuccess: () => void
}

export function CreateQuotationModal({
  open,
  onOpenChange,
  quotation,
  onSuccess,
}: CreateQuotationModalProps) {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [items, setItems] = useState<QuotationItem[]>([])

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    valid_until: '',
    terms_and_conditions: `Términos y Condiciones:
1. Esta cotización es válida por 30 días a partir de la fecha de emisión.
2. Los precios están sujetos a cambios sin previo aviso.
3. El trabajo comenzará una vez recibida la aprobación y el pago inicial.
4. Garantía de 90 días en servicios y repuestos instalados.
5. Los tiempos de entrega son estimados y pueden variar.`,
    notes: '',
    status: 'draft',
  })

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadCustomers()
      if (quotation) {
        // Cargar datos de edición
        setFormData({
          customer_id: quotation.customer_id || '',
          vehicle_id: quotation.vehicle_id || '',
          valid_until: quotation.valid_until
            ? format(new Date(quotation.valid_until), 'yyyy-MM-dd')
            : '',
          terms_and_conditions: quotation.terms_and_conditions || '',
          notes: quotation.notes || '',
          status: quotation.status || 'draft',
        })
        setSelectedCustomerId(quotation.customer_id || '')
        setItems(quotation.quotation_items || [])
        if (quotation.vehicle_id) {
          loadVehiclesByCustomer(quotation.customer_id)
        }
      } else {
        // Resetear para nueva cotización
        setFormData({
          customer_id: '',
          vehicle_id: '',
          valid_until: format(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            'yyyy-MM-dd'
          ),
          terms_and_conditions: `Términos y Condiciones:
1. Esta cotización es válida por 30 días a partir de la fecha de emisión.
2. Los precios están sujetos a cambios sin previo aviso.
3. El trabajo comenzará una vez recibida la aprobación y el pago inicial.
4. Garantía de 90 días en servicios y repuestos instalados.
5. Los tiempos de entrega son estimados y pueden variar.`,
          notes: '',
          status: 'draft',
        })
        setSelectedCustomerId('')
        setItems([])
        setVehicles([])
      }
    }
  }, [open, quotation])

  // Cargar vehículos cuando cambia el cliente
  useEffect(() => {
    if (selectedCustomerId) {
      loadVehiclesByCustomer(selectedCustomerId)
    } else {
      setVehicles([])
      setFormData((prev) => ({ ...prev, vehicle_id: '' }))
    }
  }, [selectedCustomerId])

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) throw new Error('Error al cargar clientes')

      const result = await response.json()
      if (result.success) {
        setCustomers(result.data || [])
      }
    } catch (error: any) {
      console.error('Error cargando clientes:', error)
      toast.error('Error al cargar clientes')
    }
  }

  const loadVehiclesByCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/vehicles?customer_id=${customerId}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) throw new Error('Error al cargar vehículos')

      const result = await response.json()
      if (result.success) {
        setVehicles(result.data || [])
      }
    } catch (error: any) {
      console.error('Error cargando vehículos:', error)
      toast.error('Error al cargar vehículos')
    }
  }

  // Agregar item
  const handleAddItem = () => {
    const newItem: QuotationItem = {
      item_type: 'service',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: 16,
      subtotal: 0,
      tax_amount: 0,
      total: 0,
    }
    setItems([...items, newItem])
  }

  // Eliminar item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Actualizar item
  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...items]
    const item = { ...updatedItems[index] }

    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent' || field === 'tax_percent') {
      item[field] = parseFloat(value) || 0
    } else {
      item[field] = value
    }

    // Recalcular totales del item
    item.subtotal = item.quantity * item.unit_price
    item.discount_amount = item.subtotal * (item.discount_percent / 100)
    const subtotalAfterDiscount = item.subtotal - item.discount_amount
    item.tax_amount = subtotalAfterDiscount * (item.tax_percent / 100)
    item.total = subtotalAfterDiscount + item.tax_amount

    updatedItems[index] = item
    setItems(updatedItems)
  }

  // Calcular totales
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const discount = items.reduce((sum, item) => sum + item.discount_amount, 0)
    const tax = items.reduce((sum, item) => sum + item.tax_amount, 0)
    const total = items.reduce((sum, item) => sum + item.total, 0)

    return { subtotal, discount, tax, total }
  }

  // Validar formulario
  const validateForm = () => {
    if (!formData.customer_id) {
      toast.error('Selecciona un cliente')
      return false
    }
    if (!formData.vehicle_id) {
      toast.error('Selecciona un vehículo')
      return false
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un item a la cotización')
      return false
    }
    if (items.some((item) => !item.description || item.quantity <= 0 || item.unit_price < 0)) {
      toast.error('Completa todos los campos de los items correctamente')
      return false
    }
    if (!formData.valid_until) {
      toast.error('Selecciona una fecha de vigencia')
      return false
    }
    const validUntil = new Date(formData.valid_until)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (validUntil < today) {
      toast.error('La fecha de vigencia debe ser mayor o igual a hoy')
      return false
    }
    return true
  }

  // Guardar cotización
  const handleSave = async (status: 'draft' | 'sent') => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const totals = calculateTotals()
      const payload = {
        customer_id: formData.customer_id,
        vehicle_id: formData.vehicle_id,
        valid_until: formData.valid_until,
        terms_and_conditions: formData.terms_and_conditions,
        notes: formData.notes,
        status,
        items: items.map((item) => ({
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          tax_percent: item.tax_percent,
          subtotal: item.subtotal,
          tax_amount: item.tax_amount,
          total: item.total,
          service_id: item.service_id || null,
          inventory_id: item.inventory_id || null,
        })),
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        total_amount: totals.total,
      }

      const url = quotation
        ? `/api/quotations/${quotation.id}`
        : '/api/quotations'
      const method = quotation ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar cotización')
      }

      const result = await response.json()
      if (result.success) {
        toast.success(
          status === 'sent'
            ? 'Cotización enviada exitosamente'
            : 'Cotización guardada exitosamente'
        )
        onSuccess()
      } else {
        throw new Error(result.error || 'Error al guardar cotización')
      }
    } catch (error: any) {
      console.error('Error guardando cotización:', error)
      toast.error(error.message || 'Error al guardar cotización')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto bg-bg-primary text-text-primary">
        <DialogHeader>
          <DialogTitle>
            {quotation ? 'Editar Cotización' : 'Nueva Cotización'}
          </DialogTitle>
          <DialogDescription>
            {quotation
              ? 'Modifica los datos de la cotización'
              : 'Completa la información para crear una nueva cotización'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, customer_id: value }))
                  setSelectedCustomerId(value)
                }}
                disabled={!!quotation && quotation.status !== 'draft'}
              >
                <SelectTrigger className="w-full bg-bg-tertiary text-text-primary border-border hover:bg-bg-secondary dark:bg-bg-tertiary dark:text-text-primary">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent className="bg-bg-secondary text-text-primary border-border dark:bg-bg-secondary dark:text-text-primary">
                  {customers.map((customer) => (
                    <SelectItem 
                      key={customer.id} 
                      value={customer.id}
                      className="text-text-primary hover:bg-bg-tertiary focus:bg-bg-tertiary dark:text-text-primary dark:hover:bg-bg-tertiary dark:focus:bg-bg-tertiary"
                    >
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_id">
                Vehículo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, vehicle_id: value }))
                }
                disabled={!formData.customer_id || (!!quotation && quotation.status !== 'draft')}
              >
                <SelectTrigger className="w-full bg-bg-tertiary text-text-primary border-border hover:bg-bg-secondary dark:bg-bg-tertiary dark:text-text-primary">
                  <SelectValue placeholder="Selecciona un vehículo" />
                </SelectTrigger>
                <SelectContent className="bg-bg-secondary text-text-primary border-border dark:bg-bg-secondary dark:text-text-primary">
                  {vehicles.map((vehicle) => (
                    <SelectItem 
                      key={vehicle.id} 
                      value={vehicle.id}
                      className="text-text-primary hover:bg-bg-tertiary focus:bg-bg-tertiary dark:text-text-primary dark:hover:bg-bg-tertiary dark:focus:bg-bg-tertiary"
                    >
                      {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">
                Fecha de Vigencia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, valid_until: e.target.value }))
                }
                min={format(new Date(), 'yyyy-MM-dd')}
                disabled={!!quotation && quotation.status !== 'draft'}
              />
            </div>

            {quotation && (
              <div className="space-y-2">
                <Label>Estado</Label>
                <Badge className={quotation.status === 'draft' ? 'bg-gray-500' : 'bg-blue-500'}>
                  {quotation.status === 'draft' ? 'Borrador' : 'Enviada'}
                </Badge>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Items de la Cotización</Label>
              {(!quotation || quotation.status === 'draft') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>No hay items agregados</p>
                <p className="text-sm mt-2">
                  Haz clic en "Agregar Item" para comenzar
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-32">Precio Unit.</TableHead>
                      <TableHead className="w-24">Desc%</TableHead>
                      <TableHead className="w-32">Subtotal</TableHead>
                      <TableHead className="w-32">IVA</TableHead>
                      <TableHead className="w-32">Total</TableHead>
                      {(!quotation || quotation.status === 'draft') && (
                        <TableHead className="w-16"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.item_type}
                            onValueChange={(value: 'service' | 'product') =>
                              handleUpdateItem(index, 'item_type', value)
                            }
                            disabled={!!quotation && quotation.status !== 'draft'}
                          >
                            <SelectTrigger className="w-32 bg-bg-tertiary text-text-primary border-border hover:bg-bg-secondary dark:bg-bg-tertiary dark:text-text-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-bg-secondary text-text-primary border-border dark:bg-bg-secondary dark:text-text-primary">
                              <SelectItem 
                                value="service"
                                className="text-text-primary hover:bg-bg-tertiary focus:bg-bg-tertiary dark:text-text-primary dark:hover:bg-bg-tertiary dark:focus:bg-bg-tertiary"
                              >
                                Servicio
                              </SelectItem>
                              <SelectItem 
                                value="product"
                                className="text-text-primary hover:bg-bg-tertiary focus:bg-bg-tertiary dark:text-text-primary dark:hover:bg-bg-tertiary dark:focus:bg-bg-tertiary"
                              >
                                Producto
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(index, 'description', e.target.value)
                            }
                            placeholder="Descripción del item"
                            disabled={!!quotation && quotation.status !== 'draft'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(index, 'quantity', e.target.value)
                            }
                            disabled={!!quotation && quotation.status !== 'draft'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleUpdateItem(index, 'unit_price', e.target.value)
                            }
                            disabled={!!quotation && quotation.status !== 'draft'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount_percent}
                            onChange={(e) =>
                              handleUpdateItem(index, 'discount_percent', e.target.value)
                            }
                            disabled={!!quotation && quotation.status !== 'draft'}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          }).format(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          }).format(item.tax_amount)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          }).format(item.total)}
                        </TableCell>
                        {(!quotation || quotation.status === 'draft') && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totales */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-full max-w-md space-y-2 border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento:</span>
                    <span>
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(totals.discount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (16%):</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(totals.tax)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Términos y Condiciones */}
          <div className="space-y-2">
            <Label htmlFor="terms_and_conditions">Términos y Condiciones</Label>
            <Textarea
              id="terms_and_conditions"
              value={formData.terms_and_conditions}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  terms_and_conditions: e.target.value,
                }))
              }
              rows={6}
              disabled={!!quotation && quotation.status !== 'draft'}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              placeholder="Notas adicionales sobre la cotización..."
              disabled={!!quotation && quotation.status !== 'draft'}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {(!quotation || quotation.status === 'draft') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave('draft')}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Borrador
                </Button>
                <Button onClick={() => handleSave('sent')} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  Guardar y Enviar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

