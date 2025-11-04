'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sparkles } from 'lucide-react'

interface PersonalityStepProps {
  data: any
  onChange: (data: any) => void
}

export function PersonalityStep({ data, onChange }: PersonalityStepProps) {
  const updatePersonality = (field: string, value: any) => {
    onChange({
      ...data,
      personality: {
        ...data.personality,
        [field]: value
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎨 Personalidad del Asistente</CardTitle>
        <CardDescription>
          Define cómo se comunicará el bot con tus clientes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Tono */}
        <div>
          <Label>Tono de voz *</Label>
          <RadioGroup 
            value={data.personality?.tone || 'profesional'}
            onValueChange={(value) => updatePersonality('tone', value)}
            className="mt-2 space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-bg-secondary transition-colors">
              <RadioGroupItem value="formal" id="formal" className="mt-1" />
              <Label htmlFor="formal" className="flex-1 cursor-pointer">
                <strong className="text-text-primary">Formal</strong>
                <p className="text-sm text-text-secondary mt-1">
                  "Buenos días. ¿En qué puedo asistirle hoy?"
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-bg-secondary transition-colors">
              <RadioGroupItem value="profesional" id="profesional" className="mt-1" />
              <Label htmlFor="profesional" className="flex-1 cursor-pointer">
                <strong className="text-text-primary">Profesional</strong>
                <p className="text-sm text-text-secondary mt-1">
                  "Hola, ¿cómo puedo ayudarte?"
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-bg-secondary transition-colors">
              <RadioGroupItem value="amigable" id="amigable" className="mt-1" />
              <Label htmlFor="amigable" className="flex-1 cursor-pointer">
                <strong className="text-text-primary">Amigable / Casual</strong>
                <p className="text-sm text-text-secondary mt-1">
                  "¡Hola! 👋 ¿Qué onda? ¿En qué te puedo ayudar?"
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Uso de emojis */}
        <div>
          <Label>¿Usar emojis?</Label>
          <div className="flex items-center gap-4 mt-2">
            <Switch 
              checked={data.personality?.use_emojis || false}
              onCheckedChange={(checked) => updatePersonality('use_emojis', checked)}
            />
            <span className="text-sm text-text-secondary">
              {data.personality?.use_emojis ? 'Sí 😊' : 'No'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Los emojis hacen la conversación más amigable
          </p>
        </div>
        
        {/* Frases locales */}
        <div>
          <Label>¿Usar modismos o frases locales?</Label>
          <div className="flex items-center gap-4 mt-2">
            <Switch 
              checked={data.personality?.local_phrases || false}
              onCheckedChange={(checked) => updatePersonality('local_phrases', checked)}
            />
            <span className="text-sm text-text-secondary">
              {data.personality?.local_phrases ? 'Sí' : 'No'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Ejemplo: "¿Qué onda?", "Sale", "Órale"
          </p>
        </div>
        
        {/* Idioma */}
        <div>
          <Label>Idioma</Label>
          <div className="flex items-center gap-4 mt-2">
            <RadioGroup 
              value={data.personality?.language || 'es'}
              onValueChange={(value) => updatePersonality('language', value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="es" id="lang-es" />
                <Label htmlFor="lang-es" className="cursor-pointer">Español</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en" id="lang-en" />
                <Label htmlFor="lang-en" className="cursor-pointer">Inglés</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {/* Saludo personalizado */}
        <div>
          <Label>Mensaje de saludo inicial</Label>
          <Textarea 
            value={data.personality?.greeting_style || ''}
            onChange={(e) => updatePersonality('greeting_style', e.target.value)}
            placeholder="¡Hola! Bienvenido a Taller Los Reyes. ¿En qué puedo ayudarte hoy?"
            rows={3}
            className="mt-2"
          />
          <p className="text-sm text-text-secondary mt-1">
            Este será el primer mensaje que verán los clientes
          </p>
        </div>
        
        {/* Preview en tiempo real */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Vista previa</AlertTitle>
          <AlertDescription>
            <div className="mt-2 p-3 bg-bg-secondary rounded-lg border border-border">
              <p className="text-sm text-text-primary">
                {data.personality?.greeting_style || "¡Hola! ¿En qué puedo ayudarte?"}
              </p>
            </div>
          </AlertDescription>
        </Alert>
        
      </CardContent>
    </Card>
  )
}
