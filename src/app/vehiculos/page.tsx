'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Car, 
  User,
  Calendar,
  Hash,
  Palette,
  Gauge,
  Edit,
  Trash2,
  Filter,
  Home,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface Vehicle {
  id: string
  brand: string
  model: string
  year?: number
  license_plate?: string
  vin?: string
  color?: string
  mileage?: number
  created_at: string
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
  }
}

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    brand: '',
    model: '',
    year: '',
    license_plate: '',
    vin: '',
    color: '',
    mileage: ''
  })

  // Cargar vehículos y clientes
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar vehículos
      const vehiclesResponse = await fetch('/api/vehicles')
      if (!vehiclesResponse.ok) throw new Error('Error al cargar vehículos')
      const vehiclesData = await vehiclesResponse.json()
      setVehicles(vehiclesData)

      // Cargar clientes
      const customersResponse = await fetch('/api/customers')
      if (!customersResponse.ok) throw new Error('Error al cargar clientes')
      const customersData = await customersResponse.json()
      setCustomers(customersData)

    } catch (error: any) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Crear vehículo
  const createVehicle = async () => {
    try {
      const vehicleData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null
      }

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
      })

      if (!response.ok) throw new Error('Error al crear vehículo')

      const newVehicle = await response.json()
      setVehicles(prev => [newVehicle, ...prev])
      setShowCreateDialog(false)
      setFormData({
        customer_id: '',
        brand: '',
        model: '',
        year: '',
        license_plate: '',
        vin: '',
        color: '',
        mileage: ''
      })
      toast.success('Vehículo creado exitosamente')
    } catch (error: any) {
      console.error('Error creando vehículo:', error)
      toast.error('Error al crear vehículo')
    }
  }

  // Actualizar vehículo
  const updateVehicle = async () => {
    if (!selectedVehicle) return

    try {
      const vehicleData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null
      }

      const response = await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
      })

      if (!response.ok) throw new Error('Error al actualizar vehículo')

      const updatedVehicle = await response.json()
      setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? updatedVehicle : v))
      setShowEditDialog(false)
      setSelectedVehicle(null)
      setFormData({
        customer_id: '',
        brand: '',
        model: '',
        year: '',
        license_plate: '',
        vin: '',
        color: '',
        mileage: ''
      })
      toast.success('Vehículo actualizado exitosamente')
    } catch (error: any) {
      console.error('Error actualizando vehículo:', error)
      toast.error('Error al actualizar vehículo')
    }
  }

  // Eliminar vehículo
  const deleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`¿Estás seguro de eliminar el vehículo ${vehicle.brand} ${vehicle.model}?`)) return

    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar vehículo')
      }

      setVehicles(prev => prev.filter(v => v.id !== vehicle.id))
      toast.success('Vehículo eliminado exitosamente')
    } catch (error: any) {
      console.error('Error eliminando vehículo:', error)
      toast.error(error.message || 'Error al eliminar vehículo')
    }
  }

  // Abrir edición
  const openEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setFormData({
      customer_id: vehicle.customer.id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      license_plate: vehicle.license_plate || '',
      vin: vehicle.vin || '',
      color: vehicle.color || '',
      mileage: vehicle.mileage?.toString() || ''
    })
    setShowEditDialog(true)
  }

  // Filtrar vehículos
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="container mx-auto p-6">
      {/* Migas de Pan */}
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <a href="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
          <span>Inicio</span>
        </a>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Car className="h-4 w-4 text-blue-500" />
          <span>Vehículos</span>
        </div>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vehículos</h1>
          <p className="text-muted-foreground">Gestiona los vehículos de tus clientes</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Vehículo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer">Cliente *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Toyota, Ford, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Corolla, Focus, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <Label htmlFor="license_plate">Placas</Label>
                  <Input
                    id="license_plate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
                    placeholder="ABC-123"
                  />
                </div>
                <div>
                  <Label htmlFor="mileage">Kilometraje</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                    placeholder="50000"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                    placeholder="Número de identificación del vehículo"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="Rojo, Azul, Blanco, etc."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={createVehicle}
                  disabled={!formData.customer_id || !formData.brand || !formData.model}
                >
                  Crear Vehículo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vehículos por marca, modelo, placas o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de vehículos */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando vehículos...</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay vehículos</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No se encontraron vehículos con ese criterio' : 'Comienza agregando el primer vehículo'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Vehículo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {vehicle.brand} {vehicle.model}
                    </CardTitle>
                    {vehicle.year && (
                      <p className="text-sm text-muted-foreground">
                        Modelo {vehicle.year}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(vehicle)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteVehicle(vehicle)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Cliente */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{vehicle.customer.name}</span>
                </div>

                {/* Información del vehículo */}
                <div className="space-y-2">
                  {vehicle.license_plate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span>Placas: </span>
                      <Badge variant="secondary">{vehicle.license_plate}</Badge>
                    </div>
                  )}
                  
                  {vehicle.color && (
                    <div className="flex items-center gap-2 text-sm">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <span>Color: {vehicle.color}</span>
                    </div>
                  )}
                  
                  {vehicle.mileage && (
                    <div className="flex items-center gap-2 text-sm">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span>{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                </div>

                {/* VIN */}
                {vehicle.vin && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      VIN: {vehicle.vin}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Vehículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-customer">Cliente *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-brand">Marca *</Label>
                <Input
                  id="edit-brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Toyota, Ford, etc."
                />
              </div>
              <div>
                <Label htmlFor="edit-model">Modelo *</Label>
                <Input
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Corolla, Focus, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-year">Año</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <Label htmlFor="edit-license_plate">Placas</Label>
                <Input
                  id="edit-license_plate"
                  value={formData.license_plate}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
                  placeholder="ABC-123"
                />
              </div>
              <div>
                <Label htmlFor="edit-mileage">Kilometraje</Label>
                <Input
                  id="edit-mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                  placeholder="50000"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-vin">VIN</Label>
                <Input
                  id="edit-vin"
                  value={formData.vin}
                  onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                  placeholder="Número de identificación del vehículo"
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="Rojo, Azul, Blanco, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={updateVehicle}
                disabled={!formData.customer_id || !formData.brand || !formData.model}
              >
                Actualizar Vehículo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}