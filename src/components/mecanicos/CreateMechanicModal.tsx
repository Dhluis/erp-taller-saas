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
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/lib/context/SessionContext'
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
  const { organizationId, workshopId: sessionWorkshopId } = useSession()
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
    
    // ✅ Usar organizationId y workshopId dinámicos del SessionContext
    if (!organizationId) {
      toast.error('Error', {
        description: 'No se pudo obtener la organización. Por favor recarga la página.'
      })
      return
    }

    // ✅ workshopId es opcional - para crear mecánicos, preferiblemente debería existir
    const workshopId = sessionWorkshopId || profile?.workshop_id || null
    
    if (!workshopId) {
      toast.error('Error', {
        description: 'No se pudo determinar el taller. Si tu organización tiene múltiples talleres, por favor selecciona uno primero.'
      })
      return
    }

    setLoading(true)
    console.log('🚀 [CreateMechanic] Iniciando creación...')
    console.log('🔍 [CreateMechanic] Organization ID:', organizationId)
    console.log('🔍 [CreateMechanic] Workshop ID:', workshopId)

    try {

      // Preparar especialidades
      const specialtiesArray = formData.specialties 
        ? formData.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : null

      console.log('📝 [CreateMechanic] Especialidades procesadas:', specialtiesArray)

      // Preparar datos para insertar
      const mechanicData: any = {
        organization_id: organizationId,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        specialties: specialtiesArray,
        is_active: true
      }
      
      // ✅ Solo agregar workshop_id si existe
      if (workshopId) {
        mechanicData.workshop_id = workshopId
      }

      console.log('📋 [CreateMechanic] Datos a insertar:', mechanicData)

      // ✅ Usar API route en lugar de insert directo
      console.log('➕ [CreateMechanic] Creando empleado vía API...')
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mechanicData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [CreateMechanic] Error completo:', errorData);
        throw new Error(errorData.error || 'Error al crear mecánico');
      }

      const result = await response.json();
      const newMechanic = result.employee || result.data;
      
      console.log('📊 [CreateMechanic] Resultado:', { newMechanic })
      
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

