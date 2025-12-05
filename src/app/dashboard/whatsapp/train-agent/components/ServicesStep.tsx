'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Trash2, Plus, Lightbulb, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/integrations/whatsapp/utils/supabase-helpers'
import { toast } from 'sonner'

interface Service {
  name: string
  price_range: string
  duration: string
  description: string
}

interface ServicesStepProps {
  data: Service[]
  onChange: (data: Service[]) => void
}

export function ServicesStep({ data, onChange }: ServicesStepProps) {
  const { organization } = useAuth()
  const [services, setServices] = useState<Service[]>(data || [])

  useEffect(() => {
    if (data) {
      setServices(data)
    }
  }, [data])

  const addService = () => {
    const newService: Service = {
      name: '',
      price_range: '',
      duration: '',
      description: ''
    }
    const updated = [...services, newService]
    setServices(updated)
    onChange(updated)
  }

  const removeService = (index: number) => {
    const newServices = services.filter((_, i) => i !== index)
    setServices(newServices)
    onChange(newServices)
  }

  const updateService = (index: number, field: keyof Service, value: string) => {
    const newServices = [...services]
    newServices[index][field] = value
    setServices(newServices)
    onChange(newServices)
  }

  const importServicesFromSystem = async () => {
    if (!organization?.organization_id) {
      toast.error('No se encontró la organización')
      return
    }

    try {
      const supabase = getSupabaseClient()
      
      // Intentar buscar servicios en diferentes fuentes
      let systemServices: any[] = []

      // 1. Buscar en tabla services si existe
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('name, price, duration_minutes, description')
        .eq('organization_id', organization.organization_id)
        .limit(20)

      if (!servicesError && servicesData) {
        systemServices = servicesData
      }

      // 2. Si no hay servicios, buscar en work_order_items para obtener servicios comunes
      if (systemServices.length === 0) {
        const { data: orderItems, error: itemsError } = await supabase
          .from('work_order_items')
          .select('description, price')
          .eq('organization_id', organization.organization_id)
          .not('description', 'is', null)
          .limit(20)

        if (!itemsError && orderItems) {
          // Agrupar por descripción y obtener precios promedio
          const serviceMap = new Map<string, { price: number; count: number }>()
          orderItems.forEach((item: any) => {
            const name = item.description?.split('\n')[0] || item.description
            if (name) {
              const existing = serviceMap.get(name) || { price: 0, count: 0 }
              serviceMap.set(name, {
                price: existing.price + (item.price || 0),
                count: existing.count + 1
              })
            }
          })

          systemServices = Array.from(serviceMap.entries()).map(([name, data]) => ({
            name,
            price: data.count > 0 ? data.price / data.count : 0,
            duration_minutes: 60, // Default
            description: ''
          }))
        }
      }

      // 3. Si aún no hay servicios, buscar en inventory_items con categoría de servicio
      if (systemServices.length === 0) {
        const { data: inventoryItems, error: invError } = await supabase
          .from('inventory_items')
          .select('name, price, category_id')
          .eq('organization_id', organization.organization_id)
          .not('price', 'is', null)
          .limit(20)

        if (!invError && inventoryItems) {
          systemServices = inventoryItems
            .filter((item: any) => item.price > 0)
            .map((item: any) => ({
              name: item.name || '',
              price: item.price || 0,
              duration_minutes: 60,
              description: ''
            }))
        }
      }

      if (systemServices.length === 0) {
        toast.info('No se encontraron servicios registrados en el sistema. Puedes agregarlos manualmente.')
        return
      }

      // Convertir servicios del sistema al formato del wizard
      const importedServices: Service[] = systemServices.map((s: any) => ({
        name: s.name || '',
        price_range: s.price ? `$${Math.round(s.price)}` : '',
        duration: s.duration_minutes ? `${s.duration_minutes} minutos` : '60 minutos',
        description: s.description || ''
      }))

      // Agregar servicios importados (sin duplicar nombres)
      const existingNames = new Set(services.map(s => s.name.toLowerCase().trim()))
      const newServices = importedServices.filter(s => 
        s.name && s.name.trim() && !existingNames.has(s.name.toLowerCase().trim())
      )

      if (newServices.length === 0) {
        toast.info('Todos los servicios disponibles ya están agregados')
        return
      }

      const updated = [...services, ...newServices]
      setServices(updated)
      onChange(updated)
      toast.success(`Se importaron ${newServices.length} servicios`)
    } catch (error) {
      console.error('Error importando servicios:', error)
      toast.error('Error al importar servicios. Puedes agregarlos manualmente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔧 Servicios que Ofreces</CardTitle>
        <CardDescription>
          Lista todos los servicios de tu taller con precios estimados
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Botón para importar servicios existentes */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>💡 Sugerencia</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Puedes importar servicios que ya tienes registrados en el sistema</span>
            <Button 
              variant="link" 
              onClick={importServicesFromSystem}
              className="ml-2"
            >
              Importar desde mi inventario →
            </Button>
          </AlertDescription>
        </Alert>
        
        {/* Lista de servicios */}
        {services.map((service, index) => (
          <div key={index} className="border border-border rounded-lg p-4 space-y-4 bg-bg-secondary">
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
                  placeholder="$300 - $800"
                />
              </div>
              
              <div>
                <Label>Duración estimada *</Label>
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
                  placeholder="Incluye filtro y mano de obra"
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
        
        {services.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Agrega al menos 3 servicios para que el bot pueda ayudar mejor a los clientes
            </AlertDescription>
          </Alert>
        )}
        
      </CardContent>
    </Card>
  )
}
