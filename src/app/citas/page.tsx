"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from 'sonner'
import { useOrganization } from '@/lib/context/SessionContext'
import { usePermissions } from '@/hooks/usePermissions'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
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
  Wrench,
  Brain
} from "lucide-react"
import { VoiceInput } from "@/components/ui/VoiceInput"
import { cn } from "@/lib/utils"

import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal'
import { sanitize, INPUT_LIMITS } from '@/lib/utils/input-sanitizers'
import {
  subscribeToAppointments,
  type AppointmentStats,
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
    year?: number
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
  vehicle_year: string
  vehicle_plate: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
  estimated_duration: number
}

import { Suspense } from "react"
// ... imports
export default function CitasPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    }>
      <CitasContent />
    </Suspense>
  );
}

function CitasContent() {
  // ✅ Obtener organizationId y workshopId directamente del contexto (más confiable)
  const { organizationId, workshopId, loading: orgLoading } = useOrganization()
  const permissions = usePermissions()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterTab, setFilterTab] = useState<'upcoming' | 'history' | 'all'>('upcoming')
  const searchParams = useSearchParams()
  const processedRef = useRef(false);

  // Efecto para capturar datos de Eagles AI de la URL
  useEffect(() => {
    if (processedRef.current) return;

    const openMagicCreate = searchParams.get('openMagicCreate');
    if (openMagicCreate === 'true') {
      try {
        console.log('🔍 [Citas] Buscando datos de AI en URL/Storage...');
        let aiDataRaw = sessionStorage.getItem('eagles_ai_pending_data');
        if (!aiDataRaw) {
          aiDataRaw = searchParams.get('aiData');
        }

        if (aiDataRaw) {
          const parsedData = JSON.parse(aiDataRaw);
          console.log('✨ [Citas] Datos encontrados:', parsedData);
          
          if (parsedData.action_type === 'appointment' && parsedData.appointment) {
            processedRef.current = true;
            const a = parsedData.appointment;
            
            setFormData({
              customer_name: a.customer?.name || '',
              customer_phone: a.customer?.phone || '',
              customer_email: a.customer?.email || '',
              vehicle_info: a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model}` : '',
              vehicle_brand: a.vehicle?.brand || '',
              vehicle_model: a.vehicle?.model || '',
              vehicle_year: a.vehicle?.year?.toString() || '',
              vehicle_plate: a.vehicle?.plate || '',
              service_type: a.details?.service_type || '',
              appointment_date: a.details?.date || new Date().toISOString().split('T')[0],
              appointment_time: a.details?.time || '10:00',
              status: 'scheduled',
              notes: a.details?.notes || 'Agendado vía Eagles AI',
              estimated_duration: a.details?.duration_minutes || 60
            });

            console.log('🚀 [Citas] Abriendo diálogo de nueva cita...');
            setIsDialogOpen(true);
            toast.success('¡Eagles AI preparó los datos de la cita!');
            
            // Limpiar
            sessionStorage.removeItem('eagles_ai_pending_data');
            const newPath = window.location.pathname;
            window.history.replaceState({}, '', newPath);
          } else {
            console.log('⏭️ [Citas] Datos no corresponden a citas:', parsedData.action_type);
          }
        } else {
          console.log('⚠️ [Citas] No se encontraron datos de AI en el storage');
        }
      } catch (e) {
        console.error('❌ [Citas] Error al procesar datos de AI:', e);
      }
    }
  }, [searchParams]);

  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false)
  const [selectedAppointmentForOrder, setSelectedAppointmentForOrder] = useState<Appointment | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    scheduled: 0,
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
    vehicle_year: '',
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

  // Filtrar citas cuando cambie el término de búsqueda o la pestaña
  useEffect(() => {
    let result = appointments

    // 1. Filtrar por pestaña
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (filterTab === 'upcoming') {
      result = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        const isActive = apt.status === 'scheduled' || apt.status === 'in_progress'
        return aptDate >= today && isActive
      })
    } else if (filterTab === 'history') {
      result = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        const isPast = aptDate < today
        const isFinished = apt.status === 'completed' || apt.status === 'cancelled'
        return isPast || isFinished
      })
    }

    // 2. Filtrar por búsqueda
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase()
      result = result.filter(appointment =>
        (appointment.customer?.name || appointment.customer_name || '').toLowerCase().includes(query) ||
        (appointment.customer?.phone || appointment.customer_phone || '').toLowerCase().includes(query) ||
        (appointment.vehicle?.brand || '').toLowerCase().includes(query) ||
        (appointment.vehicle?.model || '').toLowerCase().includes(query) ||
        (appointment.vehicle?.license_plate || '').toLowerCase().includes(query) ||
        (appointment.vehicle_info || '').toLowerCase().includes(query) ||
        (appointment.service_type || '').toLowerCase().includes(query)
      )
    }
    
    setFilteredAppointments(result)
  }, [searchTerm, appointments, filterTab])

  const handleAppointmentVoiceTranscription = async (text: string) => {
    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'magic-create',
          payload: { text, context: 'appointment' }
        })
      });

      const result = await response.json();
      if (result.success && result.data?.appointment) {
        const apt = result.data.appointment;
        
        setFormData(prev => ({
          ...prev,
          customer_name: apt.customer?.name || prev.customer_name,
          customer_phone: apt.customer?.phone || prev.customer_phone,
          customer_email: apt.customer?.email || prev.customer_email,
          vehicle_brand: apt.vehicle?.brand || prev.vehicle_brand,
          vehicle_model: apt.vehicle?.model || prev.vehicle_model,
          vehicle_year: apt.vehicle?.year?.toString() || prev.vehicle_year,
          vehicle_plate: apt.vehicle?.plate || prev.vehicle_plate,
          service_type: apt.details?.service_type || prev.service_type,
          appointment_date: apt.details?.date || prev.appointment_date,
          appointment_time: apt.details?.time || prev.appointment_time,
          notes: apt.details?.notes || prev.notes,
          estimated_duration: apt.details?.duration_minutes || prev.estimated_duration
        }));
        
        toast.success('¡IA procesó tu reserva con éxito!');
      }
    } catch (error) {
      console.error('Error processing AI voice:', error);
      toast.error('No se pudo procesar el dictado de IA');
    } finally {
      setIsProcessingAI(false);
    }
  };

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
        credentials: 'include',
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      let statsData = stats; // Fallback to current stats if fetch fails

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

  const STATUS_DISPLAY = {
    scheduled: { label: 'Programada', badgeCls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700', iconColor: 'text-yellow-500' },
    completed:  { label: 'Completada', badgeCls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700',   iconColor: 'text-green-500' },
    cancelled:  { label: 'Cancelada',  badgeCls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700',             iconColor: 'text-red-500' },
  } as const

  const getStatusBadge = (status: Appointment['status']) => {
    const cfg = STATUS_DISPLAY[status as keyof typeof STATUS_DISPLAY] ?? { label: status, badgeCls: 'bg-gray-100 text-gray-700' }
    return <Badge className={`${cfg.badgeCls} border font-medium text-xs`}>{cfg.label}</Badge>
  }

  const getStatusIcon = (status: Appointment['status']) => {
    const cfg = STATUS_DISPLAY[status as keyof typeof STATUS_DISPLAY]
    if (!cfg) return null
    const color = cfg.iconColor
    switch (status) {
      case 'scheduled': return <Clock className={`h-4 w-4 ${color}`} />
      case 'completed': return <CheckCircle className={`h-4 w-4 ${color}`} />
      case 'cancelled': return <XCircle className={`h-4 w-4 ${color}`} />
      default: return null
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
    
    // Extraer fecha (yyyy-MM-dd) y hora (HH:mm) del timestamp ISO o campo separado
    let dateOnly = ''
    let timeOnly = appointment.appointment_time || ''
    if (appointment.appointment_date) {
      const raw = appointment.appointment_date
      // Si es un ISO timestamp (contiene 'T'), extraer partes
      if (raw.includes('T')) {
        const dt = new Date(raw)
        if (!isNaN(dt.getTime())) {
          dateOnly = dt.toISOString().split('T')[0]                    // yyyy-MM-dd
          if (!timeOnly) {
            timeOnly = dt.toISOString().split('T')[1].substring(0, 5)  // HH:mm
          }
        } else {
          dateOnly = raw.split('T')[0]
        }
      } else {
        // Ya es solo fecha (yyyy-MM-dd)
        dateOnly = raw.split(' ')[0]
      }
    }

    const vehicleYear = appointment.vehicle?.year ? String(appointment.vehicle.year) : ''

    setFormData({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      vehicle_info: vehicleInfo,
      vehicle_brand: vehicleBrand === 'Desconocido' ? '' : vehicleBrand,
      vehicle_model: vehicleModel === 'Desconocido' ? '' : vehicleModel,
      vehicle_year: vehicleYear,
      vehicle_plate: vehiclePlate,
      service_type: appointment.service_type,
      appointment_date: dateOnly,
      appointment_time: timeOnly,
      status: (appointment.status as 'scheduled' | 'completed' | 'cancelled') || 'scheduled',
      notes: appointment.notes || '',
      estimated_duration: appointment.estimated_duration || appointment.duration || 60
    })
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingAppointment(null)
    setFormData(emptyForm)
    setFormErrors({})
  }

  const validateAppointmentForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.customer_name.trim()) {
      errors.customer_name = 'El nombre del cliente es requerido'
    }
    if (!formData.customer_phone.trim()) {
      errors.customer_phone = 'El teléfono es requerido'
    } else if (formData.customer_phone.length < 10) {
      errors.customer_phone = `El teléfono debe tener 10 dígitos (tiene ${formData.customer_phone.length})`
    }
    if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
      errors.customer_email = 'El formato de email no es válido'
    }
    if (!formData.service_type.trim()) {
      errors.service_type = 'El tipo de servicio es requerido'
    }
    if (!formData.appointment_date) {
      errors.appointment_date = 'La fecha es requerida'
    }
    if (!formData.appointment_time) {
      errors.appointment_time = 'La hora es requerida'
    }
    if (formData.vehicle_year) {
      const year = parseInt(formData.vehicle_year)
      if (isNaN(year) || year < INPUT_LIMITS.YEAR_MIN || year > INPUT_LIMITS.YEAR_MAX) {
        errors.vehicle_year = `El año debe estar entre ${INPUT_LIMITS.YEAR_MIN} y ${INPUT_LIMITS.YEAR_MAX}`
      }
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      const fieldLabels: Record<string, string> = {
        customer_name: 'Nombre del cliente',
        customer_phone: 'Teléfono',
        customer_email: 'Email',
        service_type: 'Tipo de servicio',
        appointment_date: 'Fecha',
        appointment_time: 'Hora',
        vehicle_year: 'Año del vehículo',
      }
      const missing = Object.keys(errors).map(k => fieldLabels[k] || k).join(', ')
      toast.error('Campos obligatorios incompletos', { description: missing })
      // Scroll al primer campo con error
      const firstKey = Object.keys(errors)[0]
      setTimeout(() => {
        document.getElementById(firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        document.getElementById(firstKey)?.focus()
      }, 80)
    }
    return Object.keys(errors).length === 0
  }

  const clearFieldError = (field: string) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!organizationId) {
      toast.error('Error al crear cita', {
        description: 'Esperando información de la organización. Por favor intenta de nuevo.'
      })
      return
    }
    
    if (!validateAppointmentForm()) return
    
    setIsSubmitting(true)
    
    try {
      // ✅ El API route resuelve cliente, vehículo y cita en el servidor con service role (no RLS)
      const payload = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        vehicle_brand: formData.vehicle_brand || null,
        vehicle_model: formData.vehicle_model || null,
        vehicle_year: formData.vehicle_year || null,
        vehicle_plate: formData.vehicle_plate || null,
        service_type: formData.service_type,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: formData.notes || null,
        estimated_duration: formData.estimated_duration || 60,
        status: formData.status || 'scheduled',
      }

      if (editingAppointment) {
        // ━━━━ MODO EDICIÓN ━━━━
        console.log('📝 [Citas] Actualizando cita via API:', editingAppointment.id)
        const response = await fetch(`/api/appointments/${editingAppointment.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, status: formData.status || editingAppointment.status }),
        })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || 'Error al actualizar la cita')
        console.log('✅ [Citas] Cita actualizada:', result.data?.id)
        toast.success('Cita actualizada exitosamente')
      } else {
        // ━━━━ MODO CREACIÓN ━━━━
        console.log('➕ [Citas] Creando cita via API...')
        const response = await fetch('/api/appointments', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || 'Error al crear la cita')
        console.log('✅ [Citas] Cita creada:', result.data?.id)
        toast.success('¡Cita creada exitosamente!')
      }

      handleClose()
      await loadData()
      
    } catch (error) {
      console.error('❌ Error al guardar cita:', error)
      toast.error('Error al guardar cita', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsSubmitting(false)
    }
  }



  const handleDelete = (id: string) => {
    setAppointmentToDelete(id)
  }

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return
    try {
      const response = await fetch(`/api/appointments/${appointmentToDelete}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Error al eliminar')
      toast.success('Cita eliminada correctamente')
      setAppointmentToDelete(null)
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 min-w-0 overflow-x-hidden">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs currentPage="Gestión de Citas" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
                setFormErrors({})
              }}
              disabled={!organizationId || orgLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
              </DialogTitle>
              <DialogDescription className="flex items-center justify-between gap-2">
                <span>
                  {editingAppointment
                    ? 'Modifica la información de la cita'
                    : 'Programa una nueva cita para un cliente'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  <span className="text-red-500">*</span> Campos obligatorios
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Banner de errores de validación */}
            {Object.keys(formErrors).length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Completa los campos obligatorios</p>
                  <p className="text-xs text-red-400/80 mt-0.5">
                    {Object.keys(formErrors).map(k => ({
                      customer_name: 'Nombre del cliente',
                      customer_phone: 'Teléfono',
                      customer_email: 'Email',
                      service_type: 'Tipo de servicio',
                      appointment_date: 'Fecha',
                      appointment_time: 'Hora',
                      vehicle_year: 'Año del vehículo',
                    }[k] || k)).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* Asistente de Voz AI */}
            {!editingAppointment && (
              <div className="py-3 px-4 bg-slate-900/40 rounded-lg border border-slate-800 -mx-1">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex items-center gap-3 bg-[#0f172a] border border-pink-500/30 rounded-lg p-2 shadow-xl">
                    <div className="p-1.5 bg-pink-500/10 rounded-lg shrink-0">
                      <Brain className={cn("h-5 w-5 text-pink-500", isProcessingAI && "animate-pulse")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Eagles AI</p>
                        <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                        <p className="text-[10px] text-slate-400 truncate">Dicta fecha, cliente y auto...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isProcessingAI ? (
                        <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                      ) : (
                        <VoiceInput
                          onTranscript={handleAppointmentVoiceTranscription}
                          className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Nombre del Cliente <span className="text-red-500">*</span></Label>
                  <Input 
                    id="customer_name" 
                    value={formData.customer_name}
                    onChange={(e) => { setFormData({...formData, customer_name: e.target.value}); clearFieldError('customer_name') }}
                    placeholder="Juan Pérez"
                    className={formErrors.customer_name ? 'border-red-500' : ''}
                  />
                  {formErrors.customer_name && <p className="text-red-500 text-xs mt-1">{formErrors.customer_name}</p>}
                </div>
                <div>
                  <Label htmlFor="customer_phone">Teléfono <span className="text-red-500">*</span></Label>
                  <Input 
                    id="customer_phone" 
                    type="tel"
                    inputMode="numeric"
                    value={formData.customer_phone}
                    onChange={(e) => { setFormData({...formData, customer_phone: sanitize.phone(e.target.value)}); clearFieldError('customer_phone') }}
                    placeholder="4491234567"
                    maxLength={INPUT_LIMITS.PHONE_MAX}
                    className={formErrors.customer_phone ? 'border-red-500' : ''}
                  />
                  {formErrors.customer_phone && <p className="text-red-500 text-xs mt-1">{formErrors.customer_phone}</p>}
                </div>
              </div>
              
              <div>
                <Label htmlFor="customer_email">Email</Label>
                <Input 
                  id="customer_email" 
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => { setFormData({...formData, customer_email: e.target.value}); clearFieldError('customer_email') }}
                  placeholder="cliente@email.com"
                  className={formErrors.customer_email ? 'border-red-500' : ''}
                />
                {formErrors.customer_email && <p className="text-red-500 text-xs mt-1">{formErrors.customer_email}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="Corolla"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle_year">Año</Label>
                  <Input 
                    id="vehicle_year" 
                    inputMode="numeric"
                    value={formData.vehicle_year}
                    onChange={(e) => { setFormData({...formData, vehicle_year: sanitize.year(e.target.value)}); clearFieldError('vehicle_year') }}
                    placeholder="2020"
                    maxLength={4}
                    className={formErrors.vehicle_year ? 'border-red-500' : ''}
                  />
                  {formErrors.vehicle_year && <p className="text-red-500 text-xs mt-1">{formErrors.vehicle_year}</p>}
                </div>
                <div>
                  <Label htmlFor="vehicle_plate">Placa</Label>
                  <Input 
                    id="vehicle_plate" 
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({...formData, vehicle_plate: sanitize.plate(e.target.value)})}
                    placeholder="ABC-123"
                    maxLength={INPUT_LIMITS.PLATE_MAX}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="service_type">Tipo de Servicio <span className="text-red-500">*</span></Label>
                <Input 
                  id="service_type" 
                  value={formData.service_type}
                  onChange={(e) => { setFormData({...formData, service_type: e.target.value}); clearFieldError('service_type') }}
                  placeholder="Cambio de aceite, Revisión general, etc."
                  className={formErrors.service_type ? 'border-red-500' : ''}
                />
                {formErrors.service_type && <p className="text-red-500 text-xs mt-1">{formErrors.service_type}</p>}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="appointment_date">Fecha <span className="text-red-500">*</span></Label>
                  <Input 
                    id="appointment_date" 
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => { setFormData({...formData, appointment_date: e.target.value}); clearFieldError('appointment_date') }}
                    className={formErrors.appointment_date ? 'border-red-500' : ''}
                  />
                  {formErrors.appointment_date && <p className="text-red-500 text-xs mt-1">{formErrors.appointment_date}</p>}
                </div>
                <div>
                  <Label htmlFor="appointment_time">Hora <span className="text-red-500">*</span></Label>
                  <Input 
                    id="appointment_time" 
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => { setFormData({...formData, appointment_time: e.target.value}); clearFieldError('appointment_time') }}
                    className={formErrors.appointment_time ? 'border-red-500' : ''}
                  />
                  {formErrors.appointment_time && <p className="text-red-500 text-xs mt-1">{formErrors.appointment_time}</p>}
                </div>
                <div>
                  <Label htmlFor="estimated_duration">Duración (min)</Label>
                  <Input 
                    id="estimated_duration" 
                    type="number"
                    inputMode="numeric"
                    value={formData.estimated_duration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      setFormData({...formData, estimated_duration: Math.min(Math.max(val, 0), INPUT_LIMITS.DURATION_MAX)})
                    }}
                    min={INPUT_LIMITS.DURATION_MIN}
                    max={INPUT_LIMITS.DURATION_MAX}
                  />
                </div>
              </div>
              
              {/* Estado de la cita */}
              <div>
                <Label className="mb-1.5 block">Estado de la cita</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'scheduled', label: 'Programada', Icon: Clock,        active: 'border-yellow-500 bg-yellow-500/15 text-yellow-600 dark:text-yellow-400', hover: 'hover:border-yellow-500/50' },
                    { value: 'completed', label: 'Completada', Icon: CheckCircle,  active: 'border-green-500 bg-green-500/15 text-green-600 dark:text-green-400',    hover: 'hover:border-green-500/50' },
                    { value: 'cancelled', label: 'Cancelada',  Icon: XCircle,      active: 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400',             hover: 'hover:border-red-500/50' },
                  ] as const).map(({ value, label, Icon, active, hover }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: value }))}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                        formData.status === value
                          ? active
                          : `border-border text-muted-foreground ${hover}`
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Label htmlFor="notes">Notas</Label>
                <div className="relative">
                  <Textarea 
                    id="notes" 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notas adicionales sobre la cita"
                    className="pr-12"
                    rows={3}
                  />
                  <div className="absolute right-2 top-2">
                    <VoiceInput
                      onTranscript={(text) => setFormData(prev => ({ ...prev, notes: prev.notes ? `${prev.notes} ${text}` : text }))}
                      className="h-8 w-8"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.customer_name.trim() ||
                  !formData.customer_phone.trim() ||
                  !formData.service_type.trim() ||
                  !formData.appointment_date ||
                  !formData.appointment_time
                }
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAppointment ? 'Actualizar' : 'Crear cita'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search, Filters and Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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

        <Tabs 
          defaultValue="upcoming" 
          value={filterTab} 
          onValueChange={(value) => setFilterTab(value as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Próximas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Historial</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <span>Todas</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Citas Hoy</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.today}</p>
        </div>

        <div className="bg-card p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Programadas</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-600 dark:text-yellow-400">{stats.scheduled}</p>
        </div>

        <div className="bg-card p-4 rounded-lg border border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Completadas</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">{stats.completed}</p>
        </div>

        <div className="bg-card p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">Canceladas</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-red-600 dark:text-red-400">{stats.cancelled}</p>
        </div>
      </div>

      {/* Appointments Table - scroll horizontal en mobile */}
      <div className="bg-card rounded-lg border overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Cargando citas...</span>
          </div>
        ) : (
          <Table className="min-w-[600px]">
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
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calendar className="h-8 w-8 opacity-20" />
                      <p>
                        {searchTerm 
                          ? 'No se encontraron citas con ese criterio' 
                          : filterTab === 'upcoming' 
                            ? 'No hay citas próximas programadas' 
                            : filterTab === 'history' 
                              ? 'No hay historial de citas' 
                              : 'No hay citas registradas'}
                      </p>
                    </div>
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
      <div className="bg-card rounded-lg border p-4 md:p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-bold">Calendario de Citas</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Navegación y Selector de Vista - stack en mobile */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={() => {
                const prevMonth = new Date(currentMonth)
                prevMonth.setMonth(prevMonth.getMonth() - 1)
                setCurrentMonth(prevMonth)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base md:text-lg font-semibold min-w-[140px] md:min-w-[200px] text-center">
              {currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={() => {
                const nextMonth = new Date(currentMonth)
                nextMonth.setMonth(nextMonth.getMonth() + 1)
                setCurrentMonth(nextMonth)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              variant={viewMode === 'month' ? 'primary' : 'outline'}
              size="sm"
              className="min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-[70px]"
              onClick={() => setViewMode('month')}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === 'week' ? 'primary' : 'outline'}
              size="sm"
              className="min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-[70px]"
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === 'day' ? 'primary' : 'outline'}
              size="sm"
              className="min-h-[44px] touch-manipulation flex-1 sm:flex-initial min-w-[70px]"
              onClick={() => setViewMode('day')}
            >
              Día
            </Button>
          </div>
        </div>

        {/* Grid del Calendario - scroll horizontal en mobile */}
        {viewMode === 'month' && (
          <div className="overflow-x-auto overflow-y-hidden hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <div className="grid grid-cols-7 gap-1 min-w-[320px] w-full">
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
                    {dayAppointments.slice(0, 3).map((apt) => {
                      const calColor = apt.status === 'cancelled'
                        ? 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30'
                        : apt.status === 'completed'
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30'
                      const dotColor = apt.status === 'cancelled' ? 'bg-red-500' : apt.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                      return (
                      <div
                        key={apt.id}
                        className={`text-xs p-1 rounded flex items-center gap-1 cursor-pointer ${calColor}`}
                        onClick={() => handleEdit(apt)}
                      >
                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className="truncate">
                          {apt.appointment_time} {apt.service_type}
                        </span>
                      </div>
                      )
                    })}
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
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!appointmentToDelete}
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cita"
        question="¿Estás seguro que deseas eliminar esta cita? Esta acción no se puede deshacer."
        confirmText="Eliminar Cita"
      />

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
        onUpdate={async () => {
          await loadData()
        }}
        appointmentId={selectedAppointmentForOrder?.id || null}
        organizationId={organizationId}
      />
    </div>
  )
}


