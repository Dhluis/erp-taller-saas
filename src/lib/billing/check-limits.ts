/**
 * =====================================================
 * BILLING: Verificación de Límites de Plan
 * Autor: Eagles ERP
 * Fecha: 2026-02-06
 * Descripción: Verifica si la organización puede crear recursos según su plan
 * =====================================================
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { PLAN_LIMITS, PLAN_FEATURES, FEATURE_NAMES } from '@/types/billing'
import type { LimitError, PlanTier, LimitedResource } from '@/types/billing'

interface CheckLimitResult {
  canCreate: boolean
  error?: LimitError
  current?: number
  limit?: number | null
}

/**
 * Obtiene el organization_id del usuario autenticado
 */
async function getOrganizationIdFromUser(userId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient()
  
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  
  if (error || !userProfile) {
    console.error('[getOrganizationIdFromUser] Error:', error)
    return null
  }
  
  return (userProfile as any).organization_id
}

/**
 * Obtiene el plan tier efectivo de la organización.
 * Durante trial activo (7 días), retorna 'premium' para dar acceso a features Premium.
 */
async function getPlanTier(organizationId: string): Promise<PlanTier> {
  const supabase = getSupabaseServiceClient()
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('plan_tier, subscription_status, trial_ends_at')
    .eq('id', organizationId)
    .single()
  
  if (error || !org) {
    console.error('[getPlanTier] Error:', error)
    return 'free' // Default a free si hay error
  }

  const o = org as { plan_tier?: string; subscription_status?: string; trial_ends_at?: string | null }
  const planTier = (o.plan_tier || 'free') as PlanTier

  // Si ya es premium por pago, retornar premium
  if (planTier === 'premium') return 'premium'

  // Durante trial activo: dar acceso Premium
  if (o.subscription_status === 'trial' && o.trial_ends_at) {
    const trialEnd = new Date(o.trial_ends_at)
    if (trialEnd > new Date()) {
      return 'premium' // Trial activo → acceso Premium
    }
    // Trial expirado: lazy update a expired (opcional, no bloqueante)
    supabase
      .from('organizations')
      .update({ subscription_status: 'expired' })
      .eq('id', organizationId)
      .then(({ error: updateErr }) => {
        if (updateErr) console.warn('[getPlanTier] Lazy update expired:', updateErr)
      })
  }

  return planTier
}


/**
 * Cuenta el uso actual de un recurso
 */
async function getCurrentUsage(
  organizationId: string,
  resourceType: LimitedResource
): Promise<number> {
  const supabase = getSupabaseServiceClient()
  
  try {
    switch (resourceType) {
      case 'customer': {
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        return count || 0
      }
      
      case 'work_order': {
        // Contar órdenes del mes actual
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        
        const { count } = await supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
        return count || 0
      }
      
      case 'inventory_item': {
        const { count } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        return count || 0
      }
      
      case 'user': {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true)
        return count || 0
      }
      
      case 'whatsapp_conversation': {
        // Para conversaciones, contamos conversaciones activas
        const { count } = await supabase
          .from('whatsapp_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active')
        return count || 0
      }
      
      default:
        return 0
    }
  } catch (error) {
    console.error('[getCurrentUsage] Error:', error)
    return 0
  }
}


/**
 * Verifica si la organización puede crear un recurso según su plan
 * 
 * @param userIdOrOrgId - ID del usuario autenticado (de Supabase Auth) o organizationId directamente
 * @param resourceType - Tipo de recurso a verificar
 * @param options - Opciones adicionales (useOrganizationId: true si el primer parámetro es organizationId)
 * @returns Resultado con canCreate, error (si aplica), current y limit
 * 
 * @example
 * ```ts
 * // Con userId
 * const { canCreate, error } = await checkResourceLimit(userId, 'customer')
 * 
 * // Con organizationId directamente
 * const { canCreate, error } = await checkResourceLimit(organizationId, 'customer', { useOrganizationId: true })
 * ```
 */
export async function checkResourceLimit(
  userIdOrOrgId: string,
  resourceType: LimitedResource,
  options?: { useOrganizationId?: boolean }
): Promise<CheckLimitResult> {
  try {
    console.log('[checkResourceLimit] Verificando límites:', { userIdOrOrgId, resourceType, options })
    
    // 1. Obtener organization_id
    let organizationId: string | null
    if (options?.useOrganizationId) {
      organizationId = userIdOrOrgId
    } else {
      organizationId = await getOrganizationIdFromUser(userIdOrOrgId)
    }
    
    if (!organizationId) {
      console.error('[checkResourceLimit] Organización no encontrada')
      return {
        canCreate: false,
        error: {
          type: 'limit_exceeded',
          resource: resourceType,
          message: 'Organización no encontrada'
        }
      }
    }

    console.log('[checkResourceLimit] Organization ID:', organizationId)

    // 2. Obtener plan tier
    const planTier = await getPlanTier(organizationId)
    console.log('[checkResourceLimit] Plan tier:', planTier)
    
    // 3. Obtener límites del plan (mapear de max_* a nombres simples)
    const limits = PLAN_LIMITS[planTier]
    const features = PLAN_FEATURES[planTier]
    
    // 4. Mapear a estructura compatible
    const limitsMap = {
      customers: limits.max_customers,
      workOrders: limits.max_orders_per_month,
      inventoryItems: limits.max_inventory_items,
      activeUsers: limits.max_users
    }
    
    // 5. Manejo especial para whatsapp_conversation (es un feature, no un límite numérico)
    if (resourceType === 'whatsapp_conversation') {
      const whatsappEnabled = features.whatsapp
      
      if (!whatsappEnabled) {
        return {
          canCreate: false,
          current: 0,
          limit: 0,
        error: {
          type: 'limit_exceeded',
          resource: resourceType,
          message: `La función de WhatsApp no está habilitada en tu plan ${planTier === 'free' ? 'Free' : 'Premium'}. Actualiza a Premium para habilitar WhatsApp.`,
          feature: 'whatsapp_enabled',
          upgrade_url: '/settings/billing',
          plan_required: 'premium'
        }
        }
      }
      
      // Si WhatsApp está habilitado, permitir crear conversaciones (ilimitado)
      return {
        canCreate: true,
        current: await getCurrentUsage(organizationId, resourceType),
        limit: null // Ilimitado si está habilitado
      }
    }
    
    // 6. Obtener límite específico del recurso
    let limit: number | null = null
    let featureName = ''
    
    switch (resourceType) {
      case 'customer':
        limit = limitsMap.customers
        featureName = FEATURE_NAMES.customers || FEATURE_NAMES.max_customers
        break
      case 'work_order':
        limit = limitsMap.workOrders
        featureName = FEATURE_NAMES.workOrders || FEATURE_NAMES.max_orders_per_month
        break
      case 'inventory_item':
        limit = limitsMap.inventoryItems
        featureName = FEATURE_NAMES.inventoryItems || FEATURE_NAMES.max_inventory_items
        break
      case 'user':
        limit = limitsMap.activeUsers
        featureName = FEATURE_NAMES.activeUsers || FEATURE_NAMES.max_users
        break
    }
    
    console.log('[checkResourceLimit] Límite del plan:', limit)
    
    // 7. Si el límite es null (ilimitado), permitir
    if (limit === null) {
      const current = await getCurrentUsage(organizationId, resourceType)
      console.log('[checkResourceLimit] Límite ilimitado, permitiendo creación')
      return {
        canCreate: true,
        current,
        limit: null
      }
    }
    
    // 8. Obtener uso actual
    const current = await getCurrentUsage(organizationId, resourceType)
    console.log('[checkResourceLimit] Uso actual:', current)
    
    // 9. Verificar si puede crear
    const canCreate = current < limit
    console.log('[checkResourceLimit] ¿Puede crear?:', canCreate)
    
    if (!canCreate) {
      return {
        canCreate: false,
        current,
        limit,
        error: {
          type: 'limit_exceeded',
          resource: resourceType,
          current,
          limit,
          message: `Has alcanzado el límite de ${limit} ${featureName.toLowerCase()} para tu plan ${planTier === 'free' ? 'Free' : 'Premium'}. ${planTier === 'free' ? 'Actualiza a Premium para límites ilimitados.' : ''}`,
          feature: `max_${resourceType === 'work_order' ? 'orders_per_month' : resourceType === 'inventory_item' ? 'inventory_items' : resourceType === 'user' ? 'users' : 'customers'}`,
          upgrade_url: '/settings/billing',
          plan_required: 'premium'
        }
      }
    }
    
    return {
      canCreate: true,
      current,
      limit
    }
  } catch (error: any) {
    console.error('[checkResourceLimit] Error:', error)
    return {
      canCreate: false,
      error: {
        type: 'limit_exceeded',
        resource: resourceType,
        message: error.message || 'Error al verificar límites'
      }
    }
  }
}

/**
 * Verifica si WhatsApp está habilitado para el plan de la organización
 */
export async function checkWhatsAppEnabled(userId: string): Promise<boolean> {
  try {
    const organizationId = await getOrganizationIdFromUser(userId)
    if (!organizationId) return false

    const planTier = await getPlanTier(organizationId)
    const features = PLAN_FEATURES[planTier]
    
    return features.whatsapp
  } catch (error) {
    console.error('[checkWhatsAppEnabled] Error:', error)
    return false
  }
}
