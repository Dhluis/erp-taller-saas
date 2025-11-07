// components/ordenes/CreateWorkOrderModal.tsx
'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
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
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: string
  vehiclePlate?: string
  vehicleColor?: string
  vehicleMileage?: string
  description?: string
  estimated_cost?: string
}

interface Mechanic {
  id: string
  name: string
  role: string
  is_active: boolean
}

const INITIAL_FORM_DATA = {
  // Cliente
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  
  // Vehículo
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: '',
  vehiclePlate: '',
  vehicleColor: '',
  vehicleVin: '',
  vehicleMileage: '',
  
  // Orden
  description: '',
  estimated_cost: '',
  assigned_to: ''
}

const CreateWorkOrderModal = memo(function CreateWorkOrderModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  prefilledServiceType
}: CreateWorkOrderModalProps) {
  // console.log('🔍 [CreateWorkOrderModal] Renderizado - open:', open)
  
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loadingMechanics, setLoadingMechanics] = useState(false)
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'customerName':
        if (!value.trim()) return 'El nombre es requerido'
        if (value.trim().length < 3) return 'Mínimo 3 caracteres'
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras permitidas'
        return ''
        
      case 'customerPhone':
        if (!value.trim()) return 'El teléfono es requerido'
        if (!/^\d+$/.test(value)) return 'Solo números permitidos'
        if (value.length !== 10) return 'Debe tener 10 dígitos'
        return ''
        
      case 'customerEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email inválido'
        }
        return ''
        
      case 'vehicleBrand':
        if (!value.trim()) return 'La marca es requerida'
        return ''
        
      case 'vehicleModel':
        if (!value.trim()) return 'El modelo es requerido'
        return ''
        
      case 'vehicleYear':
        if (!value) return 'El año es requerido'
        const year = parseInt(value)
        const currentYear = new Date().getFullYear()
        if (year < 1900 || year > currentYear + 1) {
          return `Año debe estar entre 1900 y ${currentYear + 1}`
        }
        return ''
        
      case 'vehiclePlate':
        if (!value.trim()) return 'La placa es requerida'
        if (value.length < 5) return 'Placa muy corta'
        return ''
        
      case 'vehicleMileage':
        if (value && !/^\d+$/.test(value)) return 'Solo números permitidos'
        return ''
        
      case 'description':
        if (!value.trim()) return 'La descripción es requerida'
        if (value.trim().length < 10) return 'Mínimo 10 caracteres'
        return ''
        
      case 'estimated_cost':
        if (!value) return 'El costo estimado es requerido'
        if (parseFloat(value) <= 0) return 'Debe ser mayor a 0'
        return ''
        
      default:
        return ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Caso especial para la placa del vehículo (convertir a mayúsculas)
    const processedValue = name === 'vehiclePlate' ? value.toUpperCase() : value
    
    // Actualizar valor
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
    
    // Validar campo
    const error = validateField(name, processedValue)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
    
    console.log('✏️ [Input]', name, '→', processedValue, error ? `❌ ${error}` : '✅')
  }

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

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!open) {
      setFormData(INITIAL_FORM_DATA)
    }
  }, [open])

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
    
    // Validar todos los campos
    const newErrors: Record<string, string> = {}
    
    const fieldsToValidate = [
      'customerName',
      'customerPhone',
      'customerEmail',
      'vehicleBrand',
      'vehicleModel',
      'vehicleYear',
      'vehiclePlate',
      'vehicleMileage',
      'description',
      'estimated_cost'
    ]
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field] || '')
      if (error) newErrors[field] = error
    })
    
    setErrors(newErrors)
    
    // Si hay errores, no continuar
    if (Object.keys(newErrors).length > 0) {
      console.error('❌ [Validación] Errores encontrados:', newErrors)
      toast.error('Por favor corrige los errores en el formulario')
      return
    }
    
    console.log('✅ [Validación] Formulario válido')
    
    // DEBUG: Ver datos del formulario
    console.log('🔍 [CreateOrder] formData COMPLETO:', formData)
    console.log('📋 [CreateOrder] Datos individuales:', {
      nombre: formData.customerName,
      telefono: formData.customerPhone,
      email: formData.customerEmail,
      marca: formData.vehicleBrand,
      modelo: formData.vehicleModel,
      placa: formData.vehiclePlate,
      descripcion: formData.description,
      costo: formData.estimated_cost,
      mecanico: formData.assigned_to
    })
    
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
      console.log('👤 [CreateOrder] Buscando cliente con teléfono:', formData.customerPhone)
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.customerPhone)
        .eq('workshop_id', workshopId)
        .maybeSingle()
      
      console.log('📞 [CreateOrder] Cliente encontrado:', existingCustomer)

      let customerId = existingCustomer?.id

      if (existingCustomer) {
        console.log('✅ Usando cliente existente:', existingCustomer.id, existingCustomer.name)
        customerId = existingCustomer.id
      } else {
        console.log('➕ [CreateOrder] Cliente NO existe, creando nuevo...')
        console.log('📋 Datos del nuevo cliente:', {
          name: formData.customerName,
          phone: formData.customerPhone,
          email: formData.customerEmail,
          address: formData.customerAddress
        })
      }

      // Crear cliente si no existe
      if (!customerId) {
        console.log('➕ [CreateOrder] Creando cliente...')
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            organization_id: organizationId,
            workshop_id: workshopId,
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail || null
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
      console.log('🚗 [CreateOrder] Buscando vehículo:', formData.vehiclePlate)
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('license_plate', formData.vehiclePlate.toUpperCase())
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
            brand: formData.vehicleBrand,
            model: formData.vehicleModel,
            year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
            license_plate: formData.vehiclePlate.toUpperCase(),
            color: formData.vehicleColor || null,
            mileage: formData.vehicleMileage ? parseInt(formData.vehicleMileage) : null
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
        description: `${formData.vehicleBrand} ${formData.vehicleModel} - ${formData.customerName}`
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
    setFormData(INITIAL_FORM_DATA)
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
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  disabled={loading}
                  className={errors.customerName ? 'border-red-500' : ''}
                />
                {errors.customerName && (
                  <p className="text-red-400 text-xs mt-1">{errors.customerName}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="customer_phone">Teléfono *</Label>
                <div className="relative">
                  <Input
                    id="customer_phone"
                    name="customerPhone"
                    required
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    placeholder="4491234567"
                    disabled={loading}
                    maxLength={10}
                    className={`${errors.customerPhone ? 'border-red-500' : 'border-gray-700'} pr-10`}
                  />
                  {!errors.customerPhone && formData.customerPhone && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {errors.customerPhone && (
                    <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                  )}
                </div>
                {errors.customerPhone && (
                  <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="customer_email">Email (opcional)</Label>
              <div className="relative">
                <Input
                  id="customer_email"
                  name="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  placeholder="cliente@ejemplo.com"
                  disabled={loading}
                  className={`${errors.customerEmail ? 'border-red-500' : 'border-gray-700'} pr-10`}
                />
                {!errors.customerEmail && formData.customerEmail && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {errors.customerEmail && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {errors.customerEmail && (
                <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>
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
                  name="vehicleBrand"
                  required
                  value={formData.vehicleBrand}
                  onChange={handleChange}
                  placeholder="Toyota, Honda..."
                  disabled={loading}
                  className={errors.vehicleBrand ? 'border-red-500' : ''}
                />
                {errors.vehicleBrand && (
                  <p className="text-red-400 text-xs mt-1">{errors.vehicleBrand}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="vehicle_model">Modelo *</Label>
                <Input
                  id="vehicle_model"
                  name="vehicleModel"
                  required
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  placeholder="Corolla, Civic..."
                  disabled={loading}
                  className={errors.vehicleModel ? 'border-red-500' : ''}
                />
                {errors.vehicleModel && (
                  <p className="text-red-400 text-xs mt-1">{errors.vehicleModel}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vehicle_year">Año *</Label>
                <div className="relative">
                  <Input
                    id="vehicle_year"
                    name="vehicleYear"
                    required
                    type="number"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                    placeholder="2020"
                    disabled={loading}
                    className={`${errors.vehicleYear ? 'border-red-500' : 'border-gray-700'} pr-10`}
                  />
                  {!errors.vehicleYear && formData.vehicleYear && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {errors.vehicleYear && (
                    <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                  )}
                </div>
                {errors.vehicleYear && (
                  <p className="text-xs text-red-500 mt-1">{errors.vehicleYear}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="vehicle_plate">Placa *</Label>
                <Input
                  id="vehicle_plate"
                  name="vehiclePlate"
                  required
                  value={formData.vehiclePlate}
                  onChange={handleChange}
                  placeholder="ABC-123-D"
                  className={`uppercase ${errors.vehiclePlate ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {errors.vehiclePlate && (
                  <p className="text-red-400 text-xs mt-1">{errors.vehiclePlate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_color">Color</Label>
                <Input
                  id="vehicle_color"
                  name="vehicleColor"
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  placeholder="Blanco..."
                  disabled={loading}
                  className={errors.vehicleColor ? 'border-red-500' : ''}
                />
                {errors.vehicleColor && (
                  <p className="text-red-400 text-xs mt-1">{errors.vehicleColor}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="mileage">Kilometraje</Label>
              <div className="relative">
                <Input
                  id="mileage"
                  name="vehicleMileage"
                  type="number"
                  value={formData.vehicleMileage}
                  onChange={handleChange}
                  placeholder="50000"
                  disabled={loading}
                  className={`${errors.vehicleMileage ? 'border-red-500' : 'border-gray-700'} pr-10`}
                />
                {!errors.vehicleMileage && formData.vehicleMileage && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {errors.vehicleMileage && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {errors.vehicleMileage && (
                <p className="text-xs text-red-500 mt-1">{errors.vehicleMileage}</p>
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
                name="description"
                required
                rows={4}
                placeholder="Cambio de aceite, revisión de frenos..."
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-red-400 text-xs mt-1">{errors.description}</p>
              )}
            </div>

            <div>
              <Label htmlFor="estimated_cost">Costo Estimado (MXN)</Label>
              <div className="relative">
                <Input
                  id="estimated_cost"
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={loading}
                  className={`${errors.estimated_cost ? 'border-red-500' : 'border-gray-700'} pr-10`}
                />
                {!errors.estimated_cost && formData.estimated_cost && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {errors.estimated_cost && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {errors.estimated_cost && (
                <p className="text-xs text-red-500 mt-1">{errors.estimated_cost}</p>
              )}
            </div>

            <div>
              <Label htmlFor="assigned_to">Asignar Mecánico (opcional)</Label>
              <Select
                name="assigned_to"
                value={formData.assigned_to || undefined}
                onValueChange={(value) => {
                  console.log('✏️ [Select] Cambio detectado: assigned_to →', value)
                  setFormData(prev => ({ ...prev, assigned_to: value }))
                }}
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
})

export default CreateWorkOrderModal



