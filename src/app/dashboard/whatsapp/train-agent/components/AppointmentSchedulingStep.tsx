'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Trash2, Plus, Calendar, Clock } from 'lucide-react'

interface Service {
  name: string
  description: string
  duration: string
  price_range: string
}

interface AppointmentSchedulingStepProps {
  data: {
    auto_schedule_appointments?: boolean
    require_human_approval?: boolean
    services?: Service[]
    business_hours?: Record<string, { start: string; end: string } | null>
  }
  onChange: (data: any) => void
}

export function AppointmentSchedulingStep({ data, onChange }: AppointmentSchedulingStepProps) {
  // Asegurar que solo se inicialice en el cliente
  const [isClient, setIsClient] = useState(false)
  const [autoSchedule, setAutoSchedule] = useState(false)
  const [requireApproval, setRequireApproval] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [businessHours, setBusinessHours] = useState<Record<string, { start: string; end: string } | null>>({
    monday: { start: '09:00', end: '18:00' },
    tuesday: { start: '09:00', end: '18:00' },
    wednesday: { start: '09:00', end: '18:00' },
    thursday: { start: '09:00', end: '18:00' },
    friday: { start: '09:00', end: '18:00' },
    saturday: { start: '09:00', end: '14:00' },
    sunday: null
  })

  // Inicializar en el cliente
  useEffect(() => {
    setIsClient(true)
    setAutoSchedule(data.auto_schedule_appointments ?? false)
    setRequireApproval(data.require_human_approval ?? false)
    setServices(data.services || [])
    setBusinessHours(data.business_hours || {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null
    })
  }, [])

  // Sincronizar con props cuando cambian
  useEffect(() => {
    if (data.services) {
      setServices(data.services)
    }
    if (data.business_hours) {
      setBusinessHours(data.business_hours)
    }
    if (data.auto_schedule_appointments !== undefined) {
      setAutoSchedule(data.auto_schedule_appointments)
    }
    if (data.require_human_approval !== undefined) {
      setRequireApproval(data.require_human_approval)
    }
  }, [data])

  // Función helper para actualizar y notificar cambios
  const updateAndNotify = (updates: Partial<{
    auto_schedule_appointments: boolean
    require_human_approval: boolean
    services: Service[]
    business_hours: Record<string, { start: string; end: string } | null>
  }>) => {
    const newData = {
      auto_schedule_appointments: updates.auto_schedule_appointments ?? autoSchedule,
      require_human_approval: updates.require_human_approval ?? requireApproval,
      services: updates.services ?? services,
      business_hours: updates.business_hours ?? businessHours
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

  const addService = () => {
    const newService: Service = {
      name: '',
      description: '',
      duration: '',
      price_range: ''
    }
    const newServices = [...services, newService]
    setServices(newServices)
    updateAndNotify({ services: newServices })
  }

  const removeService = (index: number) => {
    const newServices = services.filter((_, i) => i !== index)
    setServices(newServices)
    updateAndNotify({ services: newServices })
  }

  const updateService = (index: number, field: keyof Service, value: string) => {
    const newServices = [...services]
    newServices[index][field] = value
    setServices(newServices)
    updateAndNotify({ services: newServices })
  }

  const updateBusinessHours = (day: string, field: string | null, value: string | null) => {
    let newBusinessHours: Record<string, { start: string; end: string } | null>
    if (field === null) {
      // Cerrar el día
      newBusinessHours = {
        ...businessHours,
        [day]: null
      }
    } else {
      // Actualizar hora
      newBusinessHours = {
        ...businessHours,
        [day]: {
          ...(businessHours[day] || { start: '09:00', end: '18:00' }),
          [field]: value || ''
        }
      }
    }
    setBusinessHours(newBusinessHours)
    updateAndNotify({ business_hours: newBusinessHours })
  }

  const dayNames: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
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

      {/* Servicios Disponibles */}
      {autoSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Servicios Disponibles</CardTitle>
            <CardDescription>
              Lista los servicios que los clientes pueden agendar con sus precios y duraciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((service, index) => (
              <div key={`service-${index}-${service.name || 'new'}`} className="border border-border rounded-lg p-4 space-y-4 bg-bg-secondary">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-text-primary">Servicio #{index + 1}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService(index)}
                    className="text-text-primary hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nombre del servicio *</Label>
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      placeholder="Cambio de aceite"
                    />
                  </div>

                  <div>
                    <Label>Rango de precio *</Label>
                    <Input
                      value={service.price_range}
                      onChange={(e) => updateService(index, 'price_range', e.target.value)}
                      placeholder="$300 - $600"
                    />
                  </div>

                  <div>
                    <Label>Duración *</Label>
                    <Input
                      value={service.duration}
                      onChange={(e) => updateService(index, 'duration', e.target.value)}
                      placeholder="30 minutos"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Descripción (opcional)</Label>
                    <Textarea
                      value={service.description}
                      onChange={(e) => updateService(index, 'description', e.target.value)}
                      placeholder="Incluye aceite sintético y filtro"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addService}
              className="w-full border-2 border-primary/50 text-text-primary hover:bg-primary/10 hover:border-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar servicio
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Horarios de Atención */}
      {autoSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios de Atención
            </CardTitle>
            <CardDescription>
              Define los horarios en los que los clientes pueden agendar citas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.keys(dayNames).map((day) => {
                const hours = businessHours[day]
                const isClosed = !hours

                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-24">
                      <Label>{dayNames[day]}</Label>
                    </div>
                    {isClosed ? (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-text-secondary">Cerrado</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateBusinessHours(day, 'start', '09:00')}
                          className="border-2 border-primary/50 text-text-primary hover:bg-primary/10 hover:border-primary"
                        >
                          Abrir
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          type="time"
                          value={hours?.start || '09:00'}
                          onChange={(e) => updateBusinessHours(day, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-text-secondary">-</span>
                        <Input
                          type="time"
                          value={hours?.end || '18:00'}
                          onChange={(e) => updateBusinessHours(day, 'end', e.target.value)}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateBusinessHours(day, null, null)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Cerrar
                        </Button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

