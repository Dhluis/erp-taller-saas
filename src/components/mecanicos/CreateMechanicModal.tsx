// src/components/mecanicos/CreateMechanicModal.tsx
'use client'

import { useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle2, Wrench } from 'lucide-react'

interface CreateMechanicModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ValidationErrors {
  email?: string
  phone?: string
}

export function CreateMechanicModal({ 
  open, 
  onOpenChange, 
  onSuccess
}: CreateMechanicModalProps) {
  const { profile } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'mechanic',
    specialties: ''
  })

  // Validaciones
  const validateEmail = (email: string): string | undefined => {
    if (!email) return undefined
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Email inválido'
    
    return undefined
  }

  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return undefined
    
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 0) return undefined
    if (cleaned.length < 10) return 'El teléfono debe tener al menos 10 dígitos'
    if (cleaned.length > 15) return 'El teléfono es demasiado largo'
    
    return undefined
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    let error: string | undefined
    
    switch (field) {
      case 'email':
        error = validateEmail(value)
        break
      case 'phone':
        error = validatePhone(value)
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
    setTouched({ email: true, phone: true })
    
    // Validar todos los campos
    const newErrors: ValidationErrors = {
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone)
    }
    
    setErrors(newErrors)
    
    // Si hay errores, no continuar
    const hasErrors = Object.values(newErrors).some(error => error !== undefined)
    if (hasErrors) {
      toast.error('Por favor corrige los errores del formulario')
      return
    }
    
    if (!profile?.workshop_id) {
      toast.error('Error', {
        description: 'No hay sesión activa. Por favor recarga la página.'
      })
      return
    }

    setLoading(true)
    console.log('🚀 [CreateMechanic] Iniciando creación...')
    console.log('🔍 [CreateMechanic] Workshop ID:', profile.workshop_id)

    try {
      // Obtener organization_id del workshop
      console.log('🔍 [CreateMechanic] Obteniendo organization_id...')
      const { data: workshopData, error: workshopError } = await supabase
        .from('workshops')
        .select('organization_id')
        .eq('id', profile.workshop_id)
        .single()

      console.log('📊 [CreateMechanic] Workshop data:', workshopData)
      console.log('📊 [CreateMechanic] Workshop error:', workshopError)

      if (workshopError || !workshopData) {
        console.error('❌ [CreateMechanic] Error obteniendo workshop')
        throw new Error('No se pudo obtener los datos del taller')
      }

      // Preparar especialidades
      const specialtiesArray = formData.specialties 
        ? formData.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : null

      console.log('📝 [CreateMechanic] Especialidades procesadas:', specialtiesArray)

      // Preparar datos para insertar
      const mechanicData = {
        organization_id: workshopData.organization_id,
        workshop_id: profile.workshop_id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        specialties: specialtiesArray,
        is_active: true
      }

      console.log('📋 [CreateMechanic] Datos a insertar:', mechanicData)

      // Crear el mecánico/empleado en la tabla employees
      console.log('➕ [CreateMechanic] Insertando en tabla employees...')
      const { data: newMechanic, error: mechanicError } = await supabase
        .from('employees')
        .insert(mechanicData)
        .select()
        .single()

      console.log('📊 [CreateMechanic] Resultado insert:', { newMechanic, mechanicError })

      if (mechanicError) {
        console.error('❌ [CreateMechanic] Error de Supabase:', mechanicError)
        console.error('❌ [CreateMechanic] Error completo:', JSON.stringify(mechanicError, null, 2))
        console.error('❌ [CreateMechanic] Error keys:', Object.keys(mechanicError))
        console.error('❌ [CreateMechanic] Error code:', mechanicError.code)
        console.error('❌ [CreateMechanic] Error message:', mechanicError.message)
        console.error('❌ [CreateMechanic] Error details:', mechanicError.details)
        console.error('❌ [CreateMechanic] Error hint:', mechanicError.hint)
        
        // Si el error está vacío, podría ser un problema de RLS
        if (Object.keys(mechanicError).length === 0) {
          throw new Error('Error de permisos: Verifica las políticas RLS de la tabla employees')
        }
        
        throw mechanicError
      }
      
      // Verificar que realmente se creó el registro
      if (!newMechanic) {
        console.error('❌ [CreateMechanic] No se retornó el mecánico creado')
        throw new Error('No se pudo crear el mecánico. Verifica los permisos de la tabla.')
      }

      console.log('✅ [CreateMechanic] Mecánico creado exitosamente:', newMechanic?.id)

      toast.success('Mecánico creado exitosamente', {
        description: `${formData.name} ha sido agregado al equipo`
      })
      
      onOpenChange(false)
      resetForm()
      onSuccess?.()

    } catch (error: any) {
      console.error('❌ [CreateMechanic] Error general:', error)
      console.error('❌ [CreateMechanic] Error type:', typeof error)
      console.error('❌ [CreateMechanic] Error keys:', Object.keys(error))
      console.error('❌ [CreateMechanic] Error message:', error?.message)
      console.error('❌ [CreateMechanic] Error code:', error?.code)
      console.error('❌ [CreateMechanic] Error details:', error?.details)
      console.error('❌ [CreateMechanic] Error hint:', error?.hint)
      
      toast.error('Error al crear mecánico', {
        description: error?.message || error?.hint || 'Verifica los datos e intenta nuevamente'
      })
    } finally {
      setLoading(false)
      console.log('🏁 [CreateMechanic] Proceso finalizado')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'mechanic',
      specialties: ''
    })
    setErrors({})
    setTouched({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Nuevo Mecánico
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo miembro al equipo de trabajo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Juan Pérez García"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="mecanico@ejemplo.com"
                disabled={loading}
                className={
                  isFieldInvalid('email') 
                    ? 'border-red-500 pr-10' 
                    : isFieldValid('email')
                    ? 'border-green-500 pr-10'
                    : ''
                }
              />
              {isFieldValid('email') && (
                <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
              {isFieldInvalid('email') && (
                <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
              )}
            </div>
            {isFieldInvalid('email') && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="222-123-4567"
                disabled={loading}
                className={
                  isFieldInvalid('phone') 
                    ? 'border-red-500 pr-10' 
                    : isFieldValid('phone')
                    ? 'border-green-500 pr-10'
                    : ''
                }
              />
              {isFieldValid('phone') && (
                <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
              {isFieldInvalid('phone') && (
                <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
              )}
            </div>
            {isFieldInvalid('phone') && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role">Rol *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mechanic">Mecánico</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="receptionist">Recepcionista</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Especialidades */}
          <div>
            <Label htmlFor="specialties">Especialidades (opcional)</Label>
            <Input
              id="specialties"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              placeholder="Frenos, Suspensión, Transmisión (separadas por coma)"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separa múltiples especialidades con comas
            </p>
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
              {loading ? 'Creando...' : 'Crear Mecánico'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

