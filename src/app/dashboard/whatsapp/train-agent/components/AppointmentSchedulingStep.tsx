'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Calendar, Settings, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AppointmentSchedulingStepProps {
  data: {
    auto_schedule_appointments?: boolean
    require_human_approval?: boolean
    appointment_rules?: {
      min_advance_hours?: number
      max_advance_days?: number
      buffer_minutes?: number
      max_appointments_per_day?: number
      max_appointments_per_week?: number
      blocked_dates?: string[]
    }
  }
  onChange: (data: any) => void
}

export function AppointmentSchedulingStep({ data, onChange }: AppointmentSchedulingStepProps) {
  // Asegurar que solo se inicialice en el cliente
  const [isClient, setIsClient] = useState(false)
  const [autoSchedule, setAutoSchedule] = useState(false)
  const [requireApproval, setRequireApproval] = useState(false)
  const [appointmentRules, setAppointmentRules] = useState({
    min_advance_hours: 24,
    max_advance_days: 30,
    buffer_minutes: 30,
    max_appointments_per_day: 10,
    max_appointments_per_week: 50,
    blocked_dates: [] as string[]
  })

  // Inicializar en el cliente
  useEffect(() => {
    setIsClient(true)
    setAutoSchedule(data.auto_schedule_appointments ?? false)
    setRequireApproval(data.require_human_approval ?? false)
    setAppointmentRules({
      min_advance_hours: data.appointment_rules?.min_advance_hours ?? 24,
      max_advance_days: data.appointment_rules?.max_advance_days ?? 30,
      buffer_minutes: data.appointment_rules?.buffer_minutes ?? 30,
      max_appointments_per_day: data.appointment_rules?.max_appointments_per_day ?? 10,
      max_appointments_per_week: data.appointment_rules?.max_appointments_per_week ?? 50,
      blocked_dates: data.appointment_rules?.blocked_dates ?? []
    })
  }, [])

  // Sincronizar con props cuando cambian
  useEffect(() => {
    if (data.auto_schedule_appointments !== undefined) {
      setAutoSchedule(data.auto_schedule_appointments)
    }
    if (data.require_human_approval !== undefined) {
      setRequireApproval(data.require_human_approval)
    }
    if (data.appointment_rules) {
      setAppointmentRules(prev => ({
        min_advance_hours: data.appointment_rules?.min_advance_hours ?? prev.min_advance_hours,
        max_advance_days: data.appointment_rules?.max_advance_days ?? prev.max_advance_days,
        buffer_minutes: data.appointment_rules?.buffer_minutes ?? prev.buffer_minutes,
        max_appointments_per_day: data.appointment_rules?.max_appointments_per_day ?? prev.max_appointments_per_day,
        max_appointments_per_week: data.appointment_rules?.max_appointments_per_week ?? prev.max_appointments_per_week,
        blocked_dates: data.appointment_rules?.blocked_dates ?? prev.blocked_dates
      }))
    }
  }, [data])

  // Función helper para actualizar y notificar cambios
  const updateAndNotify = (updates: Partial<{
    auto_schedule_appointments: boolean
    require_human_approval: boolean
    appointment_rules: typeof appointmentRules
  }>) => {
    const newData = {
      auto_schedule_appointments: updates.auto_schedule_appointments ?? autoSchedule,
      require_human_approval: updates.require_human_approval ?? requireApproval,
      appointment_rules: updates.appointment_rules ?? appointmentRules
    }
    onChange(newData)
  }

  const handleAutoScheduleChange = (checked: boolean) => {
    setAutoSchedule(checked)
    updateAndNotify({ auto_schedule_appointments: checked })
  }

  const handleRequireApprovalChange = (checked: boolean) => {
    setRequireApproval(checked)
    updateAndNotify({ require_human_approval: checked })
  }

  const handleRuleChange = (field: keyof typeof appointmentRules, value: number | string[]) => {
    const newRules = { ...appointmentRules, [field]: value }
    setAppointmentRules(newRules)
    updateAndNotify({ appointment_rules: newRules })
  }

  // No renderizar hasta que esté en el cliente
  if (!isClient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">Cargando...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toggle Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamiento de Citas
          </CardTitle>
          <CardDescription>
            Configura cómo el bot manejará las solicitudes de citas desde WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle: Permitir agendar citas */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50 pb-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="auto-schedule-switch" className="text-base font-medium text-text-primary cursor-pointer">
                Permitir agendar citas desde WhatsApp
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Si está activo, los clientes podrán solicitar citas directamente desde el chat
              </p>
            </div>
            <div className="flex-shrink-0 min-w-[44px]">
              <Switch
                id="auto-schedule-switch"
                checked={autoSchedule}
                onCheckedChange={handleAutoScheduleChange}
                className="relative z-10 opacity-100"
                style={{ minWidth: '44px', minHeight: '24px' }}
              />
            </div>
          </div>

          {/* Toggle: Requiere aprobación humana */}
          {autoSchedule && (
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="require-approval-switch" className="text-base font-medium text-text-primary cursor-pointer">
                  Requiere aprobación humana
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Si está activo, las citas quedan como solicitud pendiente hasta que las apruebes
                </p>
              </div>
              <div className="flex-shrink-0 min-w-[44px]">
                <Switch
                  id="require-approval-switch"
                  checked={requireApproval}
                  onCheckedChange={handleRequireApprovalChange}
                  className="relative z-10 opacity-100"
                  style={{ minWidth: '44px', minHeight: '24px' }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reglas de Agendamiento */}
      {autoSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Reglas de Agendamiento
            </CardTitle>
            <CardDescription>
              Configura las reglas y restricciones para el agendamiento automático de citas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Los servicios disponibles se configuran en el Paso 2 y los horarios de atención en el Paso 1. Estas reglas controlan cómo se agendan las citas.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_advance_hours">Tiempo mínimo de anticipación (horas)</Label>
                <Input
                  id="min_advance_hours"
                  type="number"
                  min="0"
                  value={appointmentRules.min_advance_hours}
                  onChange={(e) => handleRuleChange('min_advance_hours', parseInt(e.target.value) || 0)}
                  placeholder="24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo de horas antes de la cita (ej: 24 = 1 día)
                </p>
              </div>

              <div>
                <Label htmlFor="max_advance_days">Tiempo máximo de anticipación (días)</Label>
                <Input
                  id="max_advance_days"
                  type="number"
                  min="1"
                  value={appointmentRules.max_advance_days}
                  onChange={(e) => handleRuleChange('max_advance_days', parseInt(e.target.value) || 0)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo de días que se pueden agendar con anticipación
                </p>
              </div>

              <div>
                <Label htmlFor="buffer_minutes">Tiempo entre citas (minutos)</Label>
                <Input
                  id="buffer_minutes"
                  type="number"
                  min="0"
                  value={appointmentRules.buffer_minutes}
                  onChange={(e) => handleRuleChange('buffer_minutes', parseInt(e.target.value) || 0)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tiempo de buffer entre citas para limpieza/preparación
                </p>
              </div>

              <div>
                <Label htmlFor="max_appointments_per_day">Límite de citas por día</Label>
                <Input
                  id="max_appointments_per_day"
                  type="number"
                  min="1"
                  value={appointmentRules.max_appointments_per_day}
                  onChange={(e) => handleRuleChange('max_appointments_per_day', parseInt(e.target.value) || 0)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número máximo de citas que se pueden agendar en un día
                </p>
              </div>

              <div>
                <Label htmlFor="max_appointments_per_week">Límite de citas por semana</Label>
                <Input
                  id="max_appointments_per_week"
                  type="number"
                  min="1"
                  value={appointmentRules.max_appointments_per_week}
                  onChange={(e) => handleRuleChange('max_appointments_per_week', parseInt(e.target.value) || 0)}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número máximo de citas que se pueden agendar en una semana
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

