/**
 * =====================================================
 * BILLING: Verificación de Límites de Plan
 * Autor: Eagles ERP
 * Fecha: 2026-02-06
 * Descripción: Verifica si la organización puede crear recursos según su plan
 * =====================================================
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { PLAN_LIMITS, FEATURE_NAMES } from '@/types/billing'
import type { LimitError, PlanTier } from '@/types/billing'

export type ResourceType = 
  | 'customer' 
  | 'work_order' 
  | 'inventory_item' 
  | 'user'
  | 'whatsapp_conversation'

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
    return null
  }
  
  return userProfile.organization_id
}

/**
 * Obtiene el plan tier de la organización
 */
async function getPlanTier(organizationId: string): Promise<PlanTier> {
  const supabase = getSupabaseServiceClient()
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('plan_tier')
    .eq('id', organizationId)
    .single()
  
  if (error || !org) {
    return 'free' // Default a free si hay error
  }
  
  return (org.plan_tier || 'free') as PlanTier
}

/**
 * Obtiene los límites del plan desde la BD o usa constantes como fallback
 */
async function getPlanLimits(planTier: PlanTier) {
  const supabase = getSupabaseServiceClient()
  
  const { data: planLimitsData, error } = await supabase
    .from('plan_limits')
    .select('feature_key, limit_value')
    .eq('plan_tier', planTier)
  
  if (error || !planLimitsData || planLimitsData.length === 0) {
    // Fallback a constantes si no hay datos en BD
    return PLAN_LIMITS[planTier]
  }
  
  // Construir objeto PlanLimits desde la BD
  const limitsMap = new Map(
    planLimitsData.map(item => [item.feature_key, item.limit_value])
  )
  
  return {
    max_customers: limitsMap.get('max_customers') ?? PLAN_LIMITS[planTier].max_customers,
    max_orders_per_month: limitsMap.get('max_orders_per_month') ?? PLAN_LIMITS[planTier].max_orders_per_month,
    max_inventory_items: limitsMap.get('max_inventory_items') ?? PLAN_LIMITS[planTier].max_inventory_items,
    max_users: limitsMap.get('max_users') ?? PLAN_LIMITS[planTier].max_users,
    whatsapp_enabled: (limitsMap.get('whatsapp_enabled') ?? 0) > 0,
    ai_enabled: (limitsMap.get('ai_enabled') ?? 0) > 0,
    advanced_reports: (limitsMap.get('advanced_reports') ?? 0) > 0,
  }
}

/**
 * Cuenta el uso actual de un recurso
 */
async function getCurrentUsage(
  organizationId: string,
  resourceType: ResourceType
): Promise<number> {
  const supabase = getSupabaseServiceClient()
  
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
}

/**
 * Mapea ResourceType a feature_key y nombre legible
 */
function getFeatureInfo(resourceType: ResourceType): {
  featureKey: keyof typeof PLAN_LIMITS.free
  featureName: string
} {
  switch (resourceType) {
    case 'customer':
      return { featureKey: 'max_customers', featureName: FEATURE_NAMES.max_customers }
    case 'work_order':
      return { featureKey: 'max_orders_per_month', featureName: FEATURE_NAMES.max_orders_per_month }
    case 'inventory_item':
      return { featureKey: 'max_inventory_items', featureName: FEATURE_NAMES.max_inventory_items }
    case 'user':
      return { featureKey: 'max_users', featureName: FEATURE_NAMES.max_users }
    case 'whatsapp_conversation':
      return { featureKey: 'whatsapp_enabled', featureName: FEATURE_NAMES.whatsapp_enabled }
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
  resourceType: ResourceType,
  options?: { useOrganizationId?: boolean }
): Promise<CheckLimitResult> {
  try {
    // 1. Obtener organization_id
    let organizationId: string | null
    if (options?.useOrganizationId) {
      organizationId = userIdOrOrgId
    } else {
      organizationId = await getOrganizationIdFromUser(userIdOrOrgId)
    }
    
    if (!organizationId) {
      return {
        canCreate: false,
        error: {
          error: 'limit_reached',
          message: 'Organización no encontrada',
          current: 0,
          limit: 0,
          feature: resourceType,
          upgrade_url: '/dashboard/billing',
          plan_required: 'premium'
        }
      }
    }

    // 2. Obtener plan tier
    const planTier = await getPlanTier(organizationId)
    
    // 3. Obtener límites del plan
    const limits = await getPlanLimits(planTier)
    
    // 4. Obtener feature info
    const { featureKey, featureName } = getFeatureInfo(resourceType)
    
    // 5. Manejo especial para whatsapp_conversation (es un feature, no un límite numérico)
    if (resourceType === 'whatsapp_conversation') {
      const whatsappEnabled = limits.whatsapp_enabled === true
      
      if (!whatsappEnabled) {
        return {
          canCreate: false,
          current: 0,
          limit: 0,
          error: {
            error: 'limit_reached',
            message: `La función de ${featureName} no está habilitada en tu plan ${planTier === 'free' ? 'Free' : 'Premium'}. Actualiza a Premium para habilitar WhatsApp.`,
            current: 0,
            limit: 0,
            feature: featureKey,
            upgrade_url: '/dashboard/billing',
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
    
    const limit = limits[featureKey]
    
    // 6. Si el límite es null (ilimitado), permitir
    if (limit === null) {
      return {
        canCreate: true,
        current: await getCurrentUsage(organizationId, resourceType),
        limit: null
      }
    }
    
    // 7. Obtener uso actual
    const current = await getCurrentUsage(organizationId, resourceType)
    
    // 8. Verificar si puede crear
    const canCreate = current < limit
    
    if (!canCreate) {
      return {
        canCreate: false,
        current,
        limit,
        error: {
          error: 'limit_reached',
          message: `Has alcanzado el límite de ${limit} ${featureName.toLowerCase()} para tu plan ${planTier === 'free' ? 'Free' : 'Premium'}. ${planTier === 'free' ? 'Actualiza a Premium para límites ilimitados.' : 'Contacta soporte para aumentar tu límite.'}`,
          current,
          limit,
          feature: featureKey,
          upgrade_url: '/dashboard/billing',
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
        error: 'limit_reached',
        message: error.message || 'Error al verificar límites',
        current: 0,
        limit: 0,
        feature: resourceType,
        upgrade_url: '/dashboard/billing',
        plan_required: 'premium'
      }
    }
  }
}

/**
 * Verifica si una feature está habilitada para el plan de la organización
 * 
 * @param userId - ID del usuario autenticado
 * @param featureKey - Key de la feature (ej: 'whatsapp_enabled', 'ai_enabled')
 * @returns true si está habilitada, false si no
 */
export async function checkFeatureEnabled(
  userId: string,
  featureKey: 'whatsapp_enabled' | 'ai_enabled' | 'advanced_reports'
): Promise<boolean> {
  try {
    const organizationId = await getOrganizationIdFromUser(userId)
    if (!organizationId) return false

    const planTier = await getPlanTier(organizationId)
    const limits = await getPlanLimits(planTier)
    
    return limits[featureKey] === true
  } catch (error) {
    console.error('[checkFeatureEnabled] Error:', error)
    return false
  }
}
