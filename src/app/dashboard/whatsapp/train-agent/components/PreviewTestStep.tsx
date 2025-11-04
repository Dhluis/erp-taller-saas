'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Send, Save } from 'lucide-react'

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
}

interface PreviewTestStepProps {
  data: any
  onSave: () => void
  loading: boolean
}

export function PreviewTestStep({ data, onSave, loading }: PreviewTestStepProps) {
  const [testMessages, setTestMessages] = useState<TestMessage[]>([
    { 
      role: 'user', 
      content: 'Hola' 
    },
    { 
      role: 'assistant', 
      content: data.personality?.greeting_style || '¡Hola! ¿En qué puedo ayudarte?' 
    }
  ])
  const [testInput, setTestInput] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  
  const sendTestMessage = async () => {
    if (!testInput.trim()) return
    
    setIsTesting(true)
    const userMsg = testInput
    setTestInput('')
    
    // Agregar mensaje del usuario
    setTestMessages(prev => [...prev, { 
      role: 'user', 
      content: userMsg 
    }])
    
    // Simular respuesta del bot
    try {
      const response = await fetch('/api/whatsapp/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          config: data
        })
      })
      
      if (response.ok) {
        const { reply } = await response.json()
        
        setTestMessages(prev => [...prev, { 
          role: 'assistant', 
          content: reply || 'Lo siento, no pude procesar tu mensaje. Por favor, intenta de nuevo.' 
        }])
      } else {
        // Respuesta simulada si el endpoint no existe todavía
        setTestMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `¡Hola! Gracias por tu mensaje: "${userMsg}". En un entorno real, el bot respondería basándose en la configuración que has establecido.` 
        }])
      }
    } catch (error) {
      console.error('Error testing agent:', error)
      // Respuesta simulada en caso de error
      setTestMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Entendí tu mensaje: "${userMsg}". El bot está configurado para responder según tus políticas y servicios.` 
      }])
    } finally {
      setIsTesting(false)
    }
  }
  
  const handleSuggestedMessage = (msg: string) => {
    setTestInput(msg)
  }
  
  return (
    <div className="space-y-6">
      
      {/* Resumen de configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Configuración Completa
          </CardTitle>
          <CardDescription>
            Revisa que todo esté correcto antes de guardar
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <dl className="space-y-3">
            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Nombre del taller:</dt>
              <dd className="text-text-secondary">{data.businessInfo?.name || 'No configurado'}</dd>
            </div>
            
            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Servicios configurados:</dt>
              <dd className="text-text-secondary">
                <Badge variant="secondary">
                  {data.services?.length || 0} servicios
                </Badge>
              </dd>
            </div>
            
            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Tono del bot:</dt>
              <dd className="text-text-secondary capitalize">{data.personality?.tone || 'profesional'}</dd>
            </div>
            
            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Preguntas frecuentes:</dt>
              <dd className="text-text-secondary">
                <Badge variant="secondary">
                  {data.faq?.length || 0} preguntas
                </Badge>
              </dd>
            </div>

            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Emojis:</dt>
              <dd className="text-text-secondary">
                {data.personality?.use_emojis ? 'Sí 😊' : 'No'}
              </dd>
            </div>

            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Métodos de pago:</dt>
              <dd className="text-text-secondary">
                {(data.policies?.payment_methods || []).length > 0 
                  ? data.policies.payment_methods.join(', ')
                  : 'No configurados'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      
      {/* Chat de prueba */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Probar el Asistente</CardTitle>
          <CardDescription>
            Envía mensajes para ver cómo responderá tu bot
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Chat messages */}
          <div className="border border-border rounded-lg p-4 h-96 overflow-y-auto bg-bg-secondary space-y-3 mb-4">
            {testMessages.map((msg, i) => (
              <div 
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-bg-primary border border-border text-text-primary'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isTesting && (
              <div className="flex justify-start">
                <div className="bg-bg-primary border border-border px-4 py-2 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></div>
                    <div 
                      className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" 
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div 
                      className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" 
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input */}
          <div className="flex gap-2">
            <Input 
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isTesting && sendTestMessage()}
              placeholder="Escribe un mensaje de prueba..."
              disabled={isTesting}
            />
            <Button 
              onClick={sendTestMessage}
              disabled={isTesting || !testInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mensajes de prueba sugeridos */}
          <div className="mt-4">
            <p className="text-sm text-text-secondary mb-2">Prueba con:</p>
            <div className="flex flex-wrap gap-2">
              {[
                '¿Cuánto cuesta un cambio de aceite?',
                '¿Tienen disponible mañana?',
                '¿Qué horario tienen?',
                'Necesito una emergencia'
              ].map(msg => (
                <Button 
                  key={msg}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedMessage(msg)}
                  type="button"
                >
                  {msg}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button 
          onClick={onSave}
          size="lg"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
      
    </div>
  )
}
