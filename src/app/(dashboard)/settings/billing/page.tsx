'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Check, X, Crown, Zap, TrendingDown, AlertCircle, Settings, Loader2, ChevronDown } from 'lucide-react'
import { useBilling } from '@/hooks/useBilling'
import { PRICING, FEATURES, detectUserCountry, getPricingByCountry, type CountryCode } from '@/lib/billing/constants'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { CurrencySelectorGlobal } from '@/components/currency/CurrencySelectorGlobal'

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
    question: '¿Cómo funciona el plan Free?',
    answer: 'El plan Free es gratuito para siempre. Incluye hasta 20 clientes, 20 órdenes por mes, 30 productos en inventario y 2 usuarios. Sin tarjeta de crédito. Cuando quieras más capacidad o funciones Premium (WhatsApp, asistente IA, reportes avanzados, etc.), puedes actualizar en cualquier momento.',
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

import { useCurrencyConverter } from '@/lib/utils/currency-converter'

export default function BillingPage() {
  const searchParams = useSearchParams()
  const { plan, usage, isLoading } = useBilling()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCanceled, setShowCanceled] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)
  const [userCountry, setUserCountry] = useState<CountryCode>('US')
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false)
  const { toast } = useToast()
  
  // Conversión dinámica
  const { selectedCurrency, convertUSD, formatLocalCurrency } = useCurrencyConverter()
  const monthlyLocal = convertUSD(PRICING.monthly.amount, selectedCurrency)
  const annualLocal = convertUSD(PRICING.annual.amount, selectedCurrency)
  const isUSD = selectedCurrency === 'USD'

  useEffect(() => {
    const detected = detectUserCountry()
    setUserCountry(detected)
  }, [])

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

  const handleCheckout = async (planType: 'monthly' | 'annual') => {
    setIsLoadingCheckout(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planType, country: userCountry }),
      })
      const data = await response.json()
      console.log("[Billing] Respuesta Checkout:", data)
      if (!response.ok) throw new Error(data.error || 'Error al crear sesión de pago')
      
      // Si hubo fallback (Stripe forzó USD por error en el ID de Pesos)
      if (data.fallback) {
        toast({
          title: 'Aviso de Moneda',
          description: `Stripe ha redirigido a dólares debido a: ${data.error || 'Inconsistencia en el perfil'}. No te preocupes, puedes pagar normalmente.`,
          variant: 'default',
        })
        // Dar tiempo al usuario para leer el toast antes de redirigir
        setTimeout(() => { if (data.url) window.location.href = data.url }, 4000)
        return
      }

      if (data.url) window.location.href = data.url
      else throw new Error('No se recibió URL de checkout')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar el pago'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoadingCheckout(false)
    }
  }

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

      {/* Header + Selector de moneda */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Planes y Suscripciones
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-medium h-5 animate-pulse">
              📍 Detectado: {userCountry}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tu plan y métodos de pago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Divisa:</span>
          <CurrencySelectorGlobal />
        </div>
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
                className="border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500 transition-transform duration-200 hover:scale-[1.03]"
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Abriendo portal...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
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
        <Card className={cn(
          "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
          !isPremium 
            ? "border-2 border-primary ring-1 ring-primary/20 shadow-primary/5 shadow-xl" 
            : "border-border/60 hover:border-primary/30"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle>Plan Free</CardTitle>
              </div>
              {!isPremium && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">PLAN ACTUAL</Badge>}
            </div>
            <div className="mt-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/siempre</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ideal para mini-talleres que recién comienzan.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {FEATURES.free.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 group/feat">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center group-hover/feat:bg-blue-500/20 transition-colors">
                    <Check className="h-3 w-3 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
              {/* No incluídos */}
              <div className="pt-4 space-y-3 border-t border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-1">No incluido</p>
                {FEATURES.premium_only.map((feature, i) => (
                  <li key={`not-${i}`} className="flex items-start gap-3 opacity-40">
                    <X className="mt-0.5 h-3 w-3 text-red-500/70 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground line-through decoration-red-500/20">{feature}</span>
                  </li>
                ))}
              </div>
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
              <div className={cn(
                "group relative border-2 border-emerald-500/40 rounded-2xl p-6 transition-all duration-300",
                "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent",
                "hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10"
              )}>
                <div className="absolute -top-3 left-6">
                  <Badge className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 px-3 py-1 shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
                    ¡AHORRA 31%!
                  </Badge>
                </div>
                
                <div className="mt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-foreground tracking-tight">
                        {isUSD ? PRICING.annual.displayPrice.split(' ')[0] : formatLocalCurrency(annualLocal, selectedCurrency)}
                      </span>
                      <span className="text-foreground/70 font-medium">{PRICING.annual.displayInterval}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                      <TrendingDown className="h-4 w-4" />
                      <span>
                        ¡Ahorra {PRICING.annual.savings.percentage}% y obtén meses gratis!
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right sm:text-right">
                    <p className="text-xs text-muted-foreground">
                      Monto base
                    </p>
                    <p className="text-sm font-bold text-foreground/80">
                      {PRICING.annual.displayPrice}
                    </p>
                    <p className="text-[10px] text-foreground/50 italic mt-1">
                      (Solo ${PRICING.annual.monthlyEquivalent} USD/mes)
                    </p>
                  </div>
                </div>

                {!isPremium && (
                  <Button
                    onClick={() => handleCheckout('annual')}
                    disabled={isLoadingCheckout}
                    size="lg"
                    className={cn(
                      "w-full mt-6 h-14 text-lg font-bold transition-all duration-300 group-hover:scale-[1.02] shadow-xl",
                      "bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400",
                      "text-white border-0 shadow-emerald-500/20"
                    )}
                  >
                    {isLoadingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5 fill-white" />
                        Obtener Plan Anual
                      </>
                    )}
                  </Button>
                )}
              </div>


              {/* Plan Mensual */}
              <div className="border border-border rounded-lg p-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                       {isUSD ? PRICING.monthly.displayPrice.split(' ')[0] : formatLocalCurrency(monthlyLocal, selectedCurrency)}
                    </span>
                    <span className="text-foreground/70">{PRICING.monthly.displayInterval}</span>
                  </div>
                  {!isUSD && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Cobro base: {PRICING.monthly.displayPrice}
                    </p>
                  )}
                </div>
                <p className="text-xs text-foreground/60 mt-1">
                  Facturación mensual
                </p>
                {!isPremium && (
                  <Button
                    onClick={() => handleCheckout('monthly')}
                    disabled={isLoadingCheckout}
                    variant="outline"
                    size="lg"
                    className="w-full mt-4 min-h-[3.75rem] text-lg px-6 py-4 border-primary text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    {isLoadingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Suscribirse - {PRICING.monthly.displayPrice}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {!isPremium && (
              <p className="text-xs text-muted-foreground mt-2">
                💳 Pago procesado por Stripe
              </p>
            )}
            {/* Features */}
            <ul className="space-y-3 pt-4 border-t">
              {FEATURES.premium.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 group/feat">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover/feat:bg-emerald-500/20 transition-colors">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium">{feature.replace('✅ ', '')}</span>
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
