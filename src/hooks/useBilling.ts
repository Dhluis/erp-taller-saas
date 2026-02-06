'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/context/SessionContext'
import type { 
  OrganizationPlan, 
  UsageMetrics, 
  PlanTier,
  SubscriptionStatus 
} from '@/types/billing'
import { 
  PLAN_LIMITS, 
  calculateUsagePercentage,
  isNearLimit,
  getDaysLeftInTrial,
  isTrialActive 
} from '@/types/billing'

interface UseBillingReturn {
  plan: OrganizationPlan | null
  usage: UsageMetrics | null
  isLoading: boolean
  error: Error | null
  canCreateCustomer: boolean
  canCreateOrder: boolean
  canCreateUser: boolean
  canUseWhatsApp: boolean
  canUseAI: boolean
  refresh: () => Promise<void>
}

/**
 * Hook para acceder a información de billing y límites del plan
 * 
 * @example
 * ```tsx
 * const { plan, usage, canCreateCustomer, canCreateOrder } = useBilling()
 * 
 * if (!canCreateCustomer) {
 *   return <UpgradePrompt />
 * }
 * ```
 */
export function useBilling(): UseBillingReturn {
  const { organizationId } = useSession()
  const [plan, setPlan] = useState<OrganizationPlan | null>(null)
  const [usage, setUsage] = useState<UsageMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBillingData = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // 1. Obtener plan de la organización
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, plan_tier, plan_started_at, trial_ends_at')
        .eq('id', organizationId)
        .single()

      if (orgError) throw orgError
      if (!org) throw new Error('Organización no encontrada')

      // 2. Obtener subscription_status desde organization_messaging_config
      const { data: messagingConfig } = await supabase
        .from('organization_messaging_config')
        .select('subscription_status, trial_ends_at')
        .eq('organization_id', organizationId)
        .single()

      // Usar subscription_status de messaging_config si existe, sino calcular
      let subscriptionStatus: SubscriptionStatus = 'none'
      if (messagingConfig?.subscription_status) {
        subscriptionStatus = messagingConfig.subscription_status as SubscriptionStatus
      } else if (org.plan_tier === 'premium') {
        subscriptionStatus = 'active'
      } else if (org.trial_ends_at && isTrialActive(org.trial_ends_at)) {
        subscriptionStatus = 'trial'
      } else if (org.trial_ends_at && !isTrialActive(org.trial_ends_at)) {
        subscriptionStatus = 'expired'
      }

      const planTier = (org.plan_tier || 'free') as PlanTier
      const limits = PLAN_LIMITS[planTier]

      // 3. Calcular uso actual
      const currentMonthStart = new Date()
      currentMonthStart.setDate(1)
      currentMonthStart.setHours(0, 0, 0, 0)
      
      const currentMonthEnd = new Date(currentMonthStart)
      currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1)

      // Contar clientes
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      // Contar órdenes del mes actual
      const { count: ordersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', currentMonthStart.toISOString())
        .lt('created_at', currentMonthEnd.toISOString())

      // Contar items de inventario
      const { count: inventoryCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      // Contar usuarios activos
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      // 4. Construir métricas de uso
      const usageMetrics: UsageMetrics = {
        customers: {
          current: customersCount || 0,
          limit: limits.max_customers,
          percentage: calculateUsagePercentage(customersCount || 0, limits.max_customers)
        },
        orders: {
          current: ordersCount || 0,
          limit: limits.max_orders_per_month,
          percentage: calculateUsagePercentage(ordersCount || 0, limits.max_orders_per_month)
        },
        inventory: {
          current: inventoryCount || 0,
          limit: limits.max_inventory_items,
          percentage: calculateUsagePercentage(inventoryCount || 0, limits.max_inventory_items)
        },
        users: {
          current: usersCount || 0,
          limit: limits.max_users,
          percentage: calculateUsagePercentage(usersCount || 0, limits.max_users)
        }
      }

      // 5. Construir plan completo
      const organizationPlan: OrganizationPlan = {
        organization_id: organizationId,
        plan_tier: planTier,
        subscription_status: subscriptionStatus,
        plan_started_at: org.plan_started_at || null,
        trial_ends_at: org.trial_ends_at || messagingConfig?.trial_ends_at || null,
        limits,
        usage: usageMetrics
      }

      setPlan(organizationPlan)
      setUsage(usageMetrics)
    } catch (err) {
      console.error('[useBilling] Error:', err)
      setError(err instanceof Error ? err : new Error('Error desconocido'))
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  // Verificar si puede crear recursos
  const canCreateCustomer = usage && plan
    ? plan.limits.max_customers === null || usage.customers.current < plan.limits.max_customers
    : true

  const canCreateOrder = usage && plan
    ? plan.limits.max_orders_per_month === null || usage.orders.current < plan.limits.max_orders_per_month
    : true

  const canCreateUser = usage && plan
    ? plan.limits.max_users === null || usage.users.current < plan.limits.max_users
    : true

  const canUseWhatsApp = plan
    ? plan.limits.whatsapp_enabled
    : false

  const canUseAI = plan
    ? plan.limits.ai_enabled
    : false

  return {
    plan,
    usage,
    isLoading,
    error,
    canCreateCustomer,
    canCreateOrder,
    canCreateUser,
    canUseWhatsApp,
    canUseAI,
    refresh: fetchBillingData,
  }
}
