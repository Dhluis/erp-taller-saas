'use client'

import { useBilling } from '@/hooks/useBilling'
import { calculateUsagePercentage, isNearLimit, FEATURE_NAMES } from '@/types/billing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Crown, Zap, Loader2, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export function PlanUsage() {
  const { plan, usage, isLoading, error } = useBilling()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando plan...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error || !plan || !usage) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error?.message || 'Error al cargar información del plan'}
        </AlertDescription>
      </Alert>
    )
  }

  const isPremium = plan.plan_tier === 'premium'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isPremium ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Plan Premium
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 text-blue-500" />
                  Plan Free
                </>
              )}
            </CardTitle>
            <CardDescription>
              {plan.subscription_status === 'trial' && plan.trial_ends_at && (
                <>Trial activo hasta {new Date(plan.trial_ends_at).toLocaleDateString()}</>
              )}
              {plan.subscription_status === 'active' && <>Suscripción activa</>}
              {plan.subscription_status === 'expired' && <>Plan expirado</>}
              {plan.subscription_status === 'none' && <>Sin suscripción activa</>}
            </CardDescription>
          </div>
          <Badge variant={isPremium ? 'default' : 'secondary'}>
            {plan.plan_tier.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Clientes */}
        <UsageItem
          label={FEATURE_NAMES.max_customers}
          current={usage.customers.current}
          limit={usage.customers.limit}
          percentage={usage.customers.percentage}
          isPremium={isPremium}
          isNearLimit={usage.customers.percentage !== null && usage.customers.percentage >= 80}
        />

        {/* Órdenes del Mes */}
        <UsageItem
          label={FEATURE_NAMES.max_orders_per_month}
          current={usage.orders.current}
          limit={usage.orders.limit}
          percentage={usage.orders.percentage}
          isPremium={isPremium}
          isNearLimit={usage.orders.percentage !== null && usage.orders.percentage >= 80}
        />

        {/* Items de Inventario */}
        <UsageItem
          label={FEATURE_NAMES.max_inventory_items}
          current={usage.inventory.current}
          limit={usage.inventory.limit}
          percentage={usage.inventory.percentage}
          isPremium={isPremium}
          isNearLimit={usage.inventory.percentage !== null && usage.inventory.percentage >= 80}
        />

        {/* Usuarios Activos */}
        <UsageItem
          label={FEATURE_NAMES.max_users}
          current={usage.users.current}
          limit={usage.users.limit}
          percentage={usage.users.percentage}
          isPremium={isPremium}
          isNearLimit={usage.users.percentage !== null && usage.users.percentage >= 80}
        />

        {/* Upgrade CTA solo para Free */}
        {!isPremium && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  ¿Necesitas más capacidad?
                </p>
                <p className="text-xs text-muted-foreground">
                  Con Premium desbloqueas clientes, órdenes, inventario y usuarios sin restricciones, además de WhatsApp, IA y reportes avanzados.
                </p>
                <Link href="/settings/billing">
                  <Button size="sm" className="mt-1 gap-1.5">
                    Ver planes
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface UsageItemProps {
  label: string
  current: number
  limit: number | null
  percentage: number | null
  isPremium: boolean
  isNearLimit: boolean
}

function UsageItem({ label, current, limit, percentage, isPremium, isNearLimit }: UsageItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current} {limit !== null ? `/ ${limit}` : ''}
          {isPremium && limit === null && (
            <Badge variant="outline" className="ml-2">
              Ilimitado
            </Badge>
          )}
        </span>
      </div>

      {limit !== null && percentage !== null && (
        <>
          <Progress 
            value={percentage} 
            className={isNearLimit ? 'bg-red-100' : ''}
          />
          {isNearLimit && (
            <p className="text-xs text-orange-600">
              ⚠️ Cerca del límite ({percentage}%)
            </p>
          )}
        </>
      )}

      {limit === null && isPremium && (
        <p className="text-xs text-muted-foreground">
          ✓ Sin límites en plan Premium
        </p>
      )}
    </div>
  )
}
