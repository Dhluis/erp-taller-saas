"use client"

import { useState, useEffect } from "react"
import { toast } from 'sonner'
import { useOrganization } from '@/lib/context/SessionContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Car,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wrench
} from "lucide-react"
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal'
// ✅ Removido: getAppointmentStats - ahora se usa API route
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  searchAppointments,
  subscribeToAppointments,
  type AppointmentStats,
  type CreateAppointment,
  type UpdateAppointment
} from "@/lib/supabase/appointments"
import type { Appointment as BaseAppointment } from "@/types/supabase-simple"

// Tipo extendido para el componente (incluye datos relacionados o calculados)
interface Appointment extends BaseAppointment {
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  vehicle_info?: string
  appointment_time?: string
  estimated_duration?: number
  customer?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  vehicle?: {
    id: string
    brand: string
    model: string
    license_plate?: string
  }
}

// Tipo para el formulario local (diferente al CreateAppointment)
interface CreateAppointmentData {
  customer_name: string
  customer_phone: string
  customer_email?: string
  vehicle_info: string
  vehicle_brand: string
  vehicle_model: string
  vehicle_plate: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  estimated_duration: number
}

export default function CitasPage() {
  // ✅ Obtener organizationId y workshopId directamente del contexto (más confiable)
  const { organizationId, workshopId, loading: orgLoading } = useOrganization()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false)
  const [selectedAppointmentForOrder, setSelectedAppointmentForOrder] = useState<Appointment | null>(null)
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    scheduled: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  })

  // Form data
  const emptyForm: CreateAppointmentData = {
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_info: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_plate: '',
    service_type: '',
    appointment_date: '',
    appointment_time: '',
    status: 'scheduled',
    notes: '',
    estimated_duration: 60
  }
  const [formData, setFormData] = useState<CreateAppointmentData>(emptyForm)

  // Monitorear cuando organizationId y workshopId cargan
  useEffect(() => {
    console.log('🔄 [Citas] Organization actualizada:', {
      organizationId,
      workshopId,
      hasOrganization: !!organizationId,
      hasWorkshop: !!workshopId
    })
  }, [organizationId, workshopId])

  // Cargar datos al montar el componente y cuando cambie organizationId
  useEffect(() => {
    if (!organizationId || orgLoading) {
      return
    }
    
    loadData()

    // Suscribirse a cambios en tiempo real
    const subscription = subscribeToAppointments((payload) => {
      console.log('Appointment change:', payload)
      loadData()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [organizationId, orgLoading])

  // Filtrar citas cuando cambie el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase()
      const filtered = appointments.filter(appointment =>
        (appointment.customer?.name || appointment.customer_name || '').toLowerCase().includes(query) ||
        (appointment.customer?.phone || appointment.customer_phone || '').toLowerCase().includes(query) ||
        (appointment.vehicle?.brand || '').toLowerCase().includes(query) ||
        (appointment.vehicle?.model || '').toLowerCase().includes(query) ||
        (appointment.vehicle?.license_plate || '').toLowerCase().includes(query) ||
        (appointment.vehicle_info || '').toLowerCase().includes(query) ||
        (appointment.service_type || '').toLowerCase().includes(query)
      )
      setFilteredAppointments(filtered)
    } else {
      setFilteredAppointments(appointments)
    }
  }, [searchTerm, appointments])

  const loadData = async () => {
    if (!organizationId) {
      console.log('⚠️ Esperando organizationId...')
      return
    }
    
    setIsLoading(true)
    try {
      // ✅ Usar API route en lugar de queries directas desde el cliente
      const response = await fetch('/api/appointments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error loading appointments:', errorData)
        throw new Error(errorData.error || 'Error al cargar citas')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar citas')
      }

      const appointmentsData = result.data || []
      
      // ✅ Usar API route para estadísticas en lugar de query directa
      const statsResponse = await fetch('/api/appointments/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      let statsData = {
        total: 0,
        scheduled: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      };

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success && statsResult.data) {
          statsData = statsResult.data;
        }
      }

      setAppointments(appointmentsData)
      setFilteredAppointments(appointmentsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar citas', {
        description: 'No se pudieron cargar las citas'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      scheduled: { label: 'Programada', variant: 'secondary' as const, color: 'text-blue-600' },
      confirmed: { label: 'Confirmada', variant: 'default' as const, color: 'text-green-600' },
      completed: { label: 'Completada', variant: 'default' as const, color: 'text-green-600' },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, color: 'text-red-600' }
    }
    const config = statusConfig[status]
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-500" />
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const handleEdit = (appointment: Appointment) => {
    console.log('📝 [handleEdit] Editando cita:', appointment)
    setEditingAppointment(appointment)
    
    // Obtener nombre del cliente (puede venir de customer.name o customer_name)
    const customerName = appointment.customer?.name || appointment.customer_name || ''
    const customerPhone = appointment.customer?.phone || appointment.customer_phone || ''
    const customerEmail = appointment.customer?.email || appointment.customer_email || ''
    
    // Extraer datos del vehículo de la relación (campos separados)
    const vehicleBrand = appointment.vehicle?.brand || ''
    const vehicleModel = appointment.vehicle?.model || ''
    const rawPlate = appointment.vehicle?.license_plate || ''
    // No mostrar placas temporales (TEMP-XXXXXX) al usuario
    const vehiclePlate = rawPlate.startsWith('TEMP-') ? '' : rawPlate
    
    // vehicle_info solo como texto legible (no se usa para crear vehículos)
    let vehicleInfo = appointment.vehicle_info || ''
    if (appointment.vehicle && !vehicleInfo) {
      const parts = [appointment.vehicle.brand, appointment.vehicle.model].filter(Boolean)
      if (vehiclePlate) parts.push(vehiclePlate)
      vehicleInfo = parts.join(' ')
    }
    
    setFormData({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      vehicle_info: vehicleInfo,
      vehicle_brand: vehicleBrand === 'Desconocido' ? '' : vehicleBrand,
      vehicle_model: vehicleModel === 'Desconocido' ? '' : vehicleModel,
      vehicle_plate: vehiclePlate,
      service_type: appointment.service_type,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time || '',
      status: (appointment.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled') || 'scheduled',
      notes: appointment.notes || '',
      estimated_duration: appointment.estimated_duration || appointment.duration || 60
    })
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingAppointment(null)
    setFormData(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ VALIDACIÓN MEJORADA CON LOGGING DETALLADO
    console.log('📋 handleSubmit iniciado')
    console.log('📦 organizationId del context:', organizationId)
    console.log('📦 workshopId del context:', workshopId)
    
    // ✅ USAR organizationId del OrganizationContext (más confiable)
    if (!organizationId) {
      console.error('❌ organizationId no disponible del context')
      toast.error('Error al crear cita', {
        description: 'Esperando información de la organización. Por favor intenta de nuevo.'
      })
      return
    }
    
    // ✅ workshopId es opcional según el schema, pero recomendado para mejor organización
    // Si no hay workshopId, podemos continuar (el campo es nullable en customers y vehicles)
    console.log('🔍 IDs disponibles:', { 
      organizationId,  // ✅ Requerido
      workshopId,      // ⚠️ Opcional pero recomendado
    })
    
    console.log('✅ Organization ID validado:', { organizationId, workshopId })
    
    if (!formData.customer_name.trim() || !formData.customer_phone.trim() || !formData.service_type.trim()) {
      toast.error('Campos requeridos', {
        description: 'Por favor completa nombre, teléfono y tipo de servicio'
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      
      // 1. BUSCAR O CREAR CLIENTE
      console.log('🔍 Buscando cliente con teléfono:', formData.customer_phone)
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.customer_phone)
        .eq('organization_id', organizationId)
        .maybeSingle()
      
      let customerId: string
      
      if (existingCustomer) {
        console.log('✅ Cliente encontrado:', existingCustomer.id)
        customerId = existingCustomer.id
      } else {
        console.log('➕ Creando nuevo cliente...')
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            organization_id: organizationId,
            workshop_id: workshopId || null, // ✅ workshop_id es opcional según schema
            name: formData.customer_name,
            phone: formData.customer_phone,
            email: formData.customer_email || null
          } as any)
          .select()
          .single()
        
        if (customerError || !newCustomer) {
          console.error('❌ Error creando cliente:', customerError)
          throw new Error(`Error creando cliente: ${customerError?.message || 'No se pudo crear el cliente'}`)
        }
        
        customerId = newCustomer.id
        console.log('✅ Cliente creado:', customerId)
      }
      
      // 2. BUSCAR O CREAR VEHÍCULO — solo si hay datos reales del vehículo
      let vehicleId: string | null = null
      console.log('🚗 Procesando información del vehículo...')

      const brand = formData.vehicle_brand?.trim() || ''
      const model = formData.vehicle_model?.trim() || ''
      const plate = formData.vehicle_plate?.trim().toUpperCase() || ''
      const hasVehicleData = brand || model || plate

      if (hasVehicleData) {
        // Solo crear/buscar vehículo si el usuario proporcionó datos reales
        if (plate) {
          // Buscar vehículo existente por placa
          const searchResponse = await fetch(`/api/vehicles?search=${encodeURIComponent(plate)}&filter_customer_id=${customerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          })

          if (searchResponse.ok) {
            const searchResult = await searchResponse.json()
            const existingVehicles = searchResult.data?.items || []
            const existingVehicle = existingVehicles.find((v: any) => 
              v.license_plate?.toUpperCase() === plate && v.customer_id === customerId
            )
            
            if (existingVehicle) {
              vehicleId = existingVehicle.id
              console.log('✅ Vehículo encontrado por placa:', vehicleId)
            }
          }
        }

        // Si no encontramos uno existente, crear uno nuevo (solo si hay marca y modelo)
        if (!vehicleId && brand && model) {
          const createResponse = await fetch('/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: customerId,
              workshop_id: workshopId || null,
              brand,
              model,
              license_plate: plate || null,
              year: null
            }),
          })

          if (createResponse.ok) {
            const createResult = await createResponse.json()
            if (createResult.success && createResult.data) {
              vehicleId = createResult.data.id
              console.log('✅ Vehículo creado:', vehicleId)
            }
          }

          if (!vehicleId) {
            console.warn('⚠️ No se pudo crear el vehículo, se creará la cita sin vehículo')
          }
        } else if (!vehicleId) {
          console.log('ℹ️ Se necesitan marca y modelo para crear el vehículo, la cita se creará sin vehículo')
        }
      } else {
        console.log('ℹ️ No se proporcionaron datos de vehículo, la cita se creará sin vehículo')
      }
      
      // 3. CREAR LA CITA
      // Combinar fecha y hora en un solo timestamp ISO
      // Asegurar que appointment_time tenga formato correcto
      let appointmentTime = formData.appointment_time || '09:00'
      if (!appointmentTime.includes(':')) {
        // Si solo viene la hora sin minutos, agregar :00
        appointmentTime = `${appointmentTime}:00`
      }
      if (appointmentTime.split(':').length === 2) {
        // Asegurar que tenga segundos
        appointmentTime = `${appointmentTime}:00`
      }
      
      const appointmentDateTime = `${formData.appointment_date}T${appointmentTime}`
      
      console.log('📅 Creando cita con datos:', {
        customer_id: customerId,
        vehicle_id: vehicleId,
        organization_id: organizationId,
        appointment_date: appointmentDateTime,
        service_type: formData.service_type,
        duration: formData.estimated_duration,
        notes: formData.notes
      })
      
      // Validar campos requeridos (vehicle_id es opcional)
      if (!customerId || !organizationId || !formData.service_type || !appointmentDateTime) {
        console.error('❌ Campos faltantes:', {
          customer_id: !!customerId,
          organization_id: !!organizationId,
          service_type: !!formData.service_type,
          appointment_date: !!appointmentDateTime
        })
        throw new Error('Faltan campos requeridos para crear la cita')
      }
      
      const appointmentData: Record<string, any> = {
        customer_id: customerId,
        service_type: formData.service_type,
        appointment_date: appointmentDateTime,
        duration: formData.estimated_duration,
        notes: formData.notes || null,
        organization_id: organizationId,
        status: 'scheduled'
      }
      // Solo incluir vehicle_id si se logró crear/encontrar un vehículo
      if (vehicleId) {
        appointmentData.vehicle_id = vehicleId
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📤 [Citas] Enviando datos de cita a createAppointment:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(JSON.stringify(appointmentData, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      try {
        const result = await createAppointment(appointmentData as any)
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📥 [Citas] Resultado de createAppointment:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(result)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        if (result && result.id) {
          console.log('✅ [Citas] Cita creada exitosamente:', result.id)
          toast.success('¡Cita creada exitosamente!')
          handleClose()
          // Esperar un momento antes de recargar para asegurar que la DB esté actualizada
          setTimeout(async () => {
            console.log('🔄 [Citas] Recargando datos después de crear cita...')
            await loadData()
            console.log('✅ [Citas] Datos recargados')
          }, 500)
        } else {
          console.error('❌ [Citas] createAppointment no devolvió resultado válido:', result)
          console.error('❌ [Citas] Tipo de resultado:', typeof result)
          console.error('❌ [Citas] Resultado completo:', JSON.stringify(result, null, 2))
          throw new Error('No se pudo crear la cita: respuesta inválida del servidor')
        }
      } catch (createError) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ [Citas] Error al llamar createAppointment:')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('Error:', createError)
        console.error('Error message:', createError instanceof Error ? createError.message : String(createError))
        console.error('Error stack:', createError instanceof Error ? createError.stack : 'No stack')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        throw createError // Re-lanzar para que se maneje en el catch externo
      }
      
    } catch (error) {
      console.error('❌ Error completo al crear cita:', error)
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      toast.error('Error al crear cita', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cita?')) return

    try {
      await deleteAppointment(id)
      console.log('Cita eliminada')
      toast.success('Cita eliminada correctamente')
      loadData()
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Error al eliminar cita')
    }
  }

  // Función para obtener los días del calendario
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay() // 0 = domingo, 6 = sábado
    
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    // Días del mes anterior para completar la primera semana
    const prevMonth = new Date(year, month, 0)
    const daysInPrevMonth = prevMonth.getDate()
    
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = []
    
    // Agregar días del mes anterior
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(year, month - 1, day)
      days.push({ day, isCurrentMonth: false, date })
    }
    
    // Agregar días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({ day: i, isCurrentMonth: true, date })
    }
    
    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length // 6 semanas * 7 días = 42
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ day: i, isCurrentMonth: false, date })
    }
    
    return days
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs currentPage="Gestión de Citas" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Citas</h1>
          <p className="text-muted-foreground">
            Programa y gestiona las citas de tus clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingAppointment(null)
                setFormData(emptyForm)
              }}
              disabled={!organizationId || orgLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
              </DialogTitle>
              <DialogDescription>
                {editingAppointment 
                  ? 'Modifica la información de la cita' 
                  : 'Programa una nueva cita para un cliente'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Nombre del Cliente *</Label>
                  <Input 
                    id="customer_name" 
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Teléfono *</Label>
                  <Input 
                    id="customer_phone" 
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    placeholder="+52 81 1234 5678"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="customer_email">Email</Label>
                <Input 
                  id="customer_email" 
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                  placeholder="cliente@email.com"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="vehicle_brand">Marca</Label>
                  <Input 
                    id="vehicle_brand" 
                    value={formData.vehicle_brand}
                    onChange={(e) => setFormData({...formData, vehicle_brand: e.target.value})}
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle_model">Modelo</Label>
                  <Input 
                    id="vehicle_model" 
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                    placeholder="Corolla 2020"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle_plate">Placa</Label>
                  <Input 
                    id="vehicle_plate" 
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value.toUpperCase()})}
                    placeholder="ABC-123"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="service_type">Tipo de Servicio *</Label>
                <Input 
                  id="service_type" 
                  value={formData.service_type}
                  onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                  placeholder="Cambio de aceite, Revisión general, etc."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="appointment_date">Fecha *</Label>
                  <Input 
                    id="appointment_date" 
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="appointment_time">Hora *</Label>
                  <Input 
                    id="appointment_time" 
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_duration">Duración (min)</Label>
                  <Input 
                    id="estimated_duration" 
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({...formData, estimated_duration: parseInt(e.target.value) || 60})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas adicionales sobre la cita"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.customer_name.trim() || !formData.customer_phone.trim() || !formData.service_type.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAppointment ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar citas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          Filtros
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Citas Hoy</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.today}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Programadas</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.scheduled}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Completadas</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.completed}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Confirmadas</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.confirmed}</p>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Cargando citas...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No se encontraron citas con ese criterio' : 'No hay citas programadas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {appointment.customer?.name || appointment.customer_name || 'Sin nombre'}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {appointment.customer?.phone || appointment.customer_phone || 'Sin teléfono'}
                    </div>
                    {(appointment.customer?.email || appointment.customer_email) && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {appointment.customer?.email || appointment.customer_email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {appointment.vehicle 
                        ? `${appointment.vehicle.brand} ${appointment.vehicle.model}` 
                        : appointment.vehicle_info || 'Sin vehículo'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{appointment.service_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.estimated_duration} min
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {new Date(appointment.appointment_date).toLocaleDateString('es-MX')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.appointment_time}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(appointment.status)}
                    {getStatusBadge(appointment.status)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedAppointmentForOrder(appointment)
                        setIsCreateOrderModalOpen(true)
                      }}
                      className="h-8 w-8 p-0"
                      title="Crear orden desde esta cita"
                    >
                      <Wrench className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(appointment)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(appointment.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Calendario de Citas */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Calendario de Citas</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date()
                setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              }}
            >
              Hoy
            </Button>
            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita!
            </Button>
          </div>
        </div>

        {/* Navegación y Selector de Vista */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevMonth = new Date(currentMonth)
                prevMonth.setMonth(prevMonth.getMonth() - 1)
                setCurrentMonth(prevMonth)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center">
              {currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextMonth = new Date(currentMonth)
                nextMonth.setMonth(nextMonth.getMonth() + 1)
                setCurrentMonth(nextMonth)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Día
            </Button>
          </div>
        </div>

        {/* Grid del Calendario */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {/* Días de la semana */}
            {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Celdas del calendario */}
            {getCalendarDays().map(({ day, isCurrentMonth, date }, index) => {
              const dayAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.appointment_date)
                return aptDate.toDateString() === date.toDateString()
              })
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border rounded ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? '' : 'text-muted-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="text-xs p-1 rounded bg-green-500/20 text-green-700 dark:text-green-400 flex items-center gap-1 cursor-pointer hover:bg-green-500/30"
                        onClick={() => handleEdit(apt)}
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="truncate">
                          {apt.appointment_time} {apt.service_type}
                        </span>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal para crear orden desde cita */}
      <CreateWorkOrderModal
        open={isCreateOrderModalOpen}
        onOpenChange={(open) => {
          setIsCreateOrderModalOpen(open)
          if (!open) {
            setSelectedAppointmentForOrder(null)
          }
        }}
        onSuccess={() => {
          setIsCreateOrderModalOpen(false)
          setSelectedAppointmentForOrder(null)
          toast.success('Orden creada desde la cita')
        }}
        appointmentId={selectedAppointmentForOrder?.id || null}
        organizationId={organizationId}
      />
    </div>
  )
}
