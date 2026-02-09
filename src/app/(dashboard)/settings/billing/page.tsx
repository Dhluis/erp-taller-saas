'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, Crown, Zap, TrendingDown, AlertCircle } from 'lucide-react'
import { UpgradeButton } from '@/components/billing/upgrade-button'
import { useBilling } from '@/hooks/useBilling'
import { PRICING, FEATURES } from '@/lib/billing/constants'
import { useSearchParams } from 'next/navigation'

export default function BillingPage() {
  const searchParams = useSearchParams()
  const { plan, usage, isLoading } = useBilling()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCanceled, setShowCanceled] = useState(false)

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
        <h1 className="text-3xl font-bold">Planes y Facturación</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu suscripción y métodos de pago
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
              <Badge variant="default">ACTIVO</Badge>
            </div>
            <CardDescription>
              {plan.current_period_end && (
                <>Próxima renovación: {new Date(plan.current_period_end).toLocaleDateString('es-MX')}</>
              )}
            </CardDescription>
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
              <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50 relative">
                <Badge className="absolute -top-3 left-4 bg-green-500">
                  ¡AHORRA 31%!
                </Badge>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold">{PRICING.annual.displayPrice}</span>
                  <span className="text-muted-foreground">/año</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-green-700">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{PRICING.annual.savings.monthsFree}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Equivalente a ${PRICING.annual.monthlyEquivalent.toFixed(2)} USD/mes
                </p>
                {!isPremium && (
                  <UpgradeButton plan="annual" className="w-full mt-4" />
                )}
              </div>

              {/* Plan Mensual */}
              <div className="border rounded-lg p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{PRICING.monthly.displayPrice}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Facturación mensual
                </p>
                {!isPremium && (
                  <UpgradeButton plan="monthly" variant="outline" className="w-full mt-4" />
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

      {/* FAQ o Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">¿Puedo cambiar de plan en cualquier momento?</h4>
            <p className="text-sm text-muted-foreground">
              Sí, puedes actualizar o cancelar tu suscripción cuando quieras. Los cambios se aplicarán en el próximo período de facturación.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">¿Qué sucede si cancelo mi suscripción?</h4>
            <p className="text-sm text-muted-foreground">
              Mantendrás acceso a Premium hasta el final de tu período pagado, luego volverás automáticamente al plan Free.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">¿Aceptan otros métodos de pago?</h4>
            <p className="text-sm text-muted-foreground">
              Actualmente aceptamos todas las tarjetas de crédito y débito principales a través de Stripe.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
