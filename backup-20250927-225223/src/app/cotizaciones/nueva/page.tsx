"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddItemModal } from "@/components/orders/add-item-modal"
import { 
  ArrowLeft, 
  Save, 
  Send, 
  User, 
  Car, 
  Calendar, 
  Clock, 
  DollarSign,
  FileText,
  Plus,
  Calculator,
  Edit,
  Trash2
} from "lucide-react"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
}

interface Vehicle {
  id: string
  brand: string
  model: string
  year: number
  license_plate: string
  customer_id: string
}

interface QuotationItem {
  id?: string
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
}

interface QuotationFormData {
  client_id: string
  vehicle_id: string
  valid_until: string
  payment_terms: string
  delivery_time: string
  terms_conditions: string
  notes: string
  status: string
}

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [items, setItems] = useState<QuotationItem[]>([])
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null)

  const [formData, setFormData] = useState<QuotationFormData>({
    client_id: "",
    vehicle_id: "",
    valid_until: "",
    payment_terms: "30 días",
    delivery_time: "5-7 días hábiles",
    terms_conditions: "",
    notes: "",
    status: "draft"
  })

  useEffect(() => {
    loadCustomers()
    setDefaultValidUntil()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      loadVehiclesByCustomer(selectedCustomer)
    } else {
      setVehicles([])
    }
  }, [selectedCustomer])

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (!response.ok) throw new Error('Error al cargar clientes')
      
      const data = await response.json()
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadVehiclesByCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/vehicles`)
      if (!response.ok) throw new Error('Error al cargar vehículos')
      
      const data = await response.json()
      setVehicles(data)
    } catch (error) {
      console.error('Error loading vehicles:', error)
    }
  }

  const setDefaultValidUntil = () => {
    const date = new Date()
    date.setDate(date.getDate() + 15) // 15 días por defecto
    setFormData(prev => ({
      ...prev,
      valid_until: date.toISOString().split('T')[0]
    }))
  }

  const handleAddItem = () => {
    setEditingItem(null)
    setIsItemModalOpen(true)
  }

  const handleEditItem = (item: QuotationItem) => {
    setEditingItem(item)
    setIsItemModalOpen(true)
  }

  const handleItemSaved = () => {
    setIsItemModalOpen(false)
    setEditingItem(null)
    // Recargar items si es necesario
  }

  const handleDeleteItem = (itemIndex: number) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      setItems(prev => prev.filter((_, index) => index !== itemIndex))
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const totalDiscounts = items.reduce((sum, item) => sum + item.discount_amount, 0)
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0)
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0)

    return { subtotal, totalDiscounts, totalTax, grandTotal }
  }

  const handleSubmit = async (status: 'draft' | 'sent') => {
    if (!formData.client_id || !formData.vehicle_id) {
      alert('Por favor selecciona un cliente y vehículo')
      return
    }

    if (items.length === 0) {
      alert('Por favor agrega al menos un item a la cotización')
      return
    }

    try {
      setLoading(true)
      const totals = calculateTotals()

      const quotationData = {
        ...formData,
        status,
        subtotal: totals.subtotal,
        discount_amount: totals.totalDiscounts,
        tax_amount: totals.totalTax,
        total: totals.grandTotal,
        items: items
      }

      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quotationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al guardar cotización')
      }

      const result = await response.json()
      
      if (status === 'draft') {
        alert('Cotización guardada como borrador')
      } else {
        alert('Cotización enviada al cliente')
      }

      router.push('/cotizaciones')
    } catch (error) {
      console.error('Error saving quotation:', error)
      alert(error instanceof Error ? error.message : 'Error al guardar cotización')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
  const selectedVehicleData = vehicles.find(v => v.id === formData.vehicle_id)
  const totals = calculateTotals()

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cotizaciones">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nueva Cotización</h2>
            <p className="text-muted-foreground">
              Crea una nueva cotización de servicios
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSubmit('draft')}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Borrador
          </Button>
          <Button 
            onClick={() => handleSubmit('sent')}
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar al Cliente
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Información Básica */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información Básica
            </CardTitle>
            <CardDescription>
              Datos del cliente, vehículo y condiciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_id">Cliente *</Label>
                <Select 
                  value={selectedCustomer} 
                  onValueChange={(value) => {
                    setSelectedCustomer(value)
                    setFormData(prev => ({ ...prev, client_id: value, vehicle_id: "" }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vehicle_id">Vehículo *</Label>
                <Select 
                  value={formData.vehicle_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
                  disabled={!selectedCustomer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCustomer ? "Seleccionar vehículo" : "Primero selecciona un cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          <div>
                            <p className="font-medium">
                              {vehicle.brand} {vehicle.model} {vehicle.year}
                            </p>
                            <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valid_until">Válida hasta *</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Condiciones de Pago</Label>
                <Select 
                  value={formData.payment_terms} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Contado</SelectItem>
                    <SelectItem value="30 días">30 días</SelectItem>
                    <SelectItem value="45 días">45 días</SelectItem>
                    <SelectItem value="60 días">60 días</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="delivery_time">Tiempo de Entrega</Label>
                <Select 
                  value={formData.delivery_time} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 días hábiles">1-2 días hábiles</SelectItem>
                    <SelectItem value="3-5 días hábiles">3-5 días hábiles</SelectItem>
                    <SelectItem value="5-7 días hábiles">5-7 días hábiles</SelectItem>
                    <SelectItem value="1-2 semanas">1-2 semanas</SelectItem>
                    <SelectItem value="2-4 semanas">2-4 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Totales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomerData && (
              <div>
                <Label className="text-sm font-medium">Cliente</Label>
                <p className="text-sm">{selectedCustomerData.name}</p>
                <p className="text-xs text-muted-foreground">{selectedCustomerData.email}</p>
              </div>
            )}

            {selectedVehicleData && (
              <div>
                <Label className="text-sm font-medium">Vehículo</Label>
                <p className="text-sm">
                  {selectedVehicleData.brand} {selectedVehicleData.model} {selectedVehicleData.year}
                </p>
                <p className="text-xs text-muted-foreground">{selectedVehicleData.license_plate}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Descuentos:</span>
                <span className="text-red-600">-{formatCurrency(totals.totalDiscounts)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (16%):</span>
                <span>{formatCurrency(totals.totalTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Items: {items.length}</p>
              <p>Válida hasta: {new Date(formData.valid_until).toLocaleDateString('es-MX')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items/Servicios */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Servicios y Productos</CardTitle>
              <CardDescription>
                Agrega los servicios y productos a cotizar
              </CardDescription>
            </div>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay items agregados</p>
              <p className="text-sm">Haz clic en "Agregar Item" para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {item.item_type === 'service' ? 'Servicio' : 'Producto'}
                      </Badge>
                      <span className="font-medium">{item.description}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                      {item.discount_percent > 0 && ` (${item.discount_percent}% desc.)`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Términos y Condiciones */}
      <Card>
        <CardHeader>
          <CardTitle>Términos y Condiciones</CardTitle>
          <CardDescription>
            Define los términos y condiciones de la cotización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="terms_conditions">Términos y Condiciones</Label>
            <Textarea
              id="terms_conditions"
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              placeholder="Especifica los términos y condiciones..."
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales o comentarios..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal para agregar/editar items */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Item' : 'Agregar Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modifica los datos del item' : 'Agrega un nuevo servicio o producto a la cotización'}
            </DialogDescription>
          </DialogHeader>
          <AddItemModal
            orderId="" // No se usa para cotizaciones
            item={editingItem}
            onSave={() => {
              // Lógica para manejar items en cotizaciones
              handleItemSaved()
            }}
            onCancel={() => setIsItemModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
