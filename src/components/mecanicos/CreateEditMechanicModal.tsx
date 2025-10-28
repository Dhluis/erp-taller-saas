'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, Wrench, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'
import { toast } from 'sonner'

interface CreateEditMechanicModalProps {
  isOpen: boolean
  onClose: () => void
  mechanicId?: string | null
  onSuccess?: () => void
}

interface ValidationErrors {
  name?: string
  email?: string
  phone?: string
  role?: string
  specialties?: string
}

const ROLES = [
  { value: 'mechanic', label: 'Mecánico' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'manager', label: 'Gerente' }
]

const SPECIALTIES_OPTIONS = [
  'Motor',
  'Transmisión',
  'Frenos',
  'Suspensión',
  'Electricidad',
  'Aire Acondicionado',
  'Diagnóstico',
  'Soldadura',
  'Pintura',
  'Carrocería'
]

export default function CreateEditMechanicModal({
  isOpen,
  onClose,
  mechanicId,
  onSuccess
}: CreateEditMechanicModalProps) {
  const { getEmployee, assignOrder, unassignOrderFromEmployee } = useEmployees({ autoLoad: false })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'mechanic',
    specialties: [] as string[],
    is_active: true
  })

  const isEditing = !!mechanicId

  // Cargar datos del mecánico si estamos editando
  useEffect(() => {
    if (isEditing && mechanicId) {
      loadMechanicData()
    } else {
      resetForm()
    }
  }, [isEditing, mechanicId])

  const loadMechanicData = async () => {
    if (!mechanicId) return

    try {
      setLoading(true)
      const employee = await getEmployee(mechanicId)
      
      if (employee) {
        setFormData({
          name: employee.name || '',
          email: employee.email || '',
          phone: employee.phone || '',
          role: employee.role || 'mechanic',
          specialties: employee.specialties || [],
          is_active: employee.is_active ?? true
        })
      }
    } catch (error: any) {
      console.error('Error loading mechanic:', error)
      toast.error('Error al cargar datos del mecánico')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'mechanic',
      specialties: [],
      is_active: true
    })
    setErrors({})
    setTouched({})
  }

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es requerido'
        if (value.trim().length < 2) return 'Mínimo 2 caracteres'
        return ''
        
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email inválido'
        }
        return ''
        
      case 'phone':
        if (value && !/^\d+$/.test(value)) {
          return 'Solo números permitidos'
        }
        if (value && value.length !== 10) {
          return 'Debe tener 10 dígitos'
        }
        return ''
        
      case 'role':
        if (!value) return 'El rol es requerido'
        return ''
        
      case 'specialties':
        if (Array.isArray(value) && value.length === 0) {
          return 'Selecciona al menos una especialidad'
        }
        return ''
        
      default:
        return ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Validar campo
    const error = validateField(name, value)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
    
    // Marcar como touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }))
  }

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar todos los campos
    const newErrors: ValidationErrors = {}
    
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData])
      if (error) newErrors[field as keyof ValidationErrors] = error
    })
    
    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
      phone: true,
      role: true,
      specialties: true
    })
    
    // Si hay errores, no continuar
    if (Object.keys(newErrors).length > 0) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }
    
    try {
      setLoading(true)
      
      // Aquí implementarías la lógica de crear/actualizar
      // Por ahora solo simulamos
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(
        isEditing 
          ? 'Mecánico actualizado exitosamente' 
          : 'Mecánico creado exitosamente'
      )
      
      onSuccess?.()
      onClose()
      
    } catch (error: any) {
      console.error('Error saving mechanic:', error)
      toast.error('Error al guardar mecánico')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0F1E] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isEditing ? 'Editar Mecánico' : 'Nuevo Mecánico'}
              </h2>
              <p className="text-sm text-gray-400">
                {isEditing ? 'Modifica los datos del mecánico' : 'Agrega un nuevo mecánico al equipo'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Nombre */}
          <div>
            <Label htmlFor="name">Nombre completo *</Label>
            <div className="relative">
              <Input
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                disabled={loading}
                className={`${errors.name ? 'border-red-500' : 'border-gray-700'} pl-10`}
              />
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              {!errors.name && formData.name && (
                <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
              {errors.name && (
                <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
              )}
            </div>
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="juan@taller.com"
                  disabled={loading}
                  className={`${errors.email ? 'border-red-500' : 'border-gray-700'} pl-10`}
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                {!errors.email && formData.email && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {errors.email && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="4491234567"
                  disabled={loading}
                  className={`${errors.phone ? 'border-red-500' : 'border-gray-700'} pl-10`}
                />
                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                {!errors.phone && formData.phone && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {errors.phone && (
                  <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role">Rol *</Label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 ${
                errors.role ? 'border-red-500' : 'border-gray-700'
              }`}
            >
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-xs text-red-500 mt-1">{errors.role}</p>
            )}
          </div>

          {/* Especialidades */}
          <div>
            <Label>Especialidades *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SPECIALTIES_OPTIONS.map(specialty => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => handleSpecialtyToggle(specialty)}
                  disabled={loading}
                  className={`p-2 text-sm rounded-lg border transition-all ${
                    formData.specialties.includes(specialty)
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                      : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
            {errors.specialties && (
              <p className="text-xs text-red-500 mt-1">{errors.specialties}</p>
            )}
          </div>

          {/* Estado activo (solo al editar) */}
          {isEditing && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  is_active: e.target.checked
                }))}
                className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
              />
              <Label htmlFor="is_active" className="text-sm text-gray-300">
                Mecánico activo
              </Label>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} Mecánico
          </button>
        </div>
      </div>
    </div>
  )
}
