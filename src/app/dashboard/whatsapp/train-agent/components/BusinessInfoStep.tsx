'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BusinessInfoStepProps {
  data: any
  onChange: (data: any) => void
}

export function BusinessInfoStep({ data, onChange }: BusinessInfoStepProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const updateBusinessHours = (day: string, field: string, value: string) => {
    onChange({
      ...data,
      businessHours: {
        ...data.businessHours,
        [day]: data.businessHours[day] 
          ? { ...data.businessHours[day], [field]: value }
          : { start: '09:00', end: '18:00', [field]: value }
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Negocio</CardTitle>
        <CardDescription>
          Configura los datos básicos de tu taller para que el asistente pueda responder correctamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nombre del Taller</Label>
            <Input
              id="name"
              value={data.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Mi Taller Automotriz"
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={data.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+52 55 1234 5678"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="contacto@taller.com"
          />
        </div>

        <div>
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={data.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Calle, Colonia, Ciudad"
          />
        </div>

        <div>
          <Label className="mb-4 block">Horarios de Atención</Label>
          <div className="space-y-3">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
              const dayNames: Record<string, string> = {
                monday: 'Lunes',
                tuesday: 'Martes',
                wednesday: 'Miércoles',
                thursday: 'Jueves',
                friday: 'Viernes',
                saturday: 'Sábado',
                sunday: 'Domingo'
              }
              const hours = data.businessHours?.[day]
              const isClosed = !hours

              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24">
                    <Label>{dayNames[day]}</Label>
                  </div>
                  {isClosed ? (
                    <div className="flex-1">
                      <span className="text-text-secondary">Cerrado</span>
                      <button
                        type="button"
                        onClick={() => updateBusinessHours(day, 'start', '09:00')}
                        className="ml-4 text-sm text-primary hover:underline"
                      >
                        Abrir
                      </button>
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
                      <button
                        type="button"
                        onClick={() => updateBusinessHours(day, null, null)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Cerrar
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}





