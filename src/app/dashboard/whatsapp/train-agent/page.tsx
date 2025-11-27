'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { ProgressBar } from './components/ProgressBar'
import { BusinessInfoStep } from './components/BusinessInfoStep'
import { ServicesStep } from './components/ServicesStep'
import { PoliciesStep } from './components/PoliciesStep'
import { PersonalityStep } from './components/PersonalityStep'
import { FAQStep } from './components/FAQStep'
import { CustomInstructionsStep } from './components/CustomInstructionsStep'
import { PreviewTestStep } from './components/PreviewTestStep'
import { WhatsAppQRConnector } from '@/components/WhatsAppQRConnector'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronUp, Settings, CheckCircle2, Loader2 } from 'lucide-react'

export default function TrainAgentPage() {
  const { organization } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [wahaConfig, setWahaConfig] = useState({
    waha_api_url: 'https://waha-erp-eagles-sistem.0rfifc.easypanel.host',
    waha_api_key: 'mi_clave_segura_2025'
  })
  const [savingWahaConfig, setSavingWahaConfig] = useState(false)
  const [wahaConfigSaved, setWahaConfigSaved] = useState(false)
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
    }
  })

  const handleSave = async () => {
    if (!organization?.organization_id) {
      toast.error('No se encontró la organización')
      return
    }

    setLoading(true)
    try {
      // Guardar configuración en ai_agent_config
      const response = await fetch(`/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInfo: formData.businessInfo,
          services: formData.services,
          policies: formData.policies,
          personality: formData.personality,
          faq: formData.faq,
          customInstructions: formData.customInstructions,
          escalationRules: formData.escalationRules
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
      // Pequeño delay para asegurar que la BD se actualice
      setTimeout(() => {
        router.push('/dashboard/whatsapp')
      }, 500)
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

  // Guardar configuración de WAHA
  const handleSaveWahaConfig = async () => {
    setSavingWahaConfig(true)
    setWahaConfigSaved(false)
    
    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waha_api_url: wahaConfig.waha_api_url.trim(),
          waha_api_key: wahaConfig.waha_api_key.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setWahaConfigSaved(true)
        toast.success('Configuración de servidor guardada exitosamente')
        setTimeout(() => setWahaConfigSaved(false), 3000)
      } else {
        throw new Error(data.error || 'Error al guardar configuración')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar configuración')
    } finally {
      setSavingWahaConfig(false)
    }
  }

  // Manejar cambio de estado de WhatsApp
  const handleWhatsAppStatusChange = useCallback(async (status: 'loading' | 'connected' | 'pending' | 'error') => {
    if (status === 'connected') {
      try {
        // Obtener información de la sesión conectada
        const sessionResponse = await fetch('/api/whatsapp/session')
        const sessionData = await sessionResponse.json()

        if (sessionData.success && sessionData.data.status === 'connected' && sessionData.data.phone) {
          // Guardar número de teléfono en la configuración del AI agent
          const configResponse = await fetch('/api/whatsapp/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              whatsapp_phone: sessionData.data.phone,
              whatsapp_connected: true
            })
          })

          const configResult = await configResponse.json()

          if (configResult.success) {
            toast.success('WhatsApp conectado y guardado en la configuración')
          } else {
            console.error('Error guardando configuración de WhatsApp:', configResult.error)
            toast.warning('WhatsApp conectado, pero hubo un error al guardar en la configuración')
          }
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
          
          {/* Configuración avanzada (colapsable) */}
          <Card className="mt-4 border-border">
            <div 
              className="cursor-pointer hover:bg-bg-secondary transition-colors"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
            >
              <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Configuración del servidor</CardTitle>
                </div>
                {showAdvancedConfig ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="text-xs mt-1">
                Solo necesitas configurar esto si tienes problemas de conexión
              </CardDescription>
              </CardHeader>
            </div>
            
            {showAdvancedConfig && (
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription className="text-sm">
                    Esta configuración es opcional. Solo configúrala si el sistema no puede conectarse automáticamente al servidor de WhatsApp.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="waha-url">URL del servidor</Label>
                    <Input
                      id="waha-url"
                      type="url"
                      value={wahaConfig.waha_api_url}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, waha_api_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waha-key">Clave de acceso</Label>
                    <Input
                      id="waha-key"
                      type="password"
                      value={wahaConfig.waha_api_key}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, waha_api_key: e.target.value }))}
                      placeholder="Ingresa la clave de acceso"
                    />
                  </div>

                  <Button
                    onClick={handleSaveWahaConfig}
                    disabled={savingWahaConfig || !wahaConfig.waha_api_url.trim() || !wahaConfig.waha_api_key.trim()}
                    className="w-full"
                    variant="outline"
                  >
                    {savingWahaConfig ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : wahaConfigSaved ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        Guardado
                      </>
                    ) : (
                      'Guardar configuración'
                    )}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
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
        <ProgressBar currentStep={step} totalSteps={7} />
        
        {/* Wizard Steps */}
        <div className="mt-8">
          {step === 1 && (
            <BusinessInfoStep 
              data={formData.businessInfo} 
              onChange={(data) => updateFormData('businessInfo', data)} 
            />
          )}
          {step === 2 && (
            <ServicesStep 
              data={formData.services} 
              onChange={(data) => updateFormData('services', data)} 
            />
          )}
          {step === 3 && (
            <PoliciesStep 
              data={formData.policies} 
              onChange={(data) => updateFormData('policies', data)} 
            />
          )}
          {step === 4 && (
            <PersonalityStep 
              data={formData.personality} 
              onChange={(data) => updateFormData('personality', data)} 
            />
          )}
          {step === 5 && (
            <FAQStep 
              data={formData.faq} 
              onChange={(data) => updateFormData('faq', data)} 
            />
          )}
          {step === 6 && (
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
          {step === 7 && (
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
          
          {step < 7 && (
            <Button 
              onClick={() => setStep(Math.min(7, step + 1))}
            >
              Siguiente →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

