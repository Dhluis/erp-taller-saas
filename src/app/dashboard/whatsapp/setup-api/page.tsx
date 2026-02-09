'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Check,
  Loader2,
  Phone,
  MessageSquare,
  Bot,
  Share2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { ProgressBar } from '../train-agent/components/ProgressBar'
import { BusinessInfoStep } from '../train-agent/components/BusinessInfoStep'
import { ServicesStep } from '../train-agent/components/ServicesStep'
import { PoliciesStep } from '../train-agent/components/PoliciesStep'
import { PersonalityStep } from '../train-agent/components/PersonalityStep'
import { FAQStep } from '../train-agent/components/FAQStep'
import { CustomInstructionsStep } from '../train-agent/components/CustomInstructionsStep'
import { PreviewTestStep } from '../train-agent/components/PreviewTestStep'
import { AppointmentSchedulingStep } from '../train-agent/components/AppointmentSchedulingStep'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/lib/context/SessionContext'
import { useToast } from '@/components/ui/use-toast'

type ActivationStatus = 'idle' | 'activating' | 'success' | 'error'

export default function SetupApiPage() {
  const { organization } = useAuth()
  const { organizationId, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [activationStatus, setActivationStatus] = useState<ActivationStatus>('idle')
  const [activatedNumber, setActivatedNumber] = useState<string | null>(null)
  const [activationError, setActivationError] = useState<string | null>(null)

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
      warranty_policy: '30 días de garantía en servicios',
      deposit_required: false,
      deposit_percentage: 30,
      insurance_accepted: false
    },
    personality: {
      tone: 'profesional',
      language: 'es',
      emoji_usage: 'moderate',
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

  // Check if already activated on mount
  useEffect(() => {
    if (!organizationId || sessionLoading) return

    const checkExistingConfig = async () => {
      try {
        const res = await fetch('/api/messaging/config')
        const data = await res.json()
        if (data.config?.whatsapp_api_provider === 'twilio' && data.config?.whatsapp_api_number) {
          setActivationStatus('success')
          setActivatedNumber(data.config.whatsapp_api_number)
          // If already activated, skip to step 2
          if (step === 1) setStep(2)
        }
      } catch (error) {
        console.error('Error checking config:', error)
      }
    }

    checkExistingConfig()
  }, [organizationId, sessionLoading])

  // Load existing bot config
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
            // Pre-fill form with existing config if available
            const config = result.data
            if (config.business_info) {
              setFormData(prev => ({ ...prev, businessInfo: { ...prev.businessInfo, ...config.business_info } }))
            }
          }
        }
      } catch (error) {
        console.error('Error loading existing config:', error)
      }
    }

    loadExistingConfig()
  }, [organizationId, sessionLoading])

  const handleActivate = async () => {
    setActivationStatus('activating')
    setActivationError(null)
    try {
      const res = await fetch('/api/messaging/activate-premium', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setActivationStatus('success')
        setActivatedNumber(data.data?.phone_number || null)
        toast({
          title: 'Número activado',
          description: `Tu número profesional: ${data.data?.phone_number || 'Activado'}`,
        })
      } else {
        setActivationStatus('error')
        const userMessage = data.error?.includes('Twilio') || data.error?.includes('credentials')
          ? 'Esta función no está disponible en este momento. Contacta a soporte@eaglessystem.io para habilitarla.'
          : data.error?.includes('números disponibles')
          ? 'No hay números disponibles para tu país en este momento. Intenta más tarde.'
          : data.error || 'No se pudo activar. Intenta de nuevo.'
        setActivationError(userMessage)
      }
    } catch (error) {
      setActivationStatus('error')
      setActivationError('Error de conexión. Revisa tu internet e intenta de nuevo.')
    }
  }

  const handleSave = async () => {
    if (!organizationId) {
      toast({ title: 'Error', description: 'No se encontró la organización', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        waha_config_type: 'shared',
        businessInfo: formData.businessInfo,
        services: formData.services,
        policies: formData.policies,
        personality: formData.personality,
        faq: formData.faq,
        customInstructions: formData.customInstructions,
        escalationRules: formData.escalationRules,
        appointmentScheduling: formData.appointmentScheduling
      }

      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al guardar configuración')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar configuración')
      }

      toast({ title: 'Configuración guardada', description: 'Tu asistente de IA está listo.' })

      setTimeout(() => {
        window.location.href = '/dashboard/whatsapp'
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar'
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({ ...prev, [section]: data }))
  }

  const totalSteps = 9

  const stepLabels = [
    'Activar número',
    'Tu número',
    'Info del negocio',
    'Servicios',
    'Políticas',
    'Personalidad del bot',
    'Preguntas frecuentes',
    'Instrucciones',
    'Vista previa'
  ]

  const canGoNext = () => {
    if (step === 1) return activationStatus === 'success'
    return true
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto p-6">
        <StandardBreadcrumbs
          currentPage="Configurar API Oficial"
          parentPages={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'WhatsApp', href: '/dashboard/whatsapp' }
          ]}
        />

        <h1 className="text-3xl font-bold mb-2 text-text-primary mt-6">
          Configurar WhatsApp Profesional
        </h1>
        <p className="text-muted-foreground mb-8">
          Sigue los pasos para activar tu número profesional y entrenar tu asistente de IA
        </p>

        {/* Progress */}
        <div className="mb-2">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />
        </div>
        <p className="text-xs text-muted-foreground mb-8">
          {stepLabels[step - 1]}
        </p>

        {/* Wizard Steps */}
        <div className="mt-4">
          {/* Step 1: Activate Number */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-500" />
                  Paso 1: Activa tu número profesional
                </CardTitle>
                <CardDescription>
                  Se te asignará un número de WhatsApp Business dedicado con badge oficial verificado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* What you get */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Número dedicado</p>
                      <p className="text-xs text-muted-foreground">Un número exclusivo para tu negocio</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Badge oficial</p>
                      <p className="text-xs text-muted-foreground">Verificación de WhatsApp Business</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Mensajes ilimitados</p>
                      <p className="text-xs text-muted-foreground">Sin restricciones de envío</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Sin riesgo de bloqueo</p>
                      <p className="text-xs text-muted-foreground">Conexión oficial y segura</p>
                    </div>
                  </div>
                </div>

                {/* Activation button */}
                <div className="flex flex-col items-center gap-4 py-4">
                  {activationStatus === 'idle' && (
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8"
                      onClick={handleActivate}
                    >
                      <Building2 className="w-5 h-5 mr-2" />
                      Activar mi número profesional
                    </Button>
                  )}

                  {activationStatus === 'activating' && (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      <p className="text-sm text-muted-foreground">Activando tu número, esto toma aproximadamente 2 minutos...</p>
                    </div>
                  )}

                  {activationStatus === 'success' && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 w-full">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                      <p className="font-semibold text-green-700 dark:text-green-300">Número activado exitosamente</p>
                      {activatedNumber && (
                        <p className="text-2xl font-mono font-bold">{activatedNumber}</p>
                      )}
                      <p className="text-sm text-muted-foreground text-center">
                        Presiona "Siguiente" para continuar con la configuración de tu asistente.
                      </p>
                    </div>
                  )}

                  {activationStatus === 'error' && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 w-full">
                      <XCircle className="w-10 h-10 text-red-500" />
                      <p className="font-semibold text-red-700 dark:text-red-300">No se pudo activar</p>
                      <p className="text-sm text-muted-foreground text-center">{activationError}</p>
                      <Button variant="outline" onClick={handleActivate}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Intentar de nuevo
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Your number is ready */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-green-500" />
                  Paso 2: Tu número está listo
                </CardTitle>
                <CardDescription>
                  Tu número profesional de WhatsApp ya está activo. Aquí tienes lo que necesitas saber.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activatedNumber && (
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground mb-2">Tu número profesional</p>
                    <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-300">{activatedNumber}</p>
                    <Badge className="mt-3 bg-green-500 text-white">Activo</Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold">¿Qué hacer ahora?</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-sm font-bold flex-shrink-0">1</div>
                      <div>
                        <p className="font-medium text-sm">Comparte este número con tus clientes</p>
                        <p className="text-xs text-muted-foreground">Agrégalo a tu tarjeta de presentación, página web, redes sociales o directamente a tus clientes.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-sm font-bold flex-shrink-0">2</div>
                      <div>
                        <p className="font-medium text-sm">Entrena tu asistente de IA (siguiente paso)</p>
                        <p className="text-xs text-muted-foreground">Configura la información de tu negocio, servicios, políticas y personalidad del bot para que responda como tú quieres.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-sm font-bold flex-shrink-0">3</div>
                      <div>
                        <p className="font-medium text-sm">Revisa las conversaciones</p>
                        <p className="text-xs text-muted-foreground">Desde la sección "Conversaciones" podrás ver todas las interacciones de tus clientes con el asistente.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <AlertDescription>
                    Cuando un cliente escriba a este número, el asistente de IA responderá automáticamente según la configuración que hagas en los siguientes pasos.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Business Info */}
          {step === 3 && (
            <BusinessInfoStep
              data={formData.businessInfo}
              onChange={(data) => updateFormData('businessInfo', data)}
            />
          )}

          {/* Step 4: Services */}
          {step === 4 && (
            <ServicesStep
              data={formData.services}
              onChange={(data) => updateFormData('services', data)}
            />
          )}

          {/* Step 5: Policies */}
          {step === 5 && (
            <PoliciesStep
              data={formData.policies}
              onChange={(data) => updateFormData('policies', data)}
            />
          )}

          {/* Step 6: Personality */}
          {step === 6 && (
            <PersonalityStep
              data={formData.personality}
              onChange={(data) => updateFormData('personality', data)}
            />
          )}

          {/* Step 7: FAQ */}
          {step === 7 && (
            <FAQStep
              data={formData.faq}
              onChange={(data) => updateFormData('faq', data)}
            />
          )}

          {/* Step 8: Custom Instructions */}
          {step === 8 && (
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

          {/* Step 9: Preview */}
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
            onClick={() => {
              if (step === 1) {
                router.push('/dashboard/whatsapp')
              } else {
                setStep(Math.max(1, step - 1))
              }
            }}
            variant="outline"
          >
            {step === 1 ? '← Volver a WhatsApp' : '← Anterior'}
          </Button>

          {step < totalSteps && (
            <Button
              onClick={() => setStep(Math.min(totalSteps, step + 1))}
              disabled={!canGoNext()}
            >
              Siguiente →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
