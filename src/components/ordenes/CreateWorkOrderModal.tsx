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
import { useOrganization } from '@/contexts/OrganizationContext'
import { createClient } from '@/lib/supabase/client'
import { useCustomers } from '@/hooks/useCustomers'

import { AlertCircle, CheckCircle2, User, Droplet, Fuel, Shield, Clipboard, Wrench, ChevronDown } from 'lucide-react'

interface CreateWorkOrderModalProps {

  open: boolean

  onOpenChange: (open: boolean) => void

  onSuccess?: () => void

  prefilledServiceType?: string

  organizationId?: string | null  // ✅ Opcional: si no se proporciona, usa el context

  appointmentId?: string | null  // ✅ ID de la cita para pre-llenar datos

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

interface SystemUser {

  id: string

  first_name: string

  last_name: string

  role: string

  email?: string

  is_active?: boolean

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

  assigned_to: '',

  

  // ✅ NUEVO: Inspección

  fluids: {

    aceite_motor: false,

    aceite_transmision: false,

    liquido_frenos: false,

    liquido_embrague: false,

    refrigerante: false,

    aceite_hidraulico: false,

    limpia_parabrisas: false,

  },

  fuel_level: 'half',

  valuable_items: '',

  will_diagnose: false,

  entry_reason: '',

  procedures: '',

  is_warranty: false,

  authorize_test_drive: false,

}

const CreateWorkOrderModal = memo(function CreateWorkOrderModal({ 

  open, 

  onOpenChange, 

  onSuccess,

  prefilledServiceType,

  organizationId: propOrganizationId,

  appointmentId

}: CreateWorkOrderModalProps) {
  // ✅ Usar context si no se proporciona como prop
  const { organizationId: contextOrganizationId } = useOrganization();
  const organizationId = propOrganizationId ?? contextOrganizationId;

  const { user, profile } = useAuth()

  const supabase = createClient()
  
  // ✅ Cargar clientes existentes
  const { customers } = useCustomers()

  const [loading, setLoading] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  
  // Estado para el dropdown de clientes
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<typeof customers>([])

  // Log cuando los clientes cambian
  useEffect(() => {
    console.log('📦 [Dropdown] Clientes cargados del hook:', customers.length);
    if (customers.length > 0) {
      console.log('📋 [Dropdown] Primeros clientes:', customers.slice(0, 3).map(c => c.name));
    }
  }, [customers])

  const [loadingSystemUsers, setLoadingSystemUsers] = useState(false)

  

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

    

    const processedValue = name === 'vehiclePlate' ? value.toUpperCase() : value

    

    setFormData(prev => ({

      ...prev,

      [name]: processedValue

    }))

    

    const error = validateField(name, processedValue)

    setErrors(prev => ({

      ...prev,

      [name]: error

    }))

  }

  const loadSystemUsers = useCallback(async () => {
    if (!organizationId) return

    try {
      setLoadingSystemUsers(true)
      const client = createClient()

      // Cargar usuarios del sistema activos de la organización
      const { data, error } = await client
        .from('system_users')
        .select('id, first_name, last_name, role, email')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')

      if (error) throw error

      setSystemUsers(data || [])
    } catch (error) {
      console.error('Error cargando usuarios del sistema:', error)
    } finally {
      setLoadingSystemUsers(false)
    }
  }, [organizationId])

  useEffect(() => {

    if (open) {

      loadSystemUsers()

    }

  }, [open, loadSystemUsers])

  // ✅ Cargar datos de la cita cuando se proporciona appointmentId
  useEffect(() => {
    if (open && appointmentId && organizationId) {
      const loadAppointmentData = async () => {
        try {
          const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
              *,
              customer:customers(id, name, phone, email),
              vehicle:vehicles(id, brand, model, year, license_plate, color, vin, mileage)
            `)
            .eq('id', appointmentId)
            .eq('organization_id', organizationId)
            .single()

          if (error || !appointment) {
            console.error('Error cargando cita:', error)
            return
          }

          // Pre-llenar datos del cliente
          const appointmentData = appointment as any
          if (appointmentData.customer) {
            setFormData(prev => ({
              ...prev,
              customerName: appointmentData.customer.name || '',
              customerPhone: appointmentData.customer.phone || '',
              customerEmail: appointmentData.customer.email || ''
            }))
          }

          // Pre-llenar datos del vehículo
          if (appointmentData.vehicle) {
            const vehicle = appointmentData.vehicle
            setFormData(prev => ({
              ...prev,
              vehicleBrand: vehicle.brand || '',
              vehicleModel: vehicle.model || '',
              vehicleYear: vehicle.year?.toString() || '',
              vehiclePlate: vehicle.license_plate || '',
              vehicleColor: vehicle.color || '',
              vehicleVin: vehicle.vin || '',
              vehicleMileage: vehicle.mileage?.toString() || ''
            }))
          }

          // Pre-llenar descripción con el tipo de servicio de la cita
          if (appointmentData.service_type) {
            setFormData(prev => ({
              ...prev,
              description: `Servicio: ${appointmentData.service_type}${appointmentData.notes ? ` - ${appointmentData.notes}` : ''}`
            }))
          }

          console.log('✅ Datos de cita cargados y pre-llenados')
        } catch (error) {
          console.error('Error cargando datos de cita:', error)
        }
      }

      loadAppointmentData()
    }
  }, [open, appointmentId, organizationId, supabase])

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

  }, [open, prefilledServiceType])

  useEffect(() => {

    if (!open) {

      setFormData(INITIAL_FORM_DATA)
      
      setShowCustomerDropdown(false)

    }

  }, [open])
  
  // Filtrar clientes cuando el usuario escribe
  useEffect(() => {
    console.log('🔍 [Dropdown] Filtrando clientes:', {
      customerNameLength: formData.customerName.length,
      totalCustomers: customers.length,
      customerName: formData.customerName
    });
    
    if (formData.customerName.length > 0) {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(formData.customerName.toLowerCase())
      )
      console.log('✅ [Dropdown] Clientes filtrados:', filtered.length);
      setFilteredCustomers(filtered)
    } else {
      // Si está vacío, mostrar todos los clientes
      console.log('📋 [Dropdown] Mostrando todos los clientes:', customers.length);
      setFilteredCustomers(customers)
    }
  }, [formData.customerName, customers])

  const handleBlur = (field: string) => {

    setTouched(prev => ({ ...prev, [field]: true }))

  }

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    

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

    

    if (Object.keys(newErrors).length > 0) {

      toast.error('Por favor corrige los errores en el formulario')

      return

    }

    

    if (!user || !profile) {

      toast.error('Error', {

        description: 'No hay sesión activa. Por favor recarga la página.'

      })

      return

    }

    setLoading(true)

    try {

      const workshopId = profile.workshop_id

      if (!workshopId) {

        throw new Error('No se encontró workshop_id en el perfil')

      }

      // ✅ Usar organizationId del context o prop
      if (!organizationId) {
        throw new Error('No se pudo obtener organization_id');
      }
      
      console.log('🔍 [CreateWorkOrderModal] organizationId:', organizationId);
      console.log('🔍 [CreateWorkOrderModal] workshopId:', workshopId);

      const { data: existingCustomer } = await supabase

        .from('customers')

        .select('*')

        .eq('phone', formData.customerPhone)

        .eq('workshop_id', workshopId)

        .maybeSingle()

      let customerId = (existingCustomer as any)?.id

      if (!customerId) {

        const { data: newCustomer, error: customerError } = await supabase

          .from('customers')

          .insert({

            organization_id: organizationId,

            workshop_id: workshopId,

            name: formData.customerName,

            phone: formData.customerPhone,

            email: formData.customerEmail || null

          } as any)

          .select()

          .single()

        if (customerError) throw customerError

        if (!newCustomer) throw new Error('No se pudo crear el cliente')

        customerId = (newCustomer as any).id

      }

      const { data: existingVehicle } = await supabase

        .from('vehicles')

        .select('id')

        .eq('license_plate', formData.vehiclePlate.toUpperCase())

        .eq('workshop_id', workshopId)

        .maybeSingle()

      let vehicleId = (existingVehicle as any)?.id

      if (!vehicleId) {

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

          } as any)

          .select()

          .single()

        if (vehicleError) throw vehicleError

        if (!newVehicle) throw new Error('No se pudo crear el vehículo')

        vehicleId = (newVehicle as any).id

      }

      const orderData = {

        organization_id: organizationId,

        workshop_id: workshopId,

        customer_id: customerId,

        vehicle_id: vehicleId,

        description: formData.description?.trim() || 'Sin descripción',

        estimated_cost: parseFloat(formData.estimated_cost) || 0,

        status: 'reception',  // ✅ Primera etapa del proceso

        entry_date: new Date().toISOString(),

        assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' 

          ? formData.assigned_to 

          : null

      }

      console.log('📝 [CreateWorkOrderModal] Datos de orden a insertar:', {
        organization_id: orderData.organization_id,
        workshop_id: orderData.workshop_id,
        customer_id: orderData.customer_id,
        vehicle_id: orderData.vehicle_id,
        status: orderData.status,
        description: orderData.description?.substring(0, 50) + '...',
        estimated_cost: orderData.estimated_cost
      });

      const { data: newOrder, error: orderError } = await supabase

        .from('work_orders')

        .insert(orderData as any)

        .select()

        .single()

      if (orderError) {
        console.error('❌ [CreateWorkOrderModal] Error de Supabase al crear orden:', orderError);
        console.error('❌ [CreateWorkOrderModal] Detalles del error:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        });
        throw new Error(`Error creando orden: ${orderError.message}`)
      }

      if (!newOrder) {
        console.error('❌ [CreateWorkOrderModal] newOrder es null o undefined');
        throw new Error('No se pudo crear la orden')
      }
      
      console.log('✅ [CreateWorkOrderModal] Orden creada en DB:', {
        id: (newOrder as any).id,
        status: (newOrder as any).status,
        organization_id: (newOrder as any).organization_id,
        workshop_id: (newOrder as any).workshop_id,
        customer_id: (newOrder as any).customer_id,
        vehicle_id: (newOrder as any).vehicle_id
      });

      console.log('✅ [CreateWorkOrderModal] Orden creada exitosamente:', {
        id: (newOrder as any).id,
        status: (newOrder as any).status,
        customer: formData.customerName,
        vehicle: `${formData.vehicleBrand} ${formData.vehicleModel}`
      });

      // ✅ NUEVO: Guardar inspección

      const { error: inspectionError } = await supabase

        .from('vehicle_inspections')

        .insert({

          order_id: (newOrder as any).id,

          organization_id: organizationId,

          workshop_id: workshopId,

          fluids_check: formData.fluids,

          fuel_level: formData.fuel_level,

          valuable_items: formData.valuable_items || null,

          will_diagnose: formData.will_diagnose,

          entry_reason: formData.entry_reason || null,

          procedures: formData.procedures || null,

          is_warranty: formData.is_warranty,

          authorize_test_drive: formData.authorize_test_drive,

        } as any)

      if (inspectionError) {

        console.warn('⚠️ [CreateWorkOrderModal] Advertencia: No se pudo guardar la inspección', inspectionError)

      } else {
        console.log('✅ [CreateWorkOrderModal] Inspección guardada correctamente');
      }

      toast.success('Orden creada exitosamente', {

        description: `${formData.vehicleBrand} ${formData.vehicleModel} - ${formData.customerName}`

      })

      

      onOpenChange(false)

      resetForm()

      console.log('✅ [CreateWorkOrderModal] Orden creada, llamando onSuccess...');
      console.log('✅ [CreateWorkOrderModal] Orden ID:', (newOrder as any).id);
      console.log('✅ [CreateWorkOrderModal] Orden Status:', (newOrder as any).status);
      
      // Llamar onSuccess después de un pequeño delay para asegurar que la DB esté actualizada
      console.log('⏳ [CreateWorkOrderModal] Esperando 500ms antes de llamar onSuccess...');
      setTimeout(() => {
        console.log('✅ [CreateWorkOrderModal] Ejecutando onSuccess después de delay...');
        console.log('✅ [CreateWorkOrderModal] onSuccess existe?', !!onSuccess);
        if (onSuccess) {
          onSuccess();
          console.log('✅ [CreateWorkOrderModal] onSuccess ejecutado');
        } else {
          console.warn('⚠️ [CreateWorkOrderModal] onSuccess no está definido');
        }
      }, 500);

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

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">

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

              <div className="relative">

                <Label htmlFor="customer_name">Nombre *</Label>

                <div className="relative">

                  <Input

                    id="customer_name"

                    name="customerName"

                    required

                    value={formData.customerName}

                    onChange={(e) => {
                      handleChange(e);
                      // Mostrar dropdown automáticamente al escribir
                      if (customers.length > 0) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    
                    onBlur={() => {
                      // Cerrar dropdown después de un pequeño delay para permitir clics
                      setTimeout(() => {
                        setShowCustomerDropdown(false)
                      }, 200)
                    }}

                    placeholder="Escribe o selecciona un cliente"

                    disabled={loading}

                    className={`pr-10 ${errors.customerName ? 'border-red-500' : ''}`}

                    autoComplete="off"

                  />

                  {/* Botón de dropdown con flechita */}
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🔘 [Dropdown] Clic en flecha:', {
                        customersLength: customers.length,
                        currentState: showCustomerDropdown
                      });
                      if (customers.length > 0) {
                        setShowCustomerDropdown(!showCustomerDropdown)
                      } else {
                        console.warn('⚠️ [Dropdown] No hay clientes cargados');
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition-colors"
                    disabled={loading}
                  >
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                  </button>

                </div>

                {/* Dropdown de sugerencias estilo Sonner */}
                {showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.slice(0, 5).map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            console.log('✅ [Dropdown] Cliente seleccionado:', customer.name);
                            setFormData(prev => ({
                              ...prev,
                              customerName: customer.name,
                              customerPhone: customer.phone || '',
                              customerEmail: customer.email || '',
                              customerAddress: customer.address || ''
                            }));
                            // Limpiar error de validación al seleccionar
                            setErrors(prev => ({ ...prev, customerName: '' }));
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center gap-3 border-b border-gray-800 last:border-0"
                        >
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{customer.name}</p>
                            <p className="text-xs text-gray-400 truncate">{customer.phone}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-gray-400 text-sm">
                        {customers.length === 0 ? (
                          <p>No hay clientes registrados</p>
                        ) : (
                          <p>No se encontraron coincidencias</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

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

                />

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

          {/* ========== ✅ NUEVO: INSPECCIÓN DEL VEHÍCULO ========== */}

          <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">

            <h3 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">

              <Clipboard className="h-4 w-4" />

              Inspección del Vehículo

            </h3>

            {/* Nivel de combustible */}

            <div>

              <Label className="flex items-center gap-2 mb-2">

                <Fuel className="h-4 w-4 text-yellow-500" />

                Nivel de combustible

              </Label>

              <div className="flex gap-2">

                {[

                  { value: 'empty', label: 'Vacío', color: 'bg-red-500' },

                  { value: 'quarter', label: '1/4', color: 'bg-orange-500' },

                  { value: 'half', label: '1/2', color: 'bg-yellow-500' },

                  { value: 'three_quarters', label: '3/4', color: 'bg-lime-500' },

                  { value: 'full', label: 'Lleno', color: 'bg-green-500' },

                ].map((level) => (

                  <button

                    key={level.value}

                    type="button"

                    onClick={() => setFormData({ ...formData, fuel_level: level.value })}

                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${

                      formData.fuel_level === level.value

                        ? `${level.color} text-white shadow-lg`

                        : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-slate-600'

                    }`}

                  >

                    {level.label}

                  </button>

                ))}

              </div>

            </div>

            {/* Checklist de fluidos */}

            <div>

              <Label className="flex items-center gap-2 mb-3">

                <Droplet className="h-4 w-4 text-blue-500" />

                Fluidos verificados

              </Label>

              <div className="grid grid-cols-2 gap-2">

                {[

                  { key: 'aceite_motor', label: 'Aceite de motor' },

                  { key: 'aceite_transmision', label: 'Aceite de transmisión' },

                  { key: 'liquido_frenos', label: 'Líquido de frenos' },

                  { key: 'liquido_embrague', label: 'Líquido de embrague' },

                  { key: 'refrigerante', label: 'Refrigerante' },

                  { key: 'aceite_hidraulico', label: 'Aceite hidráulico' },

                  { key: 'limpia_parabrisas', label: 'Limpia parabrisas' },

                ].map((fluid) => (

                  <label

                    key={fluid.key}

                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border"

                  >

                    <input

                      type="checkbox"

                      checked={formData.fluids[fluid.key as keyof typeof formData.fluids]}

                      onChange={(e) =>

                        setFormData({

                          ...formData,

                          fluids: { ...formData.fluids, [fluid.key]: e.target.checked },

                        })

                      }

                      className="w-4 h-4 rounded"

                    />

                    <span className="text-sm">{fluid.label}</span>

                  </label>

                ))}

              </div>

            </div>

            {/* Objetos de valor */}

            <div>

              <Label htmlFor="valuable_items">Objetos de valor reportados</Label>

              <Textarea

                id="valuable_items"

                value={formData.valuable_items}

                onChange={(e) => setFormData({ ...formData, valuable_items: e.target.value })}

                rows={2}

                placeholder="Ej: Estéreo, GPS, herramientas en cajuela..."

              />

            </div>

          </div>

          {/* ========== ✅ NUEVO: MOTIVO DE INGRESO ========== */}

          <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">

            <h3 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">

              <Wrench className="h-4 w-4" />

              Motivo de Ingreso

            </h3>

            {/* Toggles */}

            <div className="grid grid-cols-3 gap-3">

              <label className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border">

                <span className="text-sm">¿Diagnóstico?</span>

                <input

                  type="checkbox"

                  checked={formData.will_diagnose}

                  onChange={(e) => setFormData({ ...formData, will_diagnose: e.target.checked })}

                  className="w-4 h-4 rounded"

                />

              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border">

                <span className="text-sm">¿Garantía?</span>

                <input

                  type="checkbox"

                  checked={formData.is_warranty}

                  onChange={(e) => setFormData({ ...formData, is_warranty: e.target.checked })}

                  className="w-4 h-4 rounded"

                />

              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border">

                <span className="text-sm">¿Prueba de ruta?</span>

                <input

                  type="checkbox"

                  checked={formData.authorize_test_drive}

                  onChange={(e) => setFormData({ ...formData, authorize_test_drive: e.target.checked })}

                  className="w-4 h-4 rounded"

                />

              </label>

            </div>

            {/* Motivo */}

            <div>

              <Label htmlFor="entry_reason">Motivo de ingreso</Label>

              <Textarea

                id="entry_reason"

                value={formData.entry_reason}

                onChange={(e) => setFormData({ ...formData, entry_reason: e.target.value })}

                rows={2}

                placeholder="Ej: Cliente reporta ruido en motor, falla en arranque..."

              />

            </div>

            {/* Procedimientos */}

            <div>

              <Label htmlFor="procedures">Procedimientos a realizar</Label>

              <Textarea

                id="procedures"

                value={formData.procedures}

                onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}

                rows={2}

                placeholder="Ej: Revisión completa de motor, cambio de bujías..."

              />

            </div>

          </div>

          {/* Descripción del Trabajo (ORIGINAL) */}

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

              <Label htmlFor="assigned_to">Asignar Empleado (opcional)</Label>

              <Select

                name="assigned_to"

                value={formData.assigned_to || undefined}

                onValueChange={(value) => {

                  setFormData(prev => ({ ...prev, assigned_to: value }))

                }}

                disabled={loading || loadingSystemUsers || systemUsers.length === 0}

              >

                <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-600 text-white focus-visible:border-primary focus-visible:ring-primary/40">

                  <SelectValue 

                    placeholder={

                      loadingSystemUsers 

                        ? "Cargando empleados..." 

                        : systemUsers.length === 0 

                          ? "No hay empleados disponibles" 

                          : "Sin asignar"

                    } 

                  />

                </SelectTrigger>

                <SelectContent className="z-[9999] bg-slate-900 text-white border border-slate-600 shadow-2xl" sideOffset={4} position="popper">

                  {systemUsers.length > 0 ? (

                    systemUsers

                      .filter(u => u.id && u.id.trim() !== '')

                      .map((user) => {

                        const roleLabels: Record<string, string> = {
                          'admin': 'Administrador',
                          'manager': 'Gerente',
                          'employee': 'Empleado',
                          'viewer': 'Visualizador'
                        }

                        return (

                          <SelectItem key={user.id} value={user.id} className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">

                            <div className="flex items-center gap-2">

                              <User className="h-4 w-4" />

                              {user.first_name} {user.last_name} ({roleLabels[user.role] || user.role})

                            </div>

                          </SelectItem>

                        )

                      })

                  ) : (

                    <div className="px-2 py-1.5 text-sm text-muted-foreground">

                      No hay empleados disponibles

                    </div>

                  )}

                </SelectContent>

              </Select>

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
