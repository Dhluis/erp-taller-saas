'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Send, Save, Bot, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  functionsCalled?: string[]
}

interface PreviewTestStepProps {
  data: any
  onSave: () => void
  loading: boolean
}

export function PreviewTestStep({ data, onSave, loading }: PreviewTestStepProps) {
  const { organization } = useAuth()
  const [testMessages, setTestMessages] = useState<TestMessage[]>([
    { 
      role: 'assistant', 
      content: data.personality?.greeting_style || '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ])
  const [testInput, setTestInput] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [testMessages, isTyping])
  
  const sendTestMessage = async () => {
    if (!testInput.trim() || isTesting) return
    
    const userMessage = testInput.trim()
    setTestInput('')
    setIsTesting(true)
    setIsTyping(true)
    
    // Agregar mensaje del usuario
    const userMsg: TestMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setTestMessages(prev => [...prev, userMsg])
    
    // Simular delay de "escribiendo..."
    await new Promise(resolve => setTimeout(resolve, 800))
    
    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          message: userMessage,
          organizationId: organization?.organization_id,
          // ✅ Enviar todos los datos del formulario para crear configuración temporal
          businessInfo: data.businessInfo,
          services: data.services,
          policies: data.policies,
          personality: data.personality,
          faq: data.faq,
          customInstructions: data.customInstructions,
          escalationRules: data.escalationRules
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data) {
          const assistantMsg: TestMessage = {
            role: 'assistant',
            content: result.data.response || 'Lo siento, no pude procesar tu mensaje.',
            timestamp: new Date(),
            functionsCalled: result.data.functionsCalled || []
          }
          
          setTestMessages(prev => [...prev, assistantMsg])
          
          // Mostrar toast si se llamaron funciones
          if (result.data.functionsCalled && result.data.functionsCalled.length > 0) {
            toast.success(`Bot ejecutó: ${result.data.functionsCalled.join(', ')}`)
          }
        } else {
          throw new Error(result.error || 'Error en la respuesta')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al procesar mensaje')
      }
    } catch (error) {
      console.error('Error testing agent:', error)
      
      // Detectar si el error es por configuración faltante
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const isConfigError = errorMessage.includes('no está configurado') || 
                          errorMessage.includes('no configurado') ||
                          errorMessage.includes('no está habilitado')
      
      // Mostrar mensaje de error más amigable
      let errorContent = ''
      if (isConfigError) {
        errorContent = `⚠️ **Agente no configurado**\n\nEl AI Agent aún no está configurado para tu organización. Por favor, completa todos los pasos del formulario y guarda la configuración antes de probar el agente.\n\n💡 **Sugerencia:** Asegúrate de haber completado:\n• Información del negocio\n• Servicios\n• Personalidad del bot\n• Preguntas frecuentes\n\nUna vez guardada la configuración, podrás probar el agente aquí.`
        toast.error('Agente no configurado', {
          description: 'Completa y guarda la configuración antes de probar',
          duration: 5000
        })
      } else {
        errorContent = `⚠️ **Error al procesar mensaje**\n\n${errorMessage}\n\nPor favor, verifica que el AI Agent esté configurado correctamente.`
        toast.error('Error al procesar mensaje', {
          description: errorMessage,
          duration: 5000
        })
      }
      
      const errorMsg: TestMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      
      setTestMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTesting(false)
      setIsTyping(false)
    }
  }
  
  const handleSuggestedMessage = (msg: string) => {
    setTestInput(msg)
    // Auto-enviar después de un breve delay
    setTimeout(() => {
      sendTestMessage()
    }, 100)
  }
  
  const clearChat = () => {
    setTestMessages([
      { 
        role: 'assistant', 
        content: data.personality?.greeting_style || '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      }
    ])
  }
  
  // Mensajes sugeridos basados en la configuración
  const suggestedMessages = [
    'Hola',
    '¿Cuánto cuesta un cambio de aceite?',
    '¿Tienen disponible mañana?',
    '¿Qué horario tienen?',
    ...(data.services?.length > 0 
      ? [`¿Cuánto cuesta ${data.services[0]?.name}?`]
      : []
    ),
    'Necesito una cita urgente'
  ].slice(0, 6)
  
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
          <dl className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-start">
              <dt className="font-semibold text-text-primary">Nombre del taller:</dt>
              <dd className="text-text-secondary text-right">{data.businessInfo?.name || 'No configurado'}</dd>
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
              <dd className="text-text-secondary text-right">
                {(data.policies?.payment_methods || []).length > 0 
                  ? data.policies.payment_methods.join(', ')
                  : 'No configurados'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      
      {/* Chat de prueba mejorado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>🧪 Probar el Asistente</CardTitle>
              <CardDescription>
                Envía mensajes para ver cómo responderá tu bot en tiempo real
              </CardDescription>
            </div>
            {testMessages.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="border-2 border-primary/50 text-text-primary hover:bg-primary/10 hover:border-primary"
              >
                Limpiar chat
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Chat messages container */}
          <div 
            ref={chatContainerRef}
            className="border border-border rounded-lg p-4 h-96 overflow-y-auto bg-bg-secondary space-y-4 mb-4 scroll-smooth"
          >
            {testMessages.map((msg, i) => (
              <div 
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div className="flex flex-col max-w-[75%]">
                  <div 
                    className={`px-4 py-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                        : 'bg-bg-primary border border-border text-text-primary rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  
                  {/* Metadata */}
                  <div className={`flex items-center gap-2 mt-1 text-xs text-text-secondary ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>
                      {msg.timestamp.toLocaleTimeString('es-MX', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {msg.functionsCalled && msg.functionsCalled.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        🔧 {msg.functionsCalled.join(', ')}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Indicador de "escribiendo..." */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-bg-primary border border-border px-4 py-3 rounded-lg rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                    <span className="text-sm text-text-secondary">El bot está escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="flex gap-2">
            <Input 
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isTesting) {
                  e.preventDefault()
                  sendTestMessage()
                }
              }}
              placeholder="Escribe un mensaje de prueba..."
              disabled={isTesting}
              className="flex-1"
            />
            <Button 
              onClick={sendTestMessage}
              disabled={isTesting || !testInput.trim()}
              size="default"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Mensajes sugeridos */}
          <div className="mt-4">
            <p className="text-sm text-text-secondary mb-2 font-medium">💡 Prueba con estos mensajes:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedMessages.map((msg, idx) => (
                <Button 
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedMessage(msg)}
                  disabled={isTesting}
                  type="button"
                  className="text-xs border-2 border-primary/50 text-text-primary hover:bg-primary/10 hover:border-primary"
                >
                  {msg}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Info */}
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-text-secondary">
              💡 <strong>Tip:</strong> Este chat se conecta al endpoint de prueba del AI Agent. 
              Las respuestas son generadas en tiempo real usando la configuración que has establecido.
            </p>
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
