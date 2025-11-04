'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface EscalationRules {
  keywords_to_escalate?: string[]
  max_messages_before_escalate?: number
}

interface CustomInstructionsStepProps {
  data: {
    customInstructions: string
    escalationRules: EscalationRules
  }
  onChange: (data: { customInstructions: string; escalationRules: EscalationRules }) => void
}

export function CustomInstructionsStep({ 
  data, 
  onChange 
}: CustomInstructionsStepProps) {
  const customInstructions = data.customInstructions || ''
  const escalationRules = data.escalationRules || {}

  const handleInstructionsChange = (value: string) => {
    onChange({
      customInstructions: value,
      escalationRules
    })
  }

  const handleEscalationChange = (field: keyof EscalationRules, value: any) => {
    onChange({
      customInstructions,
      escalationRules: {
        ...escalationRules,
        [field]: value
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Instrucciones Adicionales</CardTitle>
        <CardDescription>
          Reglas especiales o comportamientos específicos de tu taller
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        <div>
          <Label>Instrucciones personalizadas (opcional)</Label>
          <Textarea 
            value={customInstructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder={`Ejemplo:
- Siempre menciona que somos especialistas en autos americanos
- Si preguntan por autos europeos, recomienda nuestro taller hermano
- No aceptamos trabajos de pintura`}
            rows={8}
            className="font-mono text-sm mt-2"
          />
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ejemplos de instrucciones útiles</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>Mencionar promociones actuales</li>
              <li>Especialidades del taller</li>
              <li>Servicios que NO ofrecen</li>
              <li>Cómo manejar emergencias</li>
              <li>Referencias a otros talleres asociados</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {/* Reglas de escalamiento */}
        <div className="border-t border-border pt-6">
          <h3 className="font-semibold mb-4 text-text-primary">🚨 Cuándo pasar con un humano</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Palabras clave que activen escalamiento</Label>
              <Input 
                value={(escalationRules?.keywords_to_escalate || []).join(', ')}
                onChange={(e) => handleEscalationChange('keywords_to_escalate', 
                  e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean)
                )}
                placeholder="urgencia, emergencia, accidente, queja, enojado"
                className="mt-2"
              />
              <p className="text-sm text-text-secondary mt-1">
                Separa con comas. Si el cliente menciona estas palabras, el bot escalará a un humano.
              </p>
            </div>
            
            <div>
              <Label>Máximo de mensajes antes de escalar</Label>
              <Input 
                type="number"
                value={escalationRules?.max_messages_before_escalate || ''}
                onChange={(e) => handleEscalationChange('max_messages_before_escalate', 
                  parseInt(e.target.value) || 0
                )}
                placeholder="10"
                className="mt-2"
              />
              <p className="text-sm text-text-secondary mt-1">
                Si el bot no puede resolver después de X mensajes, escala a humano
              </p>
            </div>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}
