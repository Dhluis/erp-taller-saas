'use client'

import { useBilling } from '@/hooks/useBilling'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestBillingPage() {
  const {
    plan,
    usage,
    isLoading,
    error,
    canCreateCustomer,
    canCreateOrder,
    canCreateUser,
    canUseWhatsApp,
    canUseAI,
    refresh
  } = useBilling()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando información de billing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!plan || !usage) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert>
          <AlertDescription>
            No se pudo cargar la información del plan. Verifica que la migración se haya aplicado correctamente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">🧪 Test: Sistema de Billing</h1>
          <p className="text-muted-foreground">
            Verificación de planes Free/Premium y límites de uso
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Información del Plan */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plan Actual</CardTitle>
              <CardDescription>Información del plan de suscripción</CardDescription>
            </div>
            <Badge variant={plan.plan_tier === 'premium' ? 'default' : 'secondary'}>
              {plan.plan_tier === 'premium' ? '⭐ Premium' : '🆓 Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Organization ID</p>
              <p className="font-mono text-xs">{plan.organization_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan Tier</p>
              <p className="font-semibold">{plan.plan_tier}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="font-semibold">{plan.subscription_status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan Iniciado</p>
              <p className="text-sm">
                {plan.plan_started_at 
                  ? new Date(plan.plan_started_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {plan.trial_ends_at && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <AlertDescription>
                <strong>Trial activo:</strong> Termina el{' '}
                {new Date(plan.trial_ends_at).toLocaleDateString()}
                {' '}({Math.ceil((new Date(plan.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días restantes)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Límites del Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Límites del Plan</CardTitle>
          <CardDescription>Límites configurados para tu plan actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Clientes máximos</span>
                <span className="font-semibold">
                  {plan.limits.max_customers === null ? '∞ Ilimitado' : plan.limits.max_customers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Órdenes/mes</span>
                <span className="font-semibold">
                  {plan.limits.max_orders_per_month === null ? '∞ Ilimitado' : plan.limits.max_orders_per_month}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Items inventario</span>
                <span className="font-semibold">
                  {plan.limits.max_inventory_items === null ? '∞ Ilimitado' : plan.limits.max_inventory_items}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Usuarios máximos</span>
                <span className="font-semibold">
                  {plan.limits.max_users === null ? '∞ Ilimitado' : plan.limits.max_users}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">WhatsApp</span>
                {plan.limits.whatsapp_enabled ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Habilitado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Deshabilitado
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">IA Conversacional</span>
                {plan.limits.ai_enabled ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Habilitado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Deshabilitado
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reportes Avanzados</span>
                {plan.limits.advanced_reports ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Habilitado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Deshabilitado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uso Actual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Uso Actual</CardTitle>
          <CardDescription>Recursos utilizados vs límites del plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Clientes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Clientes</span>
              <span className="text-sm">
                {usage.customers.current} / {usage.customers.limit === null ? '∞' : usage.customers.limit}
                {usage.customers.percentage !== null && ` (${usage.customers.percentage}%)`}
              </span>
            </div>
            {usage.customers.limit !== null && (
              <Progress 
                value={usage.customers.percentage || 0} 
                className="h-2"
              />
            )}
            {usage.customers.percentage !== null && usage.customers.percentage >= 80 && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ Cerca del límite</p>
            )}
          </div>

          {/* Órdenes del mes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Órdenes (este mes)</span>
              <span className="text-sm">
                {usage.orders.current} / {usage.orders.limit === null ? '∞' : usage.orders.limit}
                {usage.orders.percentage !== null && ` (${usage.orders.percentage}%)`}
              </span>
            </div>
            {usage.orders.limit !== null && (
              <Progress 
                value={usage.orders.percentage || 0} 
                className="h-2"
              />
            )}
            {usage.orders.percentage !== null && usage.orders.percentage >= 80 && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ Cerca del límite</p>
            )}
          </div>

          {/* Inventario */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Items de Inventario</span>
              <span className="text-sm">
                {usage.inventory.current} / {usage.inventory.limit === null ? '∞' : usage.inventory.limit}
                {usage.inventory.percentage !== null && ` (${usage.inventory.percentage}%)`}
              </span>
            </div>
            {usage.inventory.limit !== null && (
              <Progress 
                value={usage.inventory.percentage || 0} 
                className="h-2"
              />
            )}
            {usage.inventory.percentage !== null && usage.inventory.percentage >= 80 && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ Cerca del límite</p>
            )}
          </div>

          {/* Usuarios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Usuarios Activos</span>
              <span className="text-sm">
                {usage.users.current} / {usage.users.limit === null ? '∞' : usage.users.limit}
                {usage.users.percentage !== null && ` (${usage.users.percentage}%)`}
              </span>
            </div>
            {usage.users.limit !== null && (
              <Progress 
                value={usage.users.percentage || 0} 
                className="h-2"
              />
            )}
            {usage.users.percentage !== null && usage.users.percentage >= 80 && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ Cerca del límite</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Permisos y Capacidades</CardTitle>
          <CardDescription>Qué puedes hacer con tu plan actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Crear Cliente</span>
              {canCreateCustomer ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Permitido
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Límite alcanzado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Crear Orden</span>
              {canCreateOrder ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Permitido
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Límite alcanzado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Crear Usuario</span>
              {canCreateUser ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Permitido
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Límite alcanzado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Usar WhatsApp</span>
              {canUseWhatsApp ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Habilitado
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  No disponible
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Usar IA</span>
              {canUseAI ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Habilitado
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  No disponible
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm">🔍 Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-white dark:bg-slate-900 p-4 rounded border">
            {JSON.stringify({ plan, usage }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
