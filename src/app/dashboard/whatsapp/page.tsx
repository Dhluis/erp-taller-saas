'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Check, 
  Smartphone,
  Building2,
  Info,
  CreditCard,
  Clock,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSession } from '@/lib/context/SessionContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useBilling } from '@/hooks/useBilling'
import { useLimitCheck } from '@/hooks/useLimitCheck'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

interface SubscriptionConfig {
  subscription_status: 'trial' | 'active' | 'expired' | 'none'
  trial_ends_at: string | null
  whatsapp_api_provider: 'waha' | 'twilio' | null
  whatsapp_api_number: string | null
  created_at: string
}

export default function WhatsAppPage() {
  const { organizationId } = useSession()
  const { toast } = useToast()
  const [config, setConfig] = useState<SubscriptionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMethod, setSelectedMethod] = useState<'waha' | 'twilio'>('waha')
  const [activating, setActivating] = useState(false)
  
  // ✅ Verificación de límites de plan
  const { canUseWhatsApp, plan, usage, isLoading: billingLoading } = useBilling()
  const { limitError, showUpgradeModal, handleApiError, closeUpgradeModal, showUpgrade } = useLimitCheck()
  
  useEffect(() => {
    if (!organizationId) return
    loadConfig()
  }, [organizationId])

  async function loadConfig() {
    try {
      const res = await fetch('/api/messaging/config')
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        if (data.config.whatsapp_api_provider) {
          setSelectedMethod(data.config.whatsapp_api_provider)
        }
      }
    } catch (error) {
      console.error('Error cargando config:', error)
    } finally {
      setLoading(false)
    }
  }

  const status = config?.subscription_status || 'none'
  const hasActiveSubscription = status === 'trial' || status === 'active'

  // Calcular días restantes si está en trial
  let daysLeft = 0
  if (status === 'trial' && config?.trial_ends_at) {
    const now = new Date()
    const endDate = new Date(config.trial_ends_at)
    const diffTime = endDate.getTime() - now.getTime()
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // ✅ Esperar a que carguen tanto la config como el billing para evitar parpadeo
  if (loading || billingLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Business</h1>
        <p className="text-muted-foreground">
          Configura tu asistente virtual con IA para atención automática
        </p>
      </div>

      {/* Subscription Status */}
      <div className="mb-6">
        {status === 'none' && canUseWhatsApp && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <span className="font-medium">Activa tu suscripción para usar WhatsApp</span>
              <p className="text-sm mt-1">
                $2,900 MXN/mes • Incluye 7 días de prueba gratis
              </p>
            </AlertDescription>
          </Alert>
        )}

        {status === 'trial' && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
            <Clock className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <span className="font-medium text-green-900 dark:text-green-100">
                🎁 Prueba gratis activa - {daysLeft} días restantes
              </span>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Disfruta todas las funciones sin costo. Facturación inicia después del período de prueba.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {status === 'active' && (
          <Badge className="bg-green-500 text-white">
            ✓ Suscripción Activa
          </Badge>
        )}

        {status === 'expired' && (
          <Alert variant="destructive">
            <AlertDescription>
              Tu prueba gratis ha finalizado. Reactiva tu suscripción para continuar usando WhatsApp.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content */}
      {!hasActiveSubscription && plan && !canUseWhatsApp ? (
        // Plan no permite WhatsApp — mostrar card de upgrade
        <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">WhatsApp Business</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                WhatsApp Business con IA no está disponible en tu plan {plan.plan_tier === 'free' ? 'Free' : 'actual'}. 
                Actualiza a Premium para habilitar esta funcionalidad.
              </p>
            </div>
            <Button 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-8 h-12 text-lg"
              onClick={() => {
                showUpgrade({
                  type: 'limit_exceeded',
                  resource: 'whatsapp_conversation',
                  message: `WhatsApp Business no está disponible en tu plan ${plan.plan_tier === 'free' ? 'Free' : 'actual'}. Actualiza a Premium para habilitar WhatsApp con IA.`,
                  feature: 'whatsapp_enabled',
                  upgrade_url: '/dashboard/billing',
                  plan_required: 'premium'
                })
              }}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Actualizar a Premium
            </Button>
          </CardContent>
        </Card>
      ) : !hasActiveSubscription && plan && canUseWhatsApp ? (
        // Plan permite WhatsApp pero no tiene suscripción activa
        <PricingCard onActivate={async () => {
          setActivating(true)
          try {
            const res = await fetch('/api/messaging/start-trial', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) {
              const isLimitError = await handleApiError({ status: res.status, ...data })
              if (isLimitError) {
                setActivating(false)
                return
              }
              throw new Error(data.error || 'No se pudo iniciar la prueba')
            }
            
            if (data.success) {
              toast({ title: '✅ Prueba gratis iniciada', description: 'Disfruta 7 días sin costo' })
              loadConfig()
            } else {
              toast({ title: 'Error', description: data.error || 'No se pudo iniciar la prueba', variant: 'destructive' })
            }
          } catch (error: any) {
            console.error('Error iniciando prueba:', error)
            toast({ title: 'Error', description: error.message || 'Error al iniciar prueba', variant: 'destructive' })
          } finally {
            setActivating(false)
          }
        }} activating={activating} />
      ) : (
        // Tiene suscripción - elegir método WhatsApp
        <Card>
          <CardHeader>
            <CardTitle>Configura tu WhatsApp</CardTitle>
            <CardDescription>
              Elige cómo quieres conectar WhatsApp con tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as 'waha' | 'twilio')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="waha">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mi Número Personal
                </TabsTrigger>
                <TabsTrigger value="twilio">
                  <Building2 className="w-4 h-4 mr-2" />
                  Número Profesional
                </TabsTrigger>
              </TabsList>

              <TabsContent value="waha" className="space-y-6">
                <WAHAOption 
                  isActive={config?.whatsapp_api_provider === 'waha'}
                  onActivate={() => {
                    // TODO: Mostrar QR para conectar WAHA
                    toast({ title: 'Info', description: 'Funcionalidad de QR próximamente' })
                  }}
                />
              </TabsContent>

              <TabsContent value="twilio" className="space-y-6">
                <TwilioOption 
                  isActive={config?.whatsapp_api_provider === 'twilio'}
                  phoneNumber={config?.whatsapp_api_number}
                  onActivate={async () => {
                    setActivating(true)
                    try {
                      const res = await fetch('/api/messaging/activate-premium', { method: 'POST' })
                      const data = await res.json()
                      if (data.success) {
                        toast({ 
                          title: '✅ API Oficial activada', 
                          description: `Número: ${data.data?.phone_number || 'Activado'}` 
                        })
                        loadConfig()
                      } else {
                        toast({ 
                          title: 'Error', 
                          description: data.error || 'No se pudo activar', 
                          variant: 'destructive' 
                        })
                      }
                    } catch (error) {
                      toast({ 
                        title: 'Error', 
                        description: 'Error al activar API Oficial', 
                        variant: 'destructive' 
                      })
                    } finally {
                      setActivating(false)
                    }
                  }}
                  activating={activating}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Comparison */}
      {hasActiveSubscription && (
        <Card className="mt-6 bg-slate-50 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg">¿Cuál opción elegir?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <ComparisonColumn
                title="Mi Número Personal (WAHA)"
                icon={<Smartphone className="w-5 h-5 text-blue-500" />}
                pros={[
                  'Usa tu número actual',
                  'Setup en 1 minuto (QR)',
                  'Sin costos adicionales',
                  'Ideal para comenzar'
                ]}
                cons={[
                  'Límite 100 mensajes/día',
                  'Pequeño riesgo de baneo',
                  'Requiere mantener WhatsApp abierto'
                ]}
              />
              <ComparisonColumn
                title="Número Profesional (API Oficial)"
                icon={<Building2 className="w-5 h-5 text-purple-500" />}
                pros={[
                  'Badge verificado oficial ✓',
                  'Mensajes ilimitados',
                  'Cero riesgo de bloqueo',
                  'Número dedicado profesional'
                ]}
                cons={[
                  'Toma ~2 minutos activar',
                  'Número nuevo para clientes'
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Modal de upgrade cuando WhatsApp no está habilitado */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitError={limitError || undefined}
        featureName="WhatsApp Business"
      />
    </div>
  )
}

function PricingCard({ onActivate, activating }: { onActivate: () => void, activating: boolean }) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">WhatsApp Business</CardTitle>
            <CardDescription>Asistente virtual con IA incluida</CardDescription>
          </div>
        </div>
        
        <div className="text-3xl font-bold">
          $2,900 <span className="text-lg font-normal text-muted-foreground">MXN/mes</span>
        </div>
        <p className="text-sm text-muted-foreground">
          7 días de prueba gratis • Cancela cuando quieras
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Feature text="IA avanzada para respuestas automáticas" />
          <Feature text="Historial completo de conversaciones" />
          <Feature text="Integración con órdenes de trabajo" />
          <Feature text="Notificaciones automáticas a clientes" />
          <Feature text="Soporte prioritario" />
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium mb-2">
            ✨ Después de activar, elige tu método preferido:
          </p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>• <strong>Número Personal:</strong> Conecta con QR (WAHA)</div>
            <div>• <strong>Número Profesional:</strong> API Oficial verificada</div>
          </div>
        </div>

        <Button 
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          onClick={onActivate}
          disabled={activating}
        >
          {activating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Iniciar Prueba Gratis
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          No se requiere tarjeta para la prueba gratis
        </p>
      </CardContent>
    </Card>
  )
}

function WAHAOption({ 
  isActive, 
  onActivate 
}: { 
  isActive: boolean
  onActivate: () => void 
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Smartphone className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Conecta tu número personal</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Usa tu WhatsApp actual escaneando un código QR. Setup en menos de 1 minuto.
          </p>
          
          {isActive ? (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium">Conectado y activo</span>
            </div>
          ) : (
            <Button variant="default" onClick={onActivate}>
              Conectar con QR
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium text-green-600">✅ Ventajas</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Setup instantáneo</li>
            <li>• Sin costo extra</li>
            <li>• Tu número actual</li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-yellow-600">⚠️ Consideraciones</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Límite 100 msg/día</li>
            <li>• Pequeño riesgo baneo</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function TwilioOption({ 
  isActive,
  phoneNumber,
  onActivate,
  activating
}: { 
  isActive: boolean
  phoneNumber: string | null
  onActivate: () => void
  activating: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
        <Building2 className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Número profesional con API Oficial</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Obtén un número WhatsApp Business verificado con badge oficial. Sin límites ni riesgos.
          </p>
          
          {isActive && phoneNumber ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">API Oficial Activa</span>
              </div>
              <div className="font-mono text-lg font-semibold">
                {phoneNumber}
              </div>
            </div>
          ) : (
            <Button 
              variant="default" 
              onClick={onActivate}
              disabled={activating}
            >
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                'Activar API Oficial'
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium text-green-600">✅ Ventajas</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Badge verificado ✓</li>
            <li>• Ilimitado</li>
            <li>• Cero riesgo bloqueo</li>
            <li>• Profesional</li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-blue-600">ℹ️ Consideraciones</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Toma ~2 min activar</li>
            <li>• Número nuevo</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function ComparisonColumn({ 
  title, 
  icon, 
  pros, 
  cons 
}: { 
  title: string
  icon: React.ReactNode
  pros: string[]
  cons: string[]
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-green-600 mb-2">Ventajas:</p>
          <ul className="space-y-1">
            {pros.map((pro, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                {pro}
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <p className="text-sm font-medium text-yellow-600 mb-2">Consideraciones:</p>
          <ul className="space-y-1">
            {cons.map((con, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <Info className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
