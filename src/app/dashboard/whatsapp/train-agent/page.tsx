'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { ProgressBar } from './components/ProgressBar'
import { WhatsAppSetupStep } from './components/WhatsAppSetupStep'
import { BusinessInfoStep } from './components/BusinessInfoStep'
import { ServicesStep } from './components/ServicesStep'
import { PoliciesStep } from './components/PoliciesStep'
import { PersonalityStep } from './components/PersonalityStep'
import { FAQStep } from './components/FAQStep'
import { CustomInstructionsStep } from './components/CustomInstructionsStep'
import { PreviewTestStep } from './components/PreviewTestStep'
import { AppointmentSchedulingStep } from './components/AppointmentSchedulingStep'
import { WhatsAppTwilioStatus } from '@/components/WhatsAppTwilioStatus'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/lib/context/SessionContext'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function TrainAgentPage() {
  const { organization } = useAuth()
  const { organizationId, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    businessInfo: {
      name: organization?.name || '',
      address: organization?.address || '',
      phone: organization?.phone || '',
      email: organization?.email || '',
      businessHours: {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '09:00', end: '14:00' },
        sunday: null
      }
    },
    services: [],
    policies: {
      payment_methods: ['Efectivo', 'Tarjeta'],
      cancellation_policy: 'Cancelación con 24h de anticipación',
      warranty: '30 días de garantía en servicios',
      warranty_policy: '30 días de garantía en servicios', // Compatibilidad
      deposit_required: false,
      deposit_percentage: 30,
      insurance_accepted: false
    },
    personality: {
      tone: 'profesional',
      language: 'es',
      emoji_usage: 'moderate', // Compatibilidad
      use_emojis: false,
      local_phrases: false,
      greeting_style: ''
    },
    faq: [],
    customInstructions: '',
    escalationRules: {
      keywords_to_escalate: [],
      max_messages_before_escalate: 10
    },
    appointmentScheduling: {
      auto_schedule_appointments: false,
      require_human_approval: false,
      appointment_rules: {
        min_advance_hours: 24,
        max_advance_days: 30,
        buffer_minutes: 30,
        max_appointments_per_day: 10,
        max_appointments_per_week: 50,
        blocked_dates: []
      }
    }
  })

  const handleSave = async () => {
    if (sessionLoading) {
      // Evitar mostrar error mientras se obtiene la sesión
      return
    }

    if (!organizationId) {
      toast.error('No se encontró la organización')
      return
    }

    setLoading(true)
    try {
      // 🔍 Log para debugging antes de guardar
      console.log('🔍 [Wizard] Payload antes de guardar:', {
        organization_id: organizationId
      })

      // Construir payload
      const payload: any = {
        businessInfo: formData.businessInfo,
        services: formData.services,
        policies: formData.policies,
        personality: formData.personality,
        faq: formData.faq,
        customInstructions: formData.customInstructions,
        escalationRules: formData.escalationRules,
        appointmentScheduling: formData.appointmentScheduling
      }

      // Guardar configuración en ai_agent_config
      const response = await fetch(`/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Error al guardar configuración'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar configuración')
      }

      toast.success('Configuración del agente guardada exitosamente')
      
      console.log('[Wizard] ✅ Configuración guardada exitosamente, resultado:', {
        success: result.success,
        has_data: !!result.data,
        data_id: result.data?.id
      })
      
      // ✅ Disparar evento personalizado para que la página de WhatsApp recargue
      console.log('[Wizard] 🔔 Disparando evento ai-agent:config-saved')
      window.dispatchEvent(new CustomEvent('ai-agent:config-saved', { 
        detail: { configId: result.data?.id } 
      }))
      
      // ✅ Recargar la página después de 2 segundos para dar tiempo a que la BD se actualice
      console.log('[Wizard] ⏳ Esperando 2 segundos antes de recargar...')
      setTimeout(() => {
        console.log('[Wizard] 🔄 Recargando página...')
        window.location.href = '/dashboard/whatsapp'
      }, 2000)
    } catch (error) {
      console.error('Error saving config:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la configuración'
      toast.error(errorMessage, {
        description: 'Por favor, verifica que tengas permisos para guardar la configuración',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: data
    }))
  }

  // ✅ Cargar configuración existente al montar el componente
  useEffect(() => {
    if (!organizationId || sessionLoading) return

    const loadExistingConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp/config', {
          credentials: 'include',
          cache: 'no-store'
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // config loaded successfully
          }
        }
      } catch (error) {
        console.error('Error cargando configuración existente:', error)
        // No mostrar error al usuario, simplemente usar valores por defecto
      }
    }

    loadExistingConfig()
  }, [organizationId, sessionLoading])

  // Verificar webhook
  const handleVerifyWebhook = useCallback(async () => {
    if (!organizationId) {
      toast.error('No se encontró la organización')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/verify-webhook', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      })

      const data = await response.json()

      if (data.success) {
        console.log('🔍 Verificación del webhook:', data)

        if (!data.webhookConfigured) {
          toast.error('⚠️ Webhook no configurado', {
            description: 'El webhook no está configurado. Haz clic en "Actualizar Webhook"',
          })
        } else {
          toast.success('✅ Webhook configurado', {
            description: 'El webhook está funcionando correctamente',
          })
        }

        // Log detalles adicionales en consola
        console.log('Detalles del webhook:', {
          expectedUrl: data.expectedWebhookUrl,
          currentWebhooks: data.currentWebhooks,
          sessionStatus: data.sessionStatus,
          advice: data.advice
        })
      } else {
        toast.error('Error al verificar webhook', {
          description: data.error || 'Error desconocido'
        })
      }
    } catch (error: any) {
      console.error('Error verificando webhook:', error)
      toast.error('Error', {
        description: 'No se pudo verificar el webhook'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Actualizar webhook
  const handleUpdateWebhook = useCallback(async () => {
    if (!organizationId) {
      toast.error('No se encontró la organización')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/session?action=update_webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('✅ Webhook actualizado', {
          description: data.message || 'El webhook ha sido actualizado exitosamente'
        })
      } else {
        toast.error('Error al actualizar webhook', {
          description: data.error || 'Error desconocido'
        })
      }
    } catch (error: any) {
      console.error('Error actualizando webhook:', error)
      toast.error('Error', {
        description: 'No se pudo actualizar el webhook'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Manejar cambio de estado de WhatsApp
  const handleWhatsAppStatusChange = useCallback(async (status: 'loading' | 'connected' | 'pending' | 'error') => {
    if (status === 'connected') {
      try {
        // Obtener información de la sesión conectada
        const sessionResponse = await fetch('/api/whatsapp/session')
        const sessionData = await sessionResponse.json()

        // Verificar que sessionData existe y tiene la estructura correcta
        if (!sessionData || !sessionData.success) {
          console.warn('No se pudo obtener información de la sesión:', sessionData);
          return;
        }

        // El phone puede estar en sessionData.data.phone, sessionData.phone, o sessionData.data?.phone
        const phone = sessionData.data?.phone || sessionData.phone || null;
        const isConnected = sessionData.connected === true || 
                           sessionData.status === 'WORKING' ||
                           sessionData.data?.status === 'connected' ||
                           sessionData.data?.sessionStatus === 'WORKING';

        if (isConnected && phone) {
          // Guardar número de teléfono en la configuración del AI agent
          const configResponse = await fetch('/api/whatsapp/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({
              whatsapp_phone: phone,
              whatsapp_connected: true
            })
          })

          const configResult = await configResponse.json()

          if (configResult.success) {
            toast.success('WhatsApp vinculado exitosamente')
          } else {
            console.error('Error guardando configuración de WhatsApp:', configResult.error)
            toast.error('Error al vincular WhatsApp: ' + (configResult.error || 'Error desconocido'))
          }
        } else {
          console.warn('Sesión no está completamente conectada o no tiene teléfono:', {
            isConnected,
            phone,
            sessionData
          });
        }
      } catch (error) {
        console.error('Error al guardar configuración de WhatsApp:', error)
        toast.error('Error al guardar la configuración de WhatsApp')
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto p-6">
        <StandardBreadcrumbs
          currentPage="Entrenar Agente"
          parentPages={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'WhatsApp', href: '/dashboard/whatsapp' }
          ]}
        />

        <h1 className="text-3xl font-bold mb-8 text-text-primary mt-6">
          Configuración de WhatsApp
        </h1>

        {/* Sección: Conexión de WhatsApp */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">
            Conexión de WhatsApp
          </h2>
          <WhatsAppTwilioStatus
            onStatusChange={handleWhatsAppStatusChange}
            darkMode={true}
            className="mb-6"
          />
          
          {/* Botones de verificación y actualización de webhook (solo en desarrollo o para debugging) */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG === 'true') && (
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleVerifyWebhook} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                🔍 Verificar Webhook
              </Button>
              <Button 
                onClick={handleUpdateWebhook} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                🔧 Actualizar Webhook
              </Button>
            </div>
          )}
        </div>

        {/* Sección: Entrenamiento del Bot */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">
            Entrena tu Asistente de WhatsApp
          </h2>
        </div>
        
        {/* Progress Bar */}
        <ProgressBar currentStep={step} totalSteps={9} />
        
        {/* Wizard Steps */}
        <div className="mt-8">
          {step === 1 && (
            <WhatsAppSetupStep />
          )}
          {step === 2 && (
            <BusinessInfoStep 
              data={formData.businessInfo} 
              onChange={(data) => updateFormData('businessInfo', data)} 
            />
          )}
          {step === 3 && (
            <ServicesStep 
              data={formData.services} 
              onChange={(data) => updateFormData('services', data)} 
            />
          )}
          {step === 4 && (
            <PoliciesStep 
              data={formData.policies} 
              onChange={(data) => updateFormData('policies', data)} 
            />
          )}
          {step === 5 && (
            <PersonalityStep 
              data={formData.personality} 
              onChange={(data) => updateFormData('personality', data)} 
            />
          )}
          {step === 6 && (
            <FAQStep 
              data={formData.faq} 
              onChange={(data) => updateFormData('faq', data)} 
            />
          )}
          {step === 7 && (
            <CustomInstructionsStep 
              data={{
                customInstructions: formData.customInstructions,
                escalationRules: formData.escalationRules
              }}
              onChange={(data) => {
                updateFormData('customInstructions', data.customInstructions)
                updateFormData('escalationRules', data.escalationRules)
              }} 
            />
          )}
          {step === 8 && (
            <AppointmentSchedulingStep 
              data={formData.appointmentScheduling} 
              onChange={(data) => updateFormData('appointmentScheduling', data)} 
            />
          )}
          {step === 9 && (
            <PreviewTestStep 
              data={formData} 
              onSave={handleSave}
              loading={loading}
            />
          )}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            variant="outline"
          >
            ← Anterior
          </Button>
          
          {step < 9 && (
            <Button 
              onClick={() => {
                // El paso 1 siempre puede continuar ya que solo usamos servidor compartido
                setStep(Math.min(9, step + 1))
              }}
            >
              Siguiente →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

