'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
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
import { WhatsAppQRConnectorSimple as WhatsAppQRConnector } from '@/components/WhatsAppQRConnectorSimple'
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
    wahaConfig: {
      waha_config_type: 'shared' as 'shared' | 'custom',
      waha_api_url: undefined as string | undefined,
      waha_api_key: undefined as string | undefined
    },
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
      // ✅ Determinar credenciales de WAHA según el tipo elegido
      let wahaApiUrl: string | undefined
      let wahaApiKey: string | undefined

      if (formData.wahaConfig.waha_config_type === 'custom') {
        // Usar credenciales personalizadas del formulario
        if (!formData.wahaConfig.waha_api_url || !formData.wahaConfig.waha_api_key) {
          toast.error('Faltan credenciales de WAHA personalizadas. Por favor, completa todos los campos.')
          return
        }
        wahaApiUrl = formData.wahaConfig.waha_api_url
        wahaApiKey = formData.wahaConfig.waha_api_key
      } else {
        // Usar servidor compartido (variables de entorno)
        // Nota: Las variables de entorno se manejan en el backend
        wahaApiUrl = undefined // El backend usará process.env
        wahaApiKey = undefined // El backend usará process.env
      }

      // Guardar configuración en ai_agent_config
      const response = await fetch(`/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          waha_config_type: formData.wahaConfig.waha_config_type,
          waha_api_url: wahaApiUrl,
          waha_api_key: wahaApiKey,
          businessInfo: formData.businessInfo,
          services: formData.services,
          policies: formData.policies,
          personality: formData.personality,
          faq: formData.faq,
          customInstructions: formData.customInstructions,
          escalationRules: formData.escalationRules,
          appointmentScheduling: formData.appointmentScheduling
        })
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
      
      // ✅ Disparar evento personalizado para que la página de WhatsApp recargue
      window.dispatchEvent(new CustomEvent('ai-agent:config-saved'))
      
      // ✅ Recargar la página después de 1 segundo para mostrar la configuración actualizada
      setTimeout(() => {
        window.location.reload()
      }, 1000)
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
            const config = result.data
            const policies = config.policies || {}
            
            // Cargar configuración de WAHA desde policies
            if (policies.waha_config_type) {
              setFormData(prev => ({
                ...prev,
                wahaConfig: {
                  waha_config_type: policies.waha_config_type || 'shared',
                  waha_api_url: policies.waha_api_url || undefined,
                  waha_api_key: policies.waha_api_key || undefined
                }
              }))
            }
          }
        }
      } catch (error) {
        console.error('Error cargando configuración existente:', error)
        // No mostrar error al usuario, simplemente usar valores por defecto
      }
    }

    loadExistingConfig()
  }, [organizationId, sessionLoading])

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
          <WhatsAppQRConnector
            onStatusChange={handleWhatsAppStatusChange}
            darkMode={true}
            className="mb-6"
          />
        </div>

        {/* Separador */}
        <div className="border-t border-border my-8"></div>

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
            <WhatsAppSetupStep 
              data={formData.wahaConfig} 
              onChange={(data) => updateFormData('wahaConfig', data)} 
            />
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
                // Validar antes de avanzar
                if (step === 1) {
                  // Validar paso de WAHA
                  const canContinue = formData.wahaConfig.waha_config_type === 'shared' || 
                    (formData.wahaConfig.waha_config_type === 'custom' && 
                     formData.wahaConfig.waha_api_url && 
                     formData.wahaConfig.waha_api_key &&
                     formData.wahaConfig.waha_api_url.startsWith('https://'))
                  
                  if (!canContinue) {
                    toast.error('Por favor, completa la configuración de WAHA antes de continuar')
                    return
                  }
                }
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

