// components/dashboard/CreateWorkOrderModal.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
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
  SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle2, User } from 'lucide-react'

interface CreateWorkOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  prefilledServiceType?: string
}

interface ValidationErrors {
  customer_phone?: string
  customer_email?: string
  vehicle_year?: string
  mileage?: string
  estimated_cost?: string
}

interface Mechanic {
  id: string
  name: string
  role: string
  is_active: boolean
}

export function CreateWorkOrderModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  prefilledServiceType
}: CreateWorkOrderModalProps) {
  console.log('🔍 [CreateWorkOrderModal] Renderizado - open:', open)
  
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loadingMechanics, setLoadingMechanics] = useState(false)
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_color: '',
    mileage: '',
    description: '',
    estimated_cost: '',
    assigned_to: '' // Campo corregido
  })

  const loadMechanics = useCallback(async () => {
    if (!profile?.workshop_id) return
    
    try {
      setLoadingMechanics(true)
      const client = createClient()
      
      const { data, error } = await client
        .from('employees')
        .select('id, name, role, email')
        .eq('workshop_id', profile.workshop_id)
        .eq('is_active', true)
        .in('role', ['mechanic', 'technician'])
        .order('name')
      
      if (error) throw error
      
      setMechanics(data || [])
      console.log('✅ Mecánicos disponibles:', data?.length || 0)
    } catch (error) {
      console.error('Error cargando mecánicos:', error)
    } finally {
      setLoadingMechanics(false)
    }
  }, [profile?.workshop_id])

  // Cargar mecánicos cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadMechanics()
    }
  }, [open, loadMechanics])

  // Prefijar descripción según el tipo de servicio
  useEffect(() => {
    if (open && prefilledServiceType) {
      const serviceDescriptions: Record<string, string> = {
        'diagnostico': 'Diagnóstico general del vehículo',
        'mantenimiento': 'Servicio de mantenimiento preventivo',
        'reparacion': 'Reparación correctiva'
      }
      
      const description = serviceDescriptions[prefilledServiceType]
      if (description) {
        setFormData(prev => ({
          ...prev,
          description: description
        }))
      }
    }
  }, [open, prefilledServiceType]) // eslint-disable-next-line react-hooks/exhaustive-deps

  // Validaciones
  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return undefined
    
    // Limpiar el teléfono de caracteres no numéricos
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 0) return undefined
    if (cleaned.length < 10) return 'El teléfono debe tener al menos 10 dígitos'
    if (cleaned.length > 15) return 'El teléfono es demasiado largo'
    
    return undefined
  }

  const validateEmail = (email: string): string | undefined => {
    if (!email) return undefined
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Email inválido'
    
    return undefined
  }

  const validateYear = (year: string): string | undefined => {
    if (!year) return undefined
    
    const yearNum = parseInt(year)
    const currentYear = new Date().getFullYear()
    
    if (isNaN(yearNum)) return 'Año inválido'
    if (yearNum < 1900) return 'Año muy antiguo'
    if (yearNum > currentYear + 1) return 'Año futuro no válido'
    
    return undefined
  }

  const validateMileage = (mileage: string): string | undefined => {
    if (!mileage) return undefined
    
    const mileageNum = parseInt(mileage)
    if (isNaN(mileageNum)) return 'Kilometraje inválido'
    if (mileageNum < 0) return 'No puede ser negativo'
    if (mileageNum > 999999) return 'Kilometraje muy alto'
    
    return undefined
  }

  const validateEstimatedCost = (cost: string): string | undefined => {
    if (!cost) return undefined
    
    const costNum = parseFloat(cost)
    if (isNaN(costNum)) return 'Costo inválido'
    if (costNum < 0) return 'No puede ser negativo'
    if (costNum > 9999999) return 'Costo muy alto'
    
    return undefined
  }

  // Manejar cambios con validación
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Validar según el campo
    let error: string | undefined
    
    switch (field) {
      case 'customer_phone':
        error = validatePhone(value)
        break
      case 'customer_email':
        error = validateEmail(value)
        break
      case 'vehicle_year':
        error = validateYear(value)
        break
      case 'mileage':
        error = validateMileage(value)
        break
      case 'estimated_cost':
        error = validateEstimatedCost(value)
        break
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const isFieldValid = (field: keyof ValidationErrors) => {
    return touched[field] && !errors[field] && formData[field]
  }

  const isFieldInvalid = (field: keyof ValidationErrors) => {
    return touched[field] && errors[field]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Marcar todos como touched
    const allFields = ['customer_phone', 'customer_email', 'vehicle_year', 'mileage', 'estimated_cost']
    const newTouched: Record<string, boolean> = {}
    allFields.forEach(field => { newTouched[field] = true })
    setTouched(newTouched)
    
    // Validar todos los campos
    const newErrors: ValidationErrors = {
      customer_phone: validatePhone(formData.customer_phone),
      customer_email: validateEmail(formData.customer_email),
      vehicle_year: validateYear(formData.vehicle_year),
      mileage: validateMileage(formData.mileage),
      estimated_cost: validateEstimatedCost(formData.estimated_cost)
    }
    
    setErrors(newErrors)
    
    // Si hay errores, no continuar
    const hasErrors = Object.values(newErrors).some(error => error !== undefined)
    if (hasErrors) {
      toast.error('Por favor corrige los errores del formulario')
      return
    }
    
    if (!user || !profile) {
      toast.error('Error', {
        description: 'No hay sesión activa. Por favor recarga la página.'
      })
      return
    }

    setLoading(true)
    console.log('🚀 [CreateOrder] Iniciando creación de orden...')

    try {
      const workshopId = profile.workshop_id

      if (!workshopId) {
        throw new Error('No se encontró workshop_id en el perfil')
      }

      console.log('✅ [CreateOrder] Workshop ID:', workshopId)

      // Obtener organization_id del workshop
      const { data: workshopData, error: workshopError } = await supabase
        .from('workshops')
        .select('organization_id')
        .eq('id', workshopId)
        .single()

      if (workshopError || !workshopData) {
        console.error('❌ [CreateOrder] Error obteniendo workshop:', workshopError)
        throw new Error('No se pudo obtener los datos del taller')
      }

      const organizationId = workshopData.organization_id
      console.log('✅ [CreateOrder] Organization ID:', organizationId)

      // Verificar si el cliente ya existe
      console.log('👥 [CreateOrder] Buscando cliente:', formData.customer_phone)
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', formData.customer_phone)
        .eq('workshop_id', workshopId)
        .maybeSingle()

      let customerId = existingCustomer?.id

      // Crear cliente si no existe
      if (!customerId) {
        console.log('➕ [CreateOrder] Creando cliente...')
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            organization_id: organizationId,
            workshop_id: workshopId,
            name: formData.customer_name,
            phone: formData.customer_phone,
            email: formData.customer_email || null
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
        console.log('✅ [CreateOrder] Cliente creado:', customerId)
      } else {
        console.log('✅ [CreateOrder] Cliente encontrado:', customerId)
      }

      // Verificar si el vehículo ya existe
      console.log('🚗 [CreateOrder] Buscando vehículo:', formData.vehicle_plate)
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('license_plate', formData.vehicle_plate.toUpperCase())
        .eq('workshop_id', workshopId)
        .maybeSingle()

      let vehicleId = existingVehicle?.id

      // Crear vehículo si no existe
      if (!vehicleId) {
        console.log('➕ [CreateOrder] Creando vehículo...')
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            customer_id: customerId,
            workshop_id: workshopId,
            brand: formData.vehicle_brand,
            model: formData.vehicle_model,
            year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
            license_plate: formData.vehicle_plate.toUpperCase(),
            color: formData.vehicle_color || null,
            mileage: formData.mileage ? parseInt(formData.mileage) : null
          })
          .select()
          .single()

        if (vehicleError) throw vehicleError
        vehicleId = newVehicle.id
        console.log('✅ [CreateOrder] Vehículo creado:', vehicleId)
      } else {
        console.log('✅ [CreateOrder] Vehículo encontrado:', vehicleId)
      }

      // Crear la orden de trabajo
      console.log('📋 [CreateOrder] Creando orden...')
      
      const orderData = {
        organization_id: organizationId,
        workshop_id: workshopId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        description: formData.description?.trim() || 'Sin descripción',
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        status: 'reception',
        entry_date: new Date().toISOString(),
        assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' 
          ? formData.assigned_to 
          : null
      }

      console.log('📊 [CreateOrder] orderData completo:', JSON.stringify(orderData, null, 2))

      const { data: newOrder, error: orderError } = await supabase
        .from('work_orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) {
        console.error('❌ [CreateOrder] Error completo:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        })
        throw new Error(`Error creando orden: ${orderError.message}`)
      }

      console.log('✅ [CreateOrder] ¡Orden creada!:', newOrder.id)
      
      if (formData.assigned_to) {
        console.log('👷 [CreateOrder] Mecánico asignado directamente a la orden:', formData.assigned_to)
      }

      toast.success('Orden creada exitosamente', {
        description: `${formData.vehicle_brand} ${formData.vehicle_model} - ${formData.customer_name}`
      })
      
      onOpenChange(false)
      resetForm()
      onSuccess?.()

    } catch (error: any) {
      console.error('❌ [CreateOrder] Error:', error)
      toast.error('Error al crear la orden', {
        description: error.message || 'Verifica los datos e intenta nuevamente'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      vehicle_brand: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_plate: '',
      vehicle_color: '',
      mileage: '',
      description: '',
      estimated_cost: '',
      assigned_to: ''
    })
    setErrors({})
    setTouched({})
  }

  if (!user || !profile) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
          <DialogDescription>
            La orden se creará en estado Recepción
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Cliente */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">
              Datos del Cliente
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Nombre *</Label>
                <Input
                  id="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Juan Pérez"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="customer_phone">Teléfono *</Label>
                <div className="relative">
                  <Input
                    id="customer_phone"
                    required
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => handleFieldChange('customer_phone', e.target.value)}
                    onBlur={() => handleBlur('customer_phone')}
                    placeholder="222-123-4567"
                    disabled={loading}
                    className={
                      isFieldInvalid('customer_phone') 
                        ? 'border-red-500 pr-10' 
                        : isFieldValid('customer_phone')
                        ? 'border-green-500 pr-10'
                        : ''
                    }
                  />
                  {isFieldValid('customer_phone') && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {isFieldInvalid('customer_phone') && (
                    <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                  )}
                </div>
                {isFieldInvalid('customer_phone') && (
                  <p className="text-xs text-red-500 mt-1">{errors.customer_phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="customer_email">Email (opcional)</Label>
              <div className="relative">
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleFieldChange('customer_email', e.target.value)}
                  onBlur={() => handleBlur('customer_email')}
                  placeholder="cliente@ejemplo.com"
                  disabled={loading}
                  className={
                    isFieldInvalid('customer_email') 
                      ? 'border-red-500 pr-10' 
                      : isFieldValid('customer_email')
                      ? 'border-green-500 pr-10'
                      : ''
                  }
                />
                {isFieldValid('customer_email') && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {isFieldInvalid('customer_email') && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {isFieldInvalid('customer_email') && (
                <p className="text-xs text-red-500 mt-1">{errors.customer_email}</p>
              )}
            </div>
          </div>

          {/* Datos del Vehículo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">
              Datos del Vehículo
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_brand">Marca *</Label>
                <Input
                  id="vehicle_brand"
                  required
                  value={formData.vehicle_brand}
                  onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                  placeholder="Toyota, Honda..."
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="vehicle_model">Modelo *</Label>
                <Input
                  id="vehicle_model"
                  required
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                  placeholder="Corolla, Civic..."
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vehicle_year">Año *</Label>
                <div className="relative">
                  <Input
                    id="vehicle_year"
                    required
                    type="number"
                    value={formData.vehicle_year}
                    onChange={(e) => handleFieldChange('vehicle_year', e.target.value)}
                    onBlur={() => handleBlur('vehicle_year')}
                    placeholder="2020"
                    disabled={loading}
                    className={
                      isFieldInvalid('vehicle_year') 
                        ? 'border-red-500 pr-10' 
                        : isFieldValid('vehicle_year')
                        ? 'border-green-500 pr-10'
                        : ''
                    }
                  />
                  {isFieldValid('vehicle_year') && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {isFieldInvalid('vehicle_year') && (
                    <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                  )}
                </div>
                {isFieldInvalid('vehicle_year') && (
                  <p className="text-xs text-red-500 mt-1">{errors.vehicle_year}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="vehicle_plate">Placa *</Label>
                <Input
                  id="vehicle_plate"
                  required
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-123-D"
                  className="uppercase"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="vehicle_color">Color</Label>
                <Input
                  id="vehicle_color"
                  value={formData.vehicle_color}
                  onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                  placeholder="Blanco..."
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="mileage">Kilometraje</Label>
              <div className="relative">
                <Input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => handleFieldChange('mileage', e.target.value)}
                  onBlur={() => handleBlur('mileage')}
                  placeholder="50000"
                  disabled={loading}
                  className={
                    isFieldInvalid('mileage') 
                      ? 'border-red-500 pr-10' 
                      : isFieldValid('mileage')
                      ? 'border-green-500 pr-10'
                      : ''
                  }
                />
                {isFieldValid('mileage') && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {isFieldInvalid('mileage') && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {isFieldInvalid('mileage') && (
                <p className="text-xs text-red-500 mt-1">{errors.mileage}</p>
              )}
            </div>
          </div>

          {/* Descripción del Trabajo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">
              Descripción del Trabajo
            </h3>

            <div>
              <Label htmlFor="description">Servicio requerido *</Label>
              <Textarea
                id="description"
                required
                rows={4}
                placeholder="Cambio de aceite, revisión de frenos..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="estimated_cost">Costo Estimado (MXN)</Label>
              <div className="relative">
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => handleFieldChange('estimated_cost', e.target.value)}
                  onBlur={() => handleBlur('estimated_cost')}
                  placeholder="0.00"
                  disabled={loading}
                  className={
                    isFieldInvalid('estimated_cost') 
                      ? 'border-red-500 pr-10' 
                      : isFieldValid('estimated_cost')
                      ? 'border-green-500 pr-10'
                      : ''
                  }
                />
                {isFieldValid('estimated_cost') && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {isFieldInvalid('estimated_cost') && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {isFieldInvalid('estimated_cost') && (
                <p className="text-xs text-red-500 mt-1">{errors.estimated_cost}</p>
              )}
            </div>

            <div>
              <Label htmlFor="assigned_to">Asignar Mecánico (opcional)</Label>
              <Select
                value={formData.assigned_to || undefined}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                disabled={loading || loadingMechanics || mechanics.length === 0}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={
                      loadingMechanics 
                        ? "Cargando mecánicos..." 
                        : mechanics.length === 0 
                          ? "No hay mecánicos disponibles" 
                          : "Sin asignar"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.length > 0 ? (
                    mechanics
                      .filter(m => m.id && m.id.trim() !== '') // Seguridad extra
                      .map((mechanic) => (
                        <SelectItem key={mechanic.id} value={mechanic.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {mechanic.name} ({mechanic.role})
                          </div>
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No hay mecánicos disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
              {mechanics.length === 0 && !loadingMechanics && (
                <p className="text-xs text-gray-500 mt-1">
                  No hay mecánicos disponibles. Ve a la sección Mecánicos para agregar algunos.
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
