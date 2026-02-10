'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Check, Crown, Zap, TrendingDown, AlertCircle, Settings, Loader2, ChevronDown } from 'lucide-react'
import { UpgradeButton } from '@/components/billing/upgrade-button'
import { useBilling } from '@/hooks/useBilling'
import { PRICING, FEATURES } from '@/lib/billing/constants'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const BILLING_FAQS = [
  {
    question: '¿Puedo cambiar de plan en cualquier momento?',
    answer: 'Sí, puedes actualizar o cancelar tu suscripción cuando quieras. Los cambios se aplicarán en el próximo período de facturación.',
  },
  {
    question: '¿Qué sucede si cancelo mi suscripción?',
    answer: 'Mantendrás acceso a Premium hasta el final de tu período pagado, luego volverás automáticamente al plan Free.',
  },
  {
    question: '¿Aceptan otros métodos de pago?',
    answer: 'Actualmente aceptamos todas las tarjetas de crédito y débito principales a través de Stripe.',
  },
  {
    question: '¿Cómo funciona el período de prueba de 7 días?',
    answer: 'Al crear tu cuenta tienes 7 días de trial con acceso a todas las funciones Premium. Al finalizar, si no te suscribes, pasarás al plan Free con sus límites. No se requiere tarjeta para probar.',
  },
  {
    question: '¿Puedo tener varios usuarios en mi taller?',
    answer: 'Sí. El plan Free incluye hasta 2 usuarios activos. Con Premium tienes usuarios ilimitados para tu equipo.',
  },
  {
    question: '¿Qué incluye el soporte prioritario?',
    answer: 'Prioridad en respuestas por email y canal dedicado. Incluye ayuda con configuración, integraciones y mejores prácticas para tu taller.',
  },
] as const

export default function BillingPage() {
  const searchParams = useSearchParams()
  const { plan, usage, isLoading } = useBilling()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCanceled, setShowCanceled] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
    if (searchParams.get('canceled') === 'true') {
      setShowCanceled(true)
      setTimeout(() => setShowCanceled(false), 5000)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando información de billing...</p>
        </div>
      </div>
    )
  }

  const isPremium = plan?.plan_tier === 'premium'
  const isActive = plan?.subscription_status === 'active'

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Alerts */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ¡Pago procesado exitosamente! Tu plan se actualizará en unos momentos.
          </AlertDescription>
        </Alert>
      )}

      {showCanceled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Pago cancelado. No se realizó ningún cargo.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Planes y Suscripciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu plan y métodos de pago
        </p>
      </div>

      {/* Plan Actual */}
      {isPremium && isActive && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle>Plan Premium Activo</CardTitle>
              </div>
              <Badge variant="success">ACTIVO</Badge>
            </div>
            <CardDescription>
              {plan.current_period_end && (
                <>Próxima renovación: {new Date(plan.current_period_end).toLocaleDateString('es-MX')}</>
              )}
            </CardDescription>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  setPortalLoading(true)
                  try {
                    const res = await fetch('/api/billing/portal', { method: 'POST' })
                    if (!res.ok) {
                      const data = await res.json()
                      throw new Error(data.error || 'Error al abrir el portal')
                    }
                    const { url } = await res.json()
                    if (url) window.location.href = url
                  } catch (e) {
                    const message = e instanceof Error ? e.message : 'Error al abrir el portal'
                    console.error('[Billing Portal]', e)
                    toast({ title: 'Error', description: message, variant: 'destructive' })
                    setPortalLoading(false)
                  }
                }}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Abriendo portal...
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Administrar Suscripción
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Comparación de Planes */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Plan Free */}
        <Card className={!isPremium ? 'border-2 border-primary' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <CardTitle>Plan Free</CardTitle>
              </div>
              {!isPremium && <Badge>ACTUAL</Badge>}
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground ml-2">para siempre</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FEATURES.free.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Plan Premium */}
        <Card className="border-2 border-yellow-400 relative overflow-hidden">
          {/* Badge "Más Popular" */}
          <div className="absolute top-4 right-4">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
              MÁS POPULAR
            </Badge>
          </div>

          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-2xl">Plan Premium</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pricing Tabs */}
            <div className="space-y-4">
              {/* Plan Anual */}
              <div className="border-2 border-emerald-500/60 rounded-lg p-4 bg-emerald-500/10 dark:bg-emerald-500/15 relative">
                <Badge className="absolute -top-3 left-4 bg-emerald-600 text-white border-0">
                  ¡AHORRA 31%!
                </Badge>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-foreground">{PRICING.annual.displayPrice}</span>
                  <span className="text-foreground/70">/año</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{PRICING.annual.savings.monthsFree}</span>
                </div>
                <p className="text-xs text-foreground/60 mt-1">
                  Equivalente a ${PRICING.annual.monthlyEquivalent.toFixed(2)} USD/mes
                </p>
                {!isPremium && (
                  <UpgradeButton plan="annual" size="lg" className="w-full mt-4 min-h-[3.75rem] text-lg px-6 py-4" />
                )}
              </div>

              {/* Plan Mensual */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{PRICING.monthly.displayPrice}</span>
                  <span className="text-foreground/70">/mes</span>
                </div>
                <p className="text-xs text-foreground/60 mt-1">
                  Facturación mensual
                </p>
                {!isPremium && (
                  <UpgradeButton plan="monthly" variant="outline" size="lg" className="w-full mt-4 min-h-[3.75rem] text-lg px-6 py-4 border-primary text-primary hover:bg-primary/10 hover:text-primary" />
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 pt-4 border-t">
              {FEATURES.premium.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Acordeón */}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
          <CardDescription>Haz clic en una pregunta para ver la respuesta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {BILLING_FAQS.map((faq, index) => {
              const isOpen = faqOpenIndex === index
              return (
                <div
                  key={index}
                  className={cn(
                    'rounded-lg border overflow-hidden transition-all duration-300',
                    isOpen
                      ? 'border-primary/40 shadow-sm shadow-primary/5'
                      : 'border-border hover:border-primary/20'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                    className={cn(
                      'flex w-full items-center justify-between gap-4 py-3.5 px-4 text-left transition-all duration-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                      isOpen
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/40 text-foreground'
                    )}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-trigger-${index}`}
                  >
                    <span className="font-medium pr-2">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 transition-transform duration-300',
                        isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${index}`}
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border/50 mx-4" />
                      <p className="text-sm text-muted-foreground py-3.5 px-4 leading-relaxed bg-muted/20">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
