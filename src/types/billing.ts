/**
 * =====================================================
 * TYPES: Sistema de Planes Free/Premium
 * Autor: Eagles System
 * Fecha: 2026-02-06
 * Descripción: Tipos TypeScript para modelo freemium
 * =====================================================
 */

/**
 * Tier del plan de suscripción
 */
export type PlanTier = 'free' | 'premium'

/**
 * Estado de la suscripción
 */
export type SubscriptionStatus = 
  | 'none'      // Sin configurar
  | 'trial'     // En período de prueba (7 días)
  | 'active'    // Suscripción activa y pagando
  | 'expired'   // Trial expirado o pago fallido
  | 'canceled'  // Cancelado por usuario
  | 'past_due'  // Pago vencido (Stripe)

/**
 * Límite de un plan para una feature específica
 */
export interface PlanLimit {
  feature_key: string
  limit_value: number | null  // null = ilimitado, 0 = deshabilitado, >0 = límite
  description?: string
}

/**
 * Conjunto de límites para un plan
 */
export interface PlanLimits {
  max_customers: number | null
  max_orders_per_month: number | null
  max_inventory_items: number | null
  max_users: number | null
  whatsapp_enabled: boolean
  ai_enabled: boolean
  advanced_reports: boolean
}

/**
 * Uso actual de recursos de una organización
 */
export interface UsageMetrics {
  customers: {
    current: number
    limit: number | null
    percentage?: number  // 0-100
  }
  orders: {
    current: number      // Del mes actual
    limit: number | null
    percentage?: number
  }
  inventory: {
    current: number
    limit: number | null
    percentage?: number
  }
  users: {
    current: number
    limit: number | null
    percentage?: number
  }
}

/**
 * Resultado de verificación de límite
 */
export interface UsageCheck {
  allowed: boolean
  current: number
  limit: number | null
  message?: string
  feature?: string
}

/**
 * Información completa del plan de una organización
 */
export interface OrganizationPlan {
  organization_id: string
  plan_tier: PlanTier
  subscription_status: SubscriptionStatus
  plan_started_at: string | null
  trial_ends_at: string | null
  current_period_end?: string | null
  limits: PlanLimits
  usage: UsageMetrics
}

/**
 * Datos para upgrade a premium
 */
export interface UpgradeRequest {
  organization_id: string
  payment_method_id?: string  // Stripe payment method
  billing_email?: string
}

/**
 * Respuesta de activación de plan
 */
export interface ActivationResponse {
  success: boolean
  plan_tier: PlanTier
  message?: string
  trial_ends_at?: string
  error?: string
}

/**
 * Tracking de uso mensual
 */
export interface UsageTracking {
  id: string
  organization_id: string
  metric_key: string
  metric_value: number
  period_start: string
  period_end: string
  created_at: string
  updated_at: string
}

/**
 * Configuración de feature flags por plan
 */
export interface FeatureAccess {
  whatsapp: boolean
  ai_conversations: boolean
  advanced_reports: boolean
  integrations: boolean
  multi_user: boolean
  white_label: boolean
  priority_support: boolean
}

/**
 * Tipos de recursos limitados
 */
export type LimitedResource = 'customer' | 'work_order' | 'inventory_item' | 'user' | 'whatsapp_conversation'

/**
 * Error de límite alcanzado
 */
export interface LimitError {
  type: 'limit_exceeded'
  resource: LimitedResource
  message: string
  current?: number
  limit?: number
  // Campos adicionales para compatibilidad con endpoints existentes
  feature?: string
  upgrade_url?: string
  plan_required?: PlanTier
}

/**
 * Constantes de límites por plan
 */
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    max_customers: 20,
    max_orders_per_month: 20,
    max_inventory_items: 30,
    max_users: 2,
    whatsapp_enabled: false,
    ai_enabled: false,
    advanced_reports: false
  },
  premium: {
    max_customers: null,  // ilimitado
    max_orders_per_month: null,
    max_inventory_items: null,
    max_users: null,
    whatsapp_enabled: true,
    ai_enabled: true,
    advanced_reports: true
  }
}

/**
 * Features habilitadas por plan
 */
export const PLAN_FEATURES: Record<PlanTier, FeatureAccess> = {
  free: {
    whatsapp: false,
    ai_conversations: false,
    advanced_reports: false,
    integrations: false,
    multi_user: false,
    white_label: false,
    priority_support: false
  },
  premium: {
    whatsapp: true,
    ai_conversations: true,
    advanced_reports: true,
    integrations: true,
    multi_user: true,
    white_label: true,
    priority_support: true
  }
}

/**
 * Nombres legibles de features
 */
export const FEATURE_NAMES: Record<string, string> = {
  customers: 'Clientes',
  workOrders: 'Órdenes de trabajo',
  inventoryItems: 'Productos en inventario',
  activeUsers: 'Usuarios activos',
  max_customers: 'Clientes',
  max_orders_per_month: 'Órdenes mensuales',
  max_inventory_items: 'Productos en inventario',
  max_users: 'Usuarios',
  whatsapp_enabled: 'WhatsApp Business',
  ai_enabled: 'IA Conversacional',
  advanced_reports: 'Reportes Avanzados'
}

/**
 * Type guard: Verificar si es error de límite
 */
export function isLimitError(error: unknown): error is LimitError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as any).type === 'limit_exceeded'
  )
}

/**
 * Helper: Calcular porcentaje de uso
 */
export function calculateUsagePercentage(
  current: number, 
  limit: number | null
): number | null {
  if (limit === null || limit === 0) return null
  return Math.min(Math.round((current / limit) * 100), 100)
}

/**
 * Helper: Verificar si está cerca del límite (>80%)
 */
export function isNearLimit(current: number, limit: number | null): boolean {
  if (limit === null) return false
  return (current / limit) >= 0.8
}

/**
 * Helper: Obtener días restantes de trial
 */
export function getDaysLeftInTrial(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  
  const now = new Date()
  const endDate = new Date(trialEndsAt)
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Helper: Verificar si trial está activo
 */
export function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) > new Date()
}

/**
 * Helper: Verificar si feature está habilitada para un plan
 */
export function isFeatureEnabled(
  planTier: PlanTier,
  featureKey: keyof PlanLimits
): boolean {
  const limits = PLAN_LIMITS[planTier]
  const value = limits[featureKey]
  
  if (typeof value === 'boolean') {
    return value
  }
  
  // Para límites numéricos, si es null o > 0, está habilitado
  return value !== null && value > 0
}

/**
 * Helper: Obtener límite de una feature
 */
export function getFeatureLimit(
  planTier: PlanTier,
  featureKey: keyof PlanLimits
): number | null {
  const limits = PLAN_LIMITS[planTier]
  const value = limits[featureKey]
  
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  
  return value
}
