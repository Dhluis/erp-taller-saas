// components/ordenes/CreateWorkOrderModal.tsx

'use client'

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'

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

import { useAuth } from '@/hooks/useAuth'
import { useOrganization, useSession } from '@/lib/context/SessionContext'
import { createClient } from '@/lib/supabase/client'
import { useCustomers } from '@/hooks/useCustomers'

import { AlertCircle, CheckCircle2, User, Droplet, Fuel, Shield, Clipboard, Wrench, ChevronDown, FileText, Upload, X, Check, ClipboardCheck, DollarSign, FileSignature, ArrowLeft, ArrowRight } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { OrderCreationImageCapture, TemporaryImage } from './OrderCreationImageCapture'
import { useBilling } from '@/hooks/useBilling'
import { sanitize, INPUT_LIMITS } from '@/lib/utils/input-sanitizers'
import { useLimitCheck } from '@/hooks/useLimitCheck'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

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

  // Términos y Condiciones

  terms_type: 'text' as 'text' | 'file', // 'text' para escribir, 'file' para subir PDF

  terms_text: '', // Texto de términos y condiciones

  terms_file: null as File | null, // Archivo PDF de términos

  terms_accepted: false, // Checkbox de aceptación

  customer_signature: '', // Firma digital del cliente (base64)

  

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

// Wizard: indicador de pasos con color por paso (1=Cliente, 2=Inspección, 3=Costos, 4=Términos)
const STEP_ICONS = [User, ClipboardCheck, DollarSign, FileSignature]
const STEP_COLORS = [
  { active: 'bg-cyan-500 ring-cyan-400 text-white', label: 'text-cyan-400', pending: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' },
  { active: 'bg-amber-500 ring-amber-400 text-white', label: 'text-amber-400', pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/50' },
  { active: 'bg-emerald-500 ring-emerald-400 text-white', label: 'text-emerald-400', pending: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' },
  { active: 'bg-violet-500 ring-violet-400 text-white', label: 'text-violet-400', pending: 'bg-violet-500/20 text-violet-400 border border-violet-500/50' },
]
function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  const labels = ['Cliente y Vehículo', 'Inspección', 'Servicios y Costos', 'Términos y Firma']
  return (
    <div className="flex items-center justify-between gap-2 py-3 px-4 bg-slate-900/90 rounded-lg border border-slate-600 mb-4 shadow-inner">
      {[1, 2, 3, 4].map((step) => {
        const Icon = STEP_ICONS[step - 1]
        const colors = STEP_COLORS[step - 1]
        const isActive = currentStep === step
        const isCompleted = completedSteps.includes(step)
        const circleClass = isActive
          ? `${colors.active} ring-2 ring-offset-2 ring-offset-slate-900`
          : isCompleted
            ? 'bg-green-500 text-white border-2 border-green-400'
            : `${colors.pending}`
        const labelClass = isActive ? colors.label : isCompleted ? 'text-green-400' : 'text-slate-400'
        return (
          <div
            key={step}
            className={`flex items-center gap-2 flex-1 min-w-0 ${step < 4 ? 'border-r border-slate-600 pr-2' : ''}`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${circleClass}`}
            >
              {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 hidden sm:block">
              <span className={`text-xs font-medium block truncate ${labelClass}`}>
                {labels[step - 1]}
              </span>
              <span className="text-xs text-slate-500">{step}/4</span>
            </div>
          </div>
        )
      })}
    </div>
  )
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
  const { workshopId: sessionWorkshopId, hasMultipleWorkshops, user, isReady } = useSession();
  const organizationId = propOrganizationId ?? contextOrganizationId;

  const { profile } = useAuth()

  const supabase = createClient()
  
  // ✅ Cargar clientes existentes
  const { customers } = useCustomers()

  // ✅ Verificación de límites de plan
  const { canCreateOrder, usage, plan } = useBilling()
  const { limitError, showUpgradeModal, handleApiError, closeUpgradeModal, showUpgrade } = useLimitCheck()

  const [loading, setLoading] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  
  // ✅ Estados para IDs de la cita (para usar directamente sin búsqueda)
  const [appointmentCustomerId, setAppointmentCustomerId] = useState<string | null>(null)
  const [appointmentVehicleId, setAppointmentVehicleId] = useState<string | null>(null)
  
  // Estado para el dropdown de clientes
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  // ❌ ELIMINADO: const [filteredCustomers, setFilteredCustomers] = useState<typeof customers>([])
  // ✅ AHORA se usa useMemo más abajo para calcular filteredCustomers

  // Log cuando los clientes cambian
  useEffect(() => {
    console.log('📦 [Dropdown] Clientes cargados del hook:', customers.length);
    if (customers.length > 0) {
      console.log('📋 [Dropdown] Primeros clientes:', customers.slice(0, 3).map(c => c.name));
    }
  }, [customers])

  const [loadingSystemUsers, setLoadingSystemUsers] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Estados para términos y condiciones
  const [termsFilePreview, setTermsFilePreview] = useState<string | null>(null) // URL del preview del PDF
  const signatureRef = useRef<SignatureCanvas>(null) // Referencia para el canvas de firma
  const signatureContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const adjustCanvas = () => {
      if (signatureContainerRef.current && signatureRef.current) {
        const container = signatureContainerRef.current
        const canvas = signatureRef.current.getCanvas()
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = 150
        signatureRef.current.clear()
      }
    }
    const timer = setTimeout(adjustCanvas, 100)
    window.addEventListener('resize', adjustCanvas)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', adjustCanvas)
    }
  }, [])

  // ✅ Estado para fotos temporales durante la creación
  const [temporaryImages, setTemporaryImages] = useState<TemporaryImage[]>([])

  // Wizard: paso actual (1-4) y pasos completados
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  const validateField = (name: string, value: string): string => {

    switch (name) {

      case 'customerName':

        if (!value.trim()) return 'El nombre es requerido'

        if (value.trim().length < 3) return 'Mínimo 3 caracteres'

        if (!/^[\p{L}\s'-]+$/u.test(value)) return 'Solo letras permitidas'

        return ''

        

      case 'customerPhone':

        if (!value.trim()) return 'El teléfono es requerido'

        if (!/^\d+$/.test(value)) return 'Solo números permitidos'

        if (value.length !== 10) return `Debe tener 10 dígitos (tiene ${value.length})`

        return ''

        

      case 'customerEmail':

        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {

          return 'Formato de email inválido (ej: correo@ejemplo.com)'

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
        // ✅ Campo opcional - solo validar formato si tiene valor
        if (value && value.trim() !== '') {
          const numValue = parseFloat(value)
          if (isNaN(numValue)) return 'Debe ser un número válido'
          if (numValue < 0) return 'No puede ser negativo'
        }
        return ''

        

      default:

        return ''

    }

  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {

    const { name, value } = e.target

    

    let processedValue = value
    switch (name) {
      case 'customerPhone': processedValue = sanitize.phone(value); break
      case 'vehiclePlate': processedValue = sanitize.plate(value); break
      case 'vehicleVin': processedValue = sanitize.vin(value); break
      case 'vehicleYear': processedValue = sanitize.year(value); break
      case 'vehicleMileage': processedValue = sanitize.mileage(value); break
      default: break
    }

    

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

  // ✅ Cargar empleados asignables (MECANICO y ASESOR) desde tabla users
  const loadEmployees = useCallback(async () => {
    if (!organizationId) {
      console.warn('⚠️ [loadEmployees] No hay organizationId disponible')
      setEmployees([])
      setLoadingEmployees(false)
      return
    }

    try {
      setLoadingEmployees(true)

      // ✅ FIX #1: Verificar que el usuario esté autenticado antes de ejecutar la query
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session || sessionError) {
        console.error('❌ [loadEmployees] Usuario no autenticado:', {
          sessionError,
          hasSession: !!session,
          userId: session?.user?.id,
          organizationId
        })
        setEmployees([])
        setLoadingEmployees(false)
        return
      }

      console.log('✅ [loadEmployees] Usuario autenticado:', {
        userId: session.user.id,
        email: session.user.email,
        organizationId
      })

      // ✅ Buscar empleados asignables (MECANICO y ASESOR) en la tabla users
      const assignableRoles = ['MECANICO', 'ASESOR']
      console.log('🔍 [loadEmployees] Buscando empleados asignables con:', {
        organizationId,
        roles: assignableRoles,
        is_active: true,
        userId: session.user.id // ✅ Agregar userId al log
      })
      
      const { data: mechanics, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, workshop_id, organization_id, is_active')
        .eq('organization_id', organizationId)
        .in('role', assignableRoles) // ✅ Incluir MECANICO y ASESOR
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('❌ [loadEmployees] Error cargando empleados:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: session.user.id, // ✅ Agregar userId al log
          organizationId
        })
        throw error
      }

      console.log('📊 [loadEmployees] Resultado raw de Supabase:', {
        mechanicsCount: mechanics?.length || 0,
        mechanics: mechanics,
        error: error,
        userId: session.user.id // ✅ Agregar userId al log
      })

      // ✅ DEBUG: Si no hay resultados, verificar sin filtro is_active
      if (!mechanics || mechanics.length === 0) {
        console.warn('⚠️ [loadEmployees] No se encontraron empleados activos. Verificando todos los empleados...')
        const { data: allMechanics, error: allError } = await supabase
          .from('users')
          .select('id, full_name, email, role, is_active, organization_id')
          .eq('organization_id', organizationId)
          .in('role', assignableRoles) // ✅ Incluir MECANICO y ASESOR
        
        if (!allError && allMechanics) {
          console.log('📋 [loadEmployees] Todos los empleados (sin filtro is_active):', {
            total: allMechanics.length,
            active: allMechanics.filter(m => m.is_active).length,
            inactive: allMechanics.filter(m => !m.is_active).length,
            byRole: {
              MECANICO: allMechanics.filter(m => m.role === 'MECANICO').length,
              ASESOR: allMechanics.filter(m => m.role === 'ASESOR').length
            },
            employees: allMechanics.map(m => ({
              name: m.full_name || m.email,
              is_active: m.is_active,
              role: m.role
            }))
          })
        }
      }

      // ✅ Filtrar por workshop_id si hay múltiples workshops Y el usuario tiene workshop asignado
      // ✅ IMPORTANTE: Incluir empleados sin workshop asignado (workshop_id: null) para todos los workshops
      let filteredMechanics = mechanics || [];
      if (sessionWorkshopId && hasMultipleWorkshops) {
        // Incluir empleados del workshop específico O sin workshop asignado (flotantes)
        filteredMechanics = (mechanics || []).filter((mech: any) => 
          mech.workshop_id === sessionWorkshopId || mech.workshop_id === null
        );
      }

      // Mapear a formato compatible con el dropdown
      const mappedMechanics = filteredMechanics.map((mech: any) => ({
        id: mech.id,
        name: mech.full_name || mech.email || 'Sin nombre',
        email: mech.email,
        role: mech.role || 'MECANICO'
      }));

      setEmployees(mappedMechanics);
      console.log('✅ [loadEmployees] Empleados asignables cargados:', {
        total: mappedMechanics?.length || 0,
        byRole: {
          MECANICO: mappedMechanics.filter(m => m.role === 'MECANICO').length,
          ASESOR: mappedMechanics.filter(m => m.role === 'ASESOR').length
        },
        organizationId: organizationId,
        workshopId: sessionWorkshopId || 'sin filtro workshop',
        hasMultipleWorkshops,
        userId: session.user.id // ✅ Agregar userId al log
      })
    } catch (error) {
      console.error('❌ [loadEmployees] Error cargando mecánicos:', error)
      setEmployees([])
    } finally {
      setLoadingEmployees(false)
    }
  }, [organizationId, sessionWorkshopId, hasMultipleWorkshops, supabase])

  // ✅ FIX #2: Esperar a que la sesión esté lista antes de cargar empleados
  useEffect(() => {
    if (open && isReady && user && organizationId) {
      console.log('✅ [useEffect] Condiciones cumplidas para cargar empleados:', {
        open,
        isReady,
        hasUser: !!user,
        userId: user?.id,
        organizationId
      })
      loadSystemUsers()
      loadEmployees()
    } else {
      console.log('⏳ [useEffect] Esperando condiciones:', {
        open,
        isReady,
        hasUser: !!user,
        organizationId
      })
    }
  }, [open, isReady, user, organizationId, loadSystemUsers, loadEmployees])

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

          const appointmentData = appointment as any

          // ✅ GUARDAR IDs DIRECTOS DE LA CITA (para usar sin búsqueda)
          if (appointmentData.customer_id) {
            setAppointmentCustomerId(appointmentData.customer_id)
            console.log('✅ [Cita] customer_id guardado:', appointmentData.customer_id)
          }
          if (appointmentData.vehicle_id) {
            setAppointmentVehicleId(appointmentData.vehicle_id)
            console.log('✅ [Cita] vehicle_id guardado:', appointmentData.vehicle_id)
          }

          // Pre-llenar todos los datos disponibles de la cita en un solo setFormData
          const prefill: Partial<typeof INITIAL_FORM_DATA> = {}

          // — Cliente —
          if (appointmentData.customer) {
            prefill.customerName = appointmentData.customer.name || ''
            prefill.customerPhone = appointmentData.customer.phone || ''
            prefill.customerEmail = appointmentData.customer.email || ''
          }

          // — Vehículo (filtrar placeholders "Desconocido" y "TEMP-") —
          if (appointmentData.vehicle) {
            const v = appointmentData.vehicle
            const cleanVal = (val: string | null | undefined, placeholder: string) =>
              val && val !== placeholder ? val : ''

            prefill.vehicleBrand = cleanVal(v.brand, 'Desconocido')
            prefill.vehicleModel = cleanVal(v.model, 'Desconocido')
            prefill.vehicleYear = v.year ? String(v.year) : ''
            prefill.vehiclePlate = v.license_plate?.startsWith('TEMP-') ? '' : (v.license_plate || '')
            prefill.vehicleColor = v.color || ''
            prefill.vehicleVin = v.vin || ''
            prefill.vehicleMileage = v.mileage ? String(v.mileage) : ''
          }

          // — Servicio → descripción + motivo de ingreso —
          if (appointmentData.service_type) {
            prefill.description = `Servicio: ${appointmentData.service_type}`
            prefill.entry_reason = appointmentData.service_type
          }
          if (appointmentData.notes) {
            prefill.description = (prefill.description || '') + ` - ${appointmentData.notes}`
            prefill.procedures = appointmentData.notes
          }

          setFormData(prev => ({ ...prev, ...prefill }))
          console.log('✅ [Cita→Orden] Datos pre-llenados:', Object.keys(prefill))

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

      // ✅ Limpiar IDs de la cita cuando se cierra el modal
      setAppointmentCustomerId(null)
      setAppointmentVehicleId(null)

      // Wizard: reset pasos
      setCurrentStep(1)
      setCompletedSteps([])

    }

  }, [open])
  
  // ✅ QUICK WIN #3: Filtrar clientes MEMOIZADO (evita re-calcular en cada render)
  const filteredCustomers = useMemo(() => {
    console.log('🔍 [Dropdown] Filtrando clientes (memoizado):', {
      customerNameLength: formData.customerName.length,
      totalCustomers: customers.length,
      customerName: formData.customerName
    });
    
    // Si no hay texto de búsqueda, retornar todos
    if (formData.customerName.length === 0) {
      console.log('📋 [Dropdown] Mostrando todos los clientes:', customers.length);
      return customers
    }
    
    // Filtrar por coincidencia (case-insensitive)
    const lowerQuery = formData.customerName.toLowerCase()
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(lowerQuery)
    )
    
    console.log('✅ [Dropdown] Clientes filtrados:', filtered.length);
    return filtered
  }, [formData.customerName, customers])

  const handleBlur = (field: string) => {

    setTouched(prev => ({ ...prev, [field]: true }))

  }

  // Funciones para manejar términos y condiciones
  const handleTermsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF')
        return
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB - coincidir con límite del bucket
        toast.error('El archivo es demasiado grande. Máximo 50MB')
        return
      }
      setFormData(prev => ({ ...prev, terms_file: file, terms_type: 'file' }))
      const reader = new FileReader()
      reader.onload = (e) => {
        setTermsFilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      toast.success('Archivo PDF cargado correctamente')
    }
  }

  const handleRemoveTermsFile = () => {
    setFormData(prev => ({ ...prev, terms_file: null, terms_type: 'text' }))
    setTermsFilePreview(null)
  }

  const handleSaveSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL()
      setFormData(prev => ({ ...prev, customer_signature: signatureData }))
      toast.success('✅ Firma guardada correctamente')
    }
  }

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
      setFormData(prev => ({ ...prev, customer_signature: '' }))
    }
  }

  const handleSignatureEnd = () => {
    handleSaveSignature()
  }

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    // ✅ Verificar límite ANTES de todo — cerrar diálogo y mostrar modal de upgrade
    if (!canCreateOrder && usage && plan) {
      onOpenChange(false)
      showUpgrade({
        type: 'limit_exceeded',
        resource: 'work_order',
        message: `Has alcanzado el límite de ${usage.orders.limit || 20} órdenes mensuales para tu plan ${plan.plan_tier === 'free' ? 'Free' : 'Premium'}. Actualiza a Premium para límites ilimitados.`,
        current: usage.orders.current,
        limit: usage.orders.limit,
        feature: 'max_orders_per_month',
        upgrade_url: '/settings/billing',
        plan_required: 'premium'
      })
      return
    }

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

      'estimated_cost' // ✅ Opcional - solo valida formato si tiene valor

    ]

    // Validación de términos y condiciones
    if (formData.terms_type === 'text' && !formData.terms_text.trim()) {
      newErrors.terms_text = 'Los términos y condiciones son requeridos'
    }

    if (formData.terms_type === 'file' && !formData.terms_file) {
      newErrors.terms_file = 'Debes subir un archivo PDF con los términos y condiciones'
    }

    if (!formData.terms_accepted) {
      newErrors.terms_accepted = 'El cliente debe aceptar los términos y condiciones'
    }

    if (!formData.customer_signature) {
      newErrors.customer_signature = 'El cliente debe firmar digitalmente'
    }

    

    fieldsToValidate.forEach(field => {

      const error = validateField(field, formData[field] || '')

      if (error) newErrors[field] = error

    })

    

    setErrors(newErrors)

    

    if (Object.keys(newErrors).length > 0) {

      const errorList = Object.values(newErrors).slice(0, 3).join('. ')
      toast.error('No se puede crear la orden', {
        description: errorList + (Object.keys(newErrors).length > 3 ? ' ...' : ''),
        duration: 6000,
      })

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
      // ✅ Usar organizationId del context o prop (SIEMPRE requerido)
      if (!organizationId) {
        throw new Error('No se pudo obtener organization_id');
      }

      // ✅ workshopId es opcional - puede ser null si la org tiene múltiples workshops
      // Si la organización tiene un solo taller, se infiere automáticamente desde SessionContext
      const workshopId = sessionWorkshopId || profile?.workshop_id || null;
      
      console.log('🔍 [CreateWorkOrderModal] organizationId:', organizationId);
      console.log('🔍 [CreateWorkOrderModal] workshopId:', workshopId || 'sin asignar');
      console.log('🔍 [CreateWorkOrderModal] Has Multiple Workshops:', hasMultipleWorkshops);

      // ✅ MEJORA: Usar IDs de la cita directamente si están disponibles
      let customerId: string | null = null
      let vehicleId: string | null = null

      // ✅ CLIENTE: Usar ID de la cita directamente (más eficiente y preciso)
      if (appointmentCustomerId) {
        console.log('✅ [CreateWorkOrderModal] Usando customer_id de la cita:', appointmentCustomerId)
        // Verificar que el cliente existe y pertenece a la organización
        const { data: customerCheck, error: customerCheckError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', appointmentCustomerId)
          .eq('organization_id', organizationId)
          .single()

        if (customerCheckError || !customerCheck) {
          console.warn('⚠️ [CreateWorkOrderModal] customer_id de cita no válido, buscando por teléfono...')
          // Fallback a búsqueda por teléfono (customerId seguirá siendo null)
        } else {
          customerId = appointmentCustomerId
        }
      }

      // Si no tenemos customerId de la cita, buscar o crear
      if (!customerId) {
        // ✅ Búsqueda de cliente con filtro opcional por workshop_id
        let customerQuery = supabase
          .from('customers')
          .select('*')
          .eq('phone', formData.customerPhone)
          .eq('organization_id', organizationId);
        
        // ✅ Solo filtrar por workshop_id si existe
        if (workshopId) {
          customerQuery = customerQuery.eq('workshop_id', workshopId);
        }
        
        const { data: existingCustomer } = await customerQuery.maybeSingle()

        customerId = (existingCustomer as any)?.id

        if (!customerId) {
          // ✅ Crear cliente con workshop_id opcional
          const customerData: any = {
            organization_id: organizationId,
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail || null
          };
          
          // ✅ Solo agregar workshop_id si existe
          if (workshopId) {
            customerData.workshop_id = workshopId;
          }

          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert(customerData)
            .select()
            .single()

          if (customerError) throw customerError

          if (!newCustomer) throw new Error('No se pudo crear el cliente')

          customerId = (newCustomer as any).id
        }
      }

      // ✅ VEHÍCULO: Usar ID de la cita directamente (más eficiente y preciso)
      if (appointmentVehicleId) {
        console.log('✅ [CreateWorkOrderModal] Usando vehicle_id de la cita:', appointmentVehicleId)
        // Verificar que el vehículo existe y pertenece a la organización
        const { data: vehicleCheck, error: vehicleCheckError } = await supabase
          .from('vehicles')
          .select('id')
          .eq('id', appointmentVehicleId)
          .eq('organization_id', organizationId)
          .single()

        if (vehicleCheckError || !vehicleCheck) {
          console.warn('⚠️ [CreateWorkOrderModal] vehicle_id de cita no válido, buscando por placa...')
          // Fallback a búsqueda por placa (vehicleId seguirá siendo null)
        } else {
          vehicleId = appointmentVehicleId
        }
      }

      // Si no tenemos vehicleId de la cita, buscar o crear
      if (!vehicleId) {
        // ✅ Búsqueda de vehículo con filtro opcional por workshop_id
        let vehicleQuery = supabase
          .from('vehicles')
          .select('id')
          .eq('license_plate', formData.vehiclePlate.toUpperCase())
          .eq('organization_id', organizationId);
        
        // ✅ Solo filtrar por workshop_id si existe
        if (workshopId) {
          vehicleQuery = vehicleQuery.eq('workshop_id', workshopId);
        }
        
        const { data: existingVehicle } = await vehicleQuery.maybeSingle()

        vehicleId = (existingVehicle as any)?.id

        if (vehicleId) {
          // ✅ FIX: Actualizar campos del vehículo existente (color, km, VIN, etc.)
          const vehicleUpdateData: Record<string, unknown> = {}
          if (formData.vehicleBrand)   vehicleUpdateData.brand = formData.vehicleBrand
          if (formData.vehicleModel)   vehicleUpdateData.model = formData.vehicleModel
          if (formData.vehicleYear)    vehicleUpdateData.year = parseInt(formData.vehicleYear) || null
          if (formData.vehicleColor)   vehicleUpdateData.color = formData.vehicleColor
          if (formData.vehicleVin?.trim()) vehicleUpdateData.vin = formData.vehicleVin.trim().toUpperCase()
          if (formData.vehicleMileage) vehicleUpdateData.mileage = parseInt(formData.vehicleMileage) || null

          if (Object.keys(vehicleUpdateData).length > 0) {
            const { error: vehicleUpdateError } = await supabase
              .from('vehicles')
              .update(vehicleUpdateData as any)
              .eq('id', vehicleId)

            if (vehicleUpdateError) {
              console.warn('⚠️ [CreateWorkOrderModal] Error actualizando vehículo existente:', vehicleUpdateError)
            } else {
              console.log('✅ [CreateWorkOrderModal] Vehículo existente actualizado con nuevos datos')
            }
          }
        } else if (!vehicleId) {
          // ✅ Crear vehículo con workshop_id opcional
          const vehicleData: any = {
            customer_id: customerId,
            organization_id: organizationId,
            brand: formData.vehicleBrand,
            model: formData.vehicleModel,
            year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
            license_plate: formData.vehiclePlate.toUpperCase(),
            color: formData.vehicleColor || null,
            vin: formData.vehicleVin?.trim().toUpperCase() || null,
            mileage: formData.vehicleMileage ? parseInt(formData.vehicleMileage) : null
          };
          
          // ✅ Solo agregar workshop_id si existe
          if (workshopId) {
            vehicleData.workshop_id = workshopId;
          }

          const { data: newVehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert(vehicleData)
            .select()
            .single()

          if (vehicleError) throw vehicleError

          if (!newVehicle) throw new Error('No se pudo crear el vehículo')

          vehicleId = (newVehicle as any).id
        }
      }

      // Subir archivo PDF de términos si existe
      let termsFileUrl: string | null = null
      if (formData.terms_type === 'file' && formData.terms_file) {
        try {
          // Validar que el archivo es PDF
          if (formData.terms_file.type !== 'application/pdf') {
            throw new Error('El archivo debe ser un PDF válido')
          }
          
          // Validar tamaño (50MB máximo)
          const MAX_SIZE = 50 * 1024 * 1024
          if (formData.terms_file.size > MAX_SIZE) {
            throw new Error('El archivo es demasiado grande. Máximo 50MB')
          }
          
          // Generar nombre de archivo seguro
          const fileExt = formData.terms_file.name.split('.').pop()?.toLowerCase() || 'pdf'
          const sanitizedOrgId = organizationId?.replace(/[^a-zA-Z0-9-]/g, '') || 'unknown'
          const timestamp = Date.now()
          const fileName = `terms/${sanitizedOrgId}/${timestamp}.${fileExt}`
          
          console.log('📤 [CreateWorkOrderModal] Subiendo PDF de términos:', {
            fileName,
            fileSize: formData.terms_file.size,
            fileType: formData.terms_file.type,
            bucket: 'work-order-documents',
            organizationId: sanitizedOrgId
          })
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('work-order-documents') // ✅ Cambiado de 'documents' a 'work-order-documents'
            .upload(fileName, formData.terms_file, {
              contentType: formData.terms_file.type || 'application/pdf', // ✅ Usar tipo real del archivo
              upsert: false,
              cacheControl: '3600'
            })
          
          if (uploadError) {
            console.error('❌ [CreateWorkOrderModal] Error subiendo archivo PDF:', {
              error: uploadError,
              message: uploadError.message,
              statusCode: uploadError.statusCode,
              statusText: uploadError.statusText,
              errorContext: uploadError.errorContext,
              fileName,
              bucket: 'work-order-documents'
            })
            
            // Mensaje de error más descriptivo
            let errorMessage = uploadError.message || 'Error desconocido'
            if (uploadError.statusCode === '400') {
              errorMessage = 'El bucket no existe o el formato del archivo no es válido. Verifica la configuración del bucket.'
            } else if (uploadError.statusCode === '403') {
              errorMessage = 'No tienes permisos para subir archivos. Verifica las políticas RLS.'
            } else if (uploadError.statusCode === '413') {
              errorMessage = 'El archivo es demasiado grande. Máximo 50MB.'
            }
            
            toast.error('Error al subir el archivo PDF', {
              description: errorMessage
            })
            throw new Error(`Error al subir PDF: ${errorMessage}`)
          } else if (!uploadData) {
            console.error('❌ [CreateWorkOrderModal] Upload exitoso pero sin data:', uploadData)
            toast.error('Error al subir el archivo PDF', {
              description: 'El archivo se subió pero no se obtuvo información de respuesta'
            })
            throw new Error('Error: No se recibió información del archivo subido')
          } else {
            console.log('✅ [CreateWorkOrderModal] PDF subido exitosamente:', uploadData.path)
            const { data: { publicUrl } } = supabase.storage
              .from('work-order-documents') // ✅ Cambiado de 'documents' a 'work-order-documents'
              .getPublicUrl(fileName)
            
            if (!publicUrl) {
              console.error('❌ [CreateWorkOrderModal] No se pudo generar URL pública')
              toast.error('Error al generar URL del archivo', {
                description: 'El archivo se subió pero no se pudo obtener la URL pública'
              })
              throw new Error('Error: No se pudo generar URL pública del archivo')
            }
            
            termsFileUrl = publicUrl
            console.log('🔗 [CreateWorkOrderModal] URL pública generada:', publicUrl)
          }
        } catch (uploadErr: any) {
          console.error('❌ [CreateWorkOrderModal] Error en upload de términos:', uploadErr)
          toast.error('Error al subir el archivo PDF', {
            description: uploadErr?.message || 'Error desconocido al subir el archivo'
          })
          throw uploadErr // Re-lanzar para detener el proceso de creación
        }
      }

      // ✅ Crear orderData con workshop_id opcional
      const orderData: any = {
        organization_id: organizationId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        description: formData.description?.trim() || 'Sin descripción',
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        status: 'reception',  // ✅ Primera etapa del proceso
        entry_date: new Date().toISOString(),
        // Términos y condiciones
        terms_type: formData.terms_type,
        terms_text: formData.terms_type === 'text' ? formData.terms_text : null,
        terms_file_url: termsFileUrl,
        terms_accepted: formData.terms_accepted,
        terms_accepted_at: formData.terms_accepted ? new Date().toISOString() : null,
        customer_signature: formData.customer_signature || null
      };
      
      // ✅ Solo agregar workshop_id si existe
      if (workshopId) {
        orderData.workshop_id = workshopId;
      }
      
      // ✅ Incluir assigned_to solo si hay un empleado seleccionado (no "none" y no vacío)
      if (formData.assigned_to && formData.assigned_to.trim() !== '' && formData.assigned_to !== 'none') {
        orderData.assigned_to = formData.assigned_to;
        console.log('📊 [CreateWorkOrderModal] Empleado asignado:', {
          id: formData.assigned_to,
          hasEmployee: true
        });
      } else {
        console.log('📊 [CreateWorkOrderModal] Sin empleado asignado');
      }
      
      console.log('📊 [CreateWorkOrderModal] orderData completo:', {
        hasWorkshop: !!orderData.workshop_id,
        workshopId: orderData.workshop_id || 'sin asignar',
        organizationId: orderData.organization_id,
        hasAssignedTo: !!orderData.assigned_to,
        assignedTo: orderData.assigned_to || 'sin asignar'
      });

      console.log('📝 [CreateWorkOrderModal] Datos de orden a insertar:', {
        organization_id: orderData.organization_id,
        workshop_id: orderData.workshop_id,
        customer_id: orderData.customer_id,
        vehicle_id: orderData.vehicle_id,
        status: orderData.status,
        description: orderData.description?.substring(0, 50) + '...',
        estimated_cost: orderData.estimated_cost
      });

      // ✅ Usar API route en lugar de query directa
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [CreateWorkOrderModal] Error al crear orden:', errorData);
        
        // ✅ Verificar si es error de límite alcanzado
        const isLimitError = await handleApiError({ status: response.status, ...errorData });
        if (isLimitError) {
          onOpenChange(false); // Cerrar diálogo de crear orden
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.error || 'Error al crear orden');
      }

      const result = await response.json();
      const newOrder = result.data;

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

      // ✅ Subir fotos con service role (API) y persistir en work_orders.images
      const orderId = (newOrder as any).id
      if (temporaryImages.length > 0 && orderId) {
        console.log('📸 [CreateWorkOrderModal] Subiendo fotos vía API:', temporaryImages.length)
        try {
          const formDataUpload = new FormData()
          temporaryImages.forEach((img) => {
            formDataUpload.append('files', img.file)
          })

          const res = await fetch(`/api/work-orders/${orderId}/images/upload`, {
            method: 'POST',
            body: formDataUpload,
          })
          const data = await res.json()

          if (res.ok && data.success) {
            if (data.failed > 0) {
              toast.warning(data.message || `Se subieron ${data.count} de ${temporaryImages.length} fotos.`)
            } else {
              toast.success(`Orden creada con ${data.count} foto(s) guardadas.`)
            }
            console.log('✅ [CreateWorkOrderModal] Fotos guardadas en Storage y BD:', data.count)
          } else {
            toast.warning(data.error || 'Orden creada. No se pudieron subir las fotos. Agrégalas desde la orden.')
          }

          temporaryImages.forEach((img) => {
            if (img.preview) URL.revokeObjectURL(img.preview)
          })
          setTemporaryImages([])
        } catch (uploadError: any) {
          console.error('❌ [CreateWorkOrderModal] Error subiendo fotos:', uploadError)
          toast.warning('Orden creada. Hubo un error al subir las fotos. Agrégalas desde la orden.')
          temporaryImages.forEach((img) => {
            if (img.preview) URL.revokeObjectURL(img.preview)
          })
          setTemporaryImages([])
        }
      }

      // ✅ NUEVO: Guardar inspección

      const { error: inspectionError } = await supabase

        .from('vehicle_inspections')

        .insert({

          order_id: (newOrder as any).id,

          organization_id: organizationId,

          ...(workshopId && { workshop_id: workshopId }), // ✅ Solo incluir si existe

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

    // ✅ Limpiar IDs de la cita
    setAppointmentCustomerId(null)
    setAppointmentVehicleId(null)

    // Wizard: reset pasos
    setCurrentStep(1)
    setCompletedSteps([])

    // Limpiar fotos temporales
    temporaryImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview)
      }
    })
    setTemporaryImages([])

    // Limpiar firma
    if (signatureRef.current) {
      signatureRef.current.clear()
    }

  }

  const handleNext = () => {
    const stepValidations: Record<number, string[]> = {
      1: ['customerName', 'customerPhone', 'customerEmail', 'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate'],
      2: [],
      3: []
    }
    const fieldsToValidate = stepValidations[currentStep] || []
    const stepErrors: Record<string, string> = {}
    fieldsToValidate.forEach((field) => {
      const value = formData[field as keyof typeof formData]
      const strValue = typeof value === 'string' ? value : (value != null ? String(value) : '')
      const error = validateField(field, strValue)
      if (error) stepErrors[field] = error
    })
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }))
      setTouched((prev) => ({
        ...prev,
        ...Object.keys(stepErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {})
      }))
      toast.error('Por favor completa los campos requeridos')
      return
    }
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }
    setCurrentStep(currentStep + 1)
  }

  if (!user || !profile) {

    return null

  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-4xl min-h-[80vh] max-h-[95vh] h-[85vh] overflow-hidden flex flex-col md:h-[88vh]">

        <DialogHeader className="flex-shrink-0">

          <DialogTitle>Nueva Orden de Trabajo</DialogTitle>

          <DialogDescription>

            La orden se creará en estado Recepción

          </DialogDescription>

        </DialogHeader>

        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (currentStep === 4) handleSubmit(e)
          }}
          className="flex flex-col flex-1 min-h-0 min-w-0 space-y-0"
        >

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-[320px] min-w-0 pr-2 pb-4 space-y-6">
          {currentStep === 1 && (
          <>
          {/* PASO 1: Datos del Cliente */}
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

                    inputMode="numeric"

                    value={formData.customerPhone}

                    onChange={handleChange}

                    placeholder="4491234567"

                    disabled={loading}

                    maxLength={INPUT_LIMITS.PHONE_MAX}

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

                    inputMode="numeric"

                    value={formData.vehicleYear}

                    onChange={handleChange}

                    placeholder="2020"

                    disabled={loading}

                    maxLength={4}

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

                  maxLength={INPUT_LIMITS.PLATE_MAX}

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

            <div className="grid grid-cols-2 gap-4">

              <div>

                <Label htmlFor="vehicle_vin">VIN / No. Serie</Label>

                <Input

                  id="vehicle_vin"

                  name="vehicleVin"

                  value={formData.vehicleVin}

                  onChange={handleChange}

                  placeholder="1HGCM82633A004352"

                  disabled={loading}

                  className="uppercase"

                  maxLength={17}

                />

                <p className="text-xs text-slate-500 mt-1">Opcional - 17 caracteres</p>

              </div>

              <div>

              <Label htmlFor="mileage">Kilometraje</Label>

              <div className="relative">

                <Input

                  id="mileage"

                  name="vehicleMileage"

                  inputMode="numeric"

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

          </div>

          </>
          )}

          {currentStep === 2 && (
          <>
          {/* ========== PASO 2: INSPECCIÓN DEL VEHÍCULO ========== */}

          <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">

            <h3 className="font-semibold text-sm border-b border-slate-700 pb-2 flex items-center gap-2 text-slate-300">

              <Clipboard className="h-4 w-4" />

              Inspección del Vehículo

            </h3>

            {/* Nivel de combustible */}

            <div>

              <Label className="flex items-center gap-2 mb-2 text-slate-300">

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

                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'

                    }`}

                  >

                    {level.label}

                  </button>

                ))}

              </div>

            </div>

            {/* Checklist de fluidos */}

            <div>

              <Label className="flex items-center gap-2 mb-3 text-slate-300">

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

                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700"

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

                    <span className="text-sm text-slate-300">{fluid.label}</span>

                  </label>

                ))}

              </div>

            </div>

            {/* Objetos de valor */}

            <div>

              <Label htmlFor="valuable_items" className="text-slate-300">Objetos de valor reportados</Label>

              <Textarea

                id="valuable_items"

                value={formData.valuable_items}

                onChange={(e) => setFormData({ ...formData, valuable_items: e.target.value })}

                rows={2}

                placeholder="Ej: Estéreo, GPS, herramientas en cajuela..."

                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"

              />

            </div>

          </div>

          {/* ========== ✅ NUEVO: MOTIVO DE INGRESO ========== */}

          <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">

            <h3 className="font-semibold text-sm border-b border-slate-700 pb-2 flex items-center gap-2 text-slate-300">

              <Wrench className="h-4 w-4" />

              Motivo de Ingreso

            </h3>

            {/* Toggles */}

            <div className="grid grid-cols-3 gap-3">

              <label className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">

                <span className="text-sm text-slate-300">¿Diagnóstico?</span>

                <input

                  type="checkbox"

                  checked={formData.will_diagnose}

                  onChange={(e) => setFormData({ ...formData, will_diagnose: e.target.checked })}

                  className="w-4 h-4 rounded"

                />

              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">

                <span className="text-sm text-slate-300">¿Garantía?</span>

                <input

                  type="checkbox"

                  checked={formData.is_warranty}

                  onChange={(e) => setFormData({ ...formData, is_warranty: e.target.checked })}

                  className="w-4 h-4 rounded"

                />

              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">

                <span className="text-sm text-slate-300">¿Prueba de ruta?</span>

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

              <Label htmlFor="entry_reason" className="text-slate-300">Motivo de ingreso</Label>

              <Textarea

                id="entry_reason"

                value={formData.entry_reason}

                onChange={(e) => setFormData({ ...formData, entry_reason: e.target.value })}

                rows={2}

                placeholder="Ej: Cliente reporta ruido en motor, falla en arranque..."

                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"

              />

            </div>

            {/* Procedimientos */}

            <div>

              <Label htmlFor="procedures" className="text-slate-300">Procedimientos a realizar</Label>

              <Textarea

                id="procedures"

                value={formData.procedures}

                onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}

                rows={2}

                placeholder="Ej: Revisión completa de motor, cambio de bujías..."

                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"

              />

            </div>

          </div>

            {/* ✅ Fotos del Vehículo - Paso 2 */}
            <div className="pt-4 border-t border-slate-700">
              <OrderCreationImageCapture
                images={temporaryImages}
                onImagesChange={setTemporaryImages}
                maxImages={20}
                disabled={loading}
              />
            </div>

          </>
          )}

          {currentStep === 3 && (
          <>
          {/* ========== PASO 3: COSTO ESTIMADO Y ASIGNACIÓN ========== */}
          <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
            <div>
              <Label htmlFor="estimated_cost" className="text-slate-300">
                Costo Estimado (MXN) <span className="text-slate-500 text-xs">(Opcional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="estimated_cost"
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
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
          </div>

            <Label htmlFor="assigned_to">Asignar Empleado (opcional)</Label>
            <Select
              name="assigned_to"
              value={formData.assigned_to && formData.assigned_to !== '' ? formData.assigned_to : 'none'}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, assigned_to: value === 'none' ? '' : value }))
              }}
              disabled={loading || loadingEmployees}
            >
              <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-600 text-white focus-visible:border-primary focus-visible:ring-primary/40">
                <SelectValue
                  placeholder={
                    loadingEmployees
                      ? "Cargando empleados..."
                      : employees.length === 0
                        ? "No hay empleados disponibles"
                        : "Sin asignar"
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-slate-900 text-white border border-slate-600 shadow-2xl" sideOffset={4} position="popper">
                <SelectItem value="none" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">
                  Sin asignar
                </SelectItem>
                {employees.length > 0 ? (
                  employees
                    .filter(emp => emp.id && emp.id.trim() !== '')
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.id} className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{employee.name}</span>
                            {employee.role && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                {employee.role}
                              </span>
                            )}
                          </div>
                          {employee.email && (
                            <span className="text-xs text-muted-foreground ml-6">{employee.email}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                ) : (
                  !loadingEmployees && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No hay empleados disponibles
                    </div>
                  )
                )}
              </SelectContent>
            </Select>
            {employees.length === 0 && !loadingEmployees && (
              <p className="text-xs text-gray-500 mt-1">
                No hay empleados disponibles. Los empleados deben tener rol MECANICO o ASESOR en la tabla users.
              </p>
            )}

          </>
          )}

          {currentStep === 4 && (
          <>
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <h3 className="font-semibold text-sm border-b pb-2">
                Términos y Condiciones
              </h3>

              {/* Selección de tipo: Texto o Archivo */}
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  variant={formData.terms_type === 'text' ? 'primary' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, terms_type: 'text', terms_file: null }))}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Escribir Términos
                </Button>
                <Button
                  type="button"
                  variant={formData.terms_type === 'file' ? 'primary' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, terms_type: 'file', terms_text: '' }))}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Subir PDF
                </Button>
              </div>

              {/* Textarea para escribir términos */}
              {formData.terms_type === 'text' && (
                <div>
                  <Label htmlFor="terms_text">Escribe los términos y condiciones *</Label>
                  <Textarea
                    id="terms_text"
                    name="terms_text"
                    required={formData.terms_type === 'text'}
                    rows={8}
                    placeholder="Ej: El cliente acepta que el taller no se hace responsable de...&#10;&#10;1. Garantías sobre piezas usadas&#10;2. Daños causados por el mal uso del vehículo&#10;3. ..."
                    value={formData.terms_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms_text: e.target.value }))}
                    disabled={loading}
                    className={`bg-slate-900 border-slate-600 text-white ${errors.terms_text ? 'border-red-500' : ''}`}
                  />
                  {errors.terms_text && (
                    <p className="text-red-400 text-xs mt-1">{errors.terms_text}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Escribe los términos y condiciones que el cliente debe aceptar
                  </p>
                </div>
              )}

              {/* Subida de archivo PDF */}
              {formData.terms_type === 'file' && (
                <div>
                  <Label htmlFor="terms_file">Subir documento PDF con términos y condiciones *</Label>
                  {errors.terms_file && (
                    <p className="text-red-400 text-xs mt-1">{errors.terms_file}</p>
                  )}
                  <div className="mt-2">
                    {!formData.terms_file ? (
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                        <input
                          type="file"
                          id="terms_file"
                          name="terms_file"
                          accept=".pdf,application/pdf"
                          onChange={handleTermsFileChange}
                          disabled={loading}
                          className="hidden"
                        />
                        <label
                          htmlFor="terms_file"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <Upload className="h-8 w-8 text-slate-400" />
                          <span className="text-sm text-slate-300">
                            Haz clic para subir un archivo PDF
                          </span>
                          <span className="text-xs text-slate-500">
                            Máximo 5MB
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="border border-slate-600 rounded-lg p-4 bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-cyan-400" />
                            <div>
                              <p className="text-sm text-white font-medium">
                                {formData.terms_file.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {(formData.terms_file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveTermsFile}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {termsFilePreview && (
                          <div className="mt-3">
                            <a
                              href={termsFilePreview}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                            >
                              Ver preview del PDF
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Checkbox de aceptación */}
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms_accepted"
                  name="terms_accepted"
                  checked={formData.terms_accepted}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_accepted: e.target.checked }))}
                  disabled={loading}
                  className={`mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 ${errors.terms_accepted ? 'border-red-500' : ''}`}
                />
                <Label htmlFor="terms_accepted" className="text-sm text-slate-300 cursor-pointer">
                  El cliente acepta los términos y condiciones *
                </Label>
              </div>
              {errors.terms_accepted && (
                <p className="text-red-400 text-xs mt-1 ml-6">{errors.terms_accepted}</p>
              )}
            </div>

          {/* Firma digital del cliente - Paso 4 */}
          <div className="pt-4 border-t border-slate-700">
            <Label className="text-sm font-medium mb-3 block">
              Firma Digital del Cliente *
            </Label>
            <div ref={signatureContainerRef} className="bg-white rounded-lg p-4 border border-slate-600">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  height: 150,
                  className: 'signature-canvas w-full block'
                }}
                onEnd={handleSignatureEnd}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSignature}
                disabled={loading || !formData.customer_signature}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar Firma
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveSignature}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Guardar Firma
              </Button>
            </div>
            {formData.customer_signature && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Firma guardada correctamente</span>
              </div>
            )}
            {errors.customer_signature && (
              <p className="text-red-400 text-xs mt-2">{errors.customer_signature}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              El cliente debe firmar digitalmente para autorizar el servicio
            </p>
          </div>

          </>
          )}

          </div>

          {/* Botones de navegación del wizard - siempre visibles al pie */}
          <div className="flex justify-between gap-3 pt-4 pb-1 border-t border-slate-700 flex-shrink-0 bg-slate-900/50 -mx-6 px-6 -mb-1 rounded-b-lg min-w-0">
            {currentStep === 4 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  disabled={loading}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? 'Creando...' : 'Crear Orden'}
                  <Check className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div>
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      disabled={loading}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="gap-2"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

        </form>

      </DialogContent>

    </Dialog>

    {/* ✅ Modal de upgrade FUERA del Dialog para evitar conflictos de overlay */}
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={closeUpgradeModal}
      limitError={limitError || undefined}
      featureName="Órdenes de trabajo"
    />

  </>
  )

})

export default CreateWorkOrderModal
