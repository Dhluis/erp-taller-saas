"use client"

import { useState, useEffect } from "react"
import { useAuth } from '@/contexts/AuthContext'
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
  Loader2
} from "lucide-react"
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentStats,
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
}

// Tipo para el formulario local (diferente al CreateAppointment)
interface CreateAppointmentData {
  customer_name: string
  customer_phone: string
  customer_email?: string
  vehicle_info: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  estimated_duration: number
}

export default function CitasPage() {
  // Obtener organization del contexto (los IDs se extraen en handleSubmit)
  const { organization } = useAuth()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const [formData, setFormData] = useState<CreateAppointmentData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_info: '',
    service_type: '',
    appointment_date: '',
    appointment_time: '',
    status: 'scheduled',
    notes: '',
    estimated_duration: 60
  })

  // Monitorear cuando organization carga
  useEffect(() => {
    console.log('🔄 [Citas] Organization actualizada:', {
      exists: !!organization,
      organization_id: organization?.organization_id,
      workshop_id: organization?.id,  // ✅ CORRECCIÓN: es 'id', no 'workshop_id'
      workshop_name: organization?.name
    })
  }, [organization])

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData()

    // Suscribirse a cambios en tiempo real
    const subscription = subscribeToAppointments((payload) => {
      console.log('Appointment change:', payload)
      loadData()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Filtrar citas cuando cambie el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = appointments.filter(appointment =>
        (appointment.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appointment.vehicle_info || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appointment.service_type || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredAppointments(filtered)
    } else {
      setFilteredAppointments(appointments)
    }
  }, [searchTerm, appointments])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [appointmentsData, statsData] = await Promise.all([
        getAppointments(),
        getAppointmentStats()
      ])

      setAppointments(appointmentsData)
      setFilteredAppointments(appointmentsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
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
    setEditingAppointment(appointment)
    setFormData({
      customer_name: appointment.customer_name || '',
      customer_phone: appointment.customer_phone || '',
      customer_email: appointment.customer_email || '',
      vehicle_info: appointment.vehicle_info || '',
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
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      vehicle_info: '',
      service_type: '',
      appointment_date: '',
      appointment_time: '',
      status: 'scheduled',
      notes: '',
      estimated_duration: 60
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ VALIDACIÓN MEJORADA CON LOGGING DETALLADO
    console.log('📋 handleSubmit iniciado')
    console.log('📦 organization completo:', organization)
    
    if (!organization) {
      console.error('❌ Organization no disponible:', organization)
      alert('Error: Esperando información de la organización. Por favor intenta de nuevo.')
      return
    }
    
    const organizationId = organization.organization_id
    const workshopId = organization.id  // ✅ CORRECCIÓN: es 'id', no 'workshop_id'
    
    console.log('🔍 Extrayendo IDs:', { 
      organizationId, 
      workshopId,
      organization_id_exists: !!organization.organization_id,
      workshop_id_exists: !!organization.id 
    })
    
    if (!organizationId || !workshopId) {
      console.error('❌ IDs faltantes:', { 
        organizationId, 
        workshopId,
        organization: organization 
      })
      alert('Error: No se pudo obtener la información de la organización')
      return
    }
    
    console.log('✅ Organization IDs validados:', { organizationId, workshopId })
    
    if (!formData.customer_name.trim() || !formData.customer_phone.trim() || 
        !formData.vehicle_info.trim() || !formData.service_type.trim()) {
      alert('Por favor completa todos los campos requeridos')
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
            workshop_id: workshopId,
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
      
      // 2. BUSCAR O CREAR VEHÍCULO (SIEMPRE CREAR UNO)
      let vehicleId: string
      console.log('🚗 Procesando información del vehículo...')

      const vehicleInfo = formData.vehicle_info?.trim() || 'Vehículo sin especificar'
      const vehicleParts = vehicleInfo.split('-')
      const vehicleData = vehicleParts[0]?.trim() || vehicleInfo
      const licensePlate = vehicleParts[1]?.trim() || ''

      if (licensePlate) {
        // BUSCAR POR PLACA
        const { data: existingVehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('license_plate', licensePlate.toUpperCase())
          .eq('workshop_id', workshopId)
          .maybeSingle()
        
        if (existingVehicle) {
          vehicleId = existingVehicle.id
          console.log('✅ Vehículo encontrado por placa:', vehicleId)
        } else {
          // CREAR CON PLACA
          const vehicleWords = vehicleData.split(' ')
          const brand = vehicleWords[0] || 'Desconocido'
          const model = vehicleWords.slice(1).join(' ') || 'Desconocido'
          
          const { data: newVehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert({
              customer_id: customerId,
              workshop_id: workshopId,
              brand: brand,
              model: model,
              license_plate: licensePlate.toUpperCase(),
              year: null
            } as any)
            .select()
            .single()
          
          if (vehicleError || !newVehicle) {
            throw new Error(`Error creando vehículo: ${vehicleError?.message || 'No se pudo crear el vehículo'}`)
          }
          
          vehicleId = newVehicle.id
          console.log('✅ Vehículo creado con placa:', vehicleId)
        }
      } else {
        // NO HAY PLACA - CREAR VEHÍCULO GENÉRICO
        console.log('⚠️ No hay placa, creando vehículo genérico...')
        
        const vehicleWords = vehicleData.split(' ')
        const brand = vehicleWords[0] || 'Desconocido'
        const model = vehicleWords.slice(1).join(' ') || 'Desconocido'
        
        // Generar placa temporal única
        const tempPlate = `TEMP-${Date.now().toString().slice(-6)}`
        
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            customer_id: customerId,
            workshop_id: workshopId,
            brand: brand,
            model: model,
            license_plate: tempPlate,
            year: null
          } as any)
          .select()
          .single()
        
        if (vehicleError || !newVehicle) {
          throw new Error(`Error creando vehículo: ${vehicleError?.message || 'No se pudo crear el vehículo'}`)
        }
        
        vehicleId = newVehicle.id
        console.log('✅ Vehículo genérico creado:', vehicleId, 'con placa:', tempPlate)
      }
      
      // 3. CREAR LA CITA
      // Combinar fecha y hora en un solo timestamp ISO
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time || '09:00'}:00`
      
      console.log('📅 Creando cita con datos:', {
        customer_id: customerId,
        vehicle_id: vehicleId,
        organization_id: organizationId,
        appointment_date: appointmentDateTime
      })
      
      const appointmentData = {
        customer_id: customerId,
        vehicle_id: vehicleId,
        service_type: formData.service_type,
        appointment_date: appointmentDateTime,
        duration: formData.estimated_duration,
        notes: formData.notes || null,
        organization_id: organizationId
      }
      
      const result = await createAppointment(appointmentData)
      
      if (result) {
        console.log('✅ Cita creada exitosamente:', result.id)
        alert('¡Cita creada exitosamente!')
        handleClose()
        await loadData()
      } else {
        throw new Error('No se pudo crear la cita')
      }
      
    } catch (error) {
      console.error('❌ Error completo:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cita?')) return

    try {
      await deleteAppointment(id)
      console.log('Cita eliminada')
      loadData()
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
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
                setFormData({
                  customer_name: '',
                  customer_phone: '',
                  customer_email: '',
                  vehicle_info: '',
                  service_type: '',
                  appointment_date: '',
                  appointment_time: '',
                  status: 'scheduled',
                  notes: '',
                  estimated_duration: 60
                })
              }}
              disabled={!organization}
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
              
              <div>
                <Label htmlFor="vehicle_info">Información del Vehículo *</Label>
                <Input 
                  id="vehicle_info" 
                  value={formData.vehicle_info}
                  onChange={(e) => setFormData({...formData, vehicle_info: e.target.value})}
                  placeholder="Toyota Corolla 2020 - ABC123"
                />
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
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.customer_name.trim() || !formData.customer_phone.trim() || !formData.vehicle_info.trim() || !formData.service_type.trim()}>
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
                    <div className="font-medium">{appointment.customer_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {appointment.customer_phone}
                    </div>
                    {appointment.customer_email && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {appointment.customer_email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{appointment.vehicle_info}</span>
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
    </div>
  )
}
