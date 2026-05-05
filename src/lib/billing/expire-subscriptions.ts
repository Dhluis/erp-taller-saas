/**
 * =====================================================
 * BILLING: Expiración automática de suscripciones y trials
 * =====================================================
 * Ejecutado diariamente por el cron de Vercel.
 * Maneja dos casos:
 *   1. Trials vencidos → Baja a Free (conserva la cuenta)
 *   2. Suscripciones Premium vencidas → Baja a Free (edge case: current_period_end expirado)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export interface ExpireSubscriptionsResult {
  ok: boolean
  downgradedCount: number
  trialDowngradedCount: number
  organizationIds: string[]
  trialOrganizationIds: string[]
  error?: string
}

/**
 * Encuentra trials y suscripciones vencidas y las pasa a Free.
 * Pensado para ser llamado por un cron diario (ej. Vercel Cron).
 */
export async function expireSubscriptions(): Promise<ExpireSubscriptionsResult> {
  const supabase = getSupabaseServiceClient()
  const now = new Date().toISOString()

  let trialIds: string[] = []
  let subscriptionIds: string[] = []

  try {
    // ─── 1. TRIALS VENCIDOS ────────────────────────────────────────────────
    // Orgs en trial con trial_ends_at en el pasado
    const { data: trialOrgs, error: trialSelectError } = await supabase
      .from('organizations')
      .select('id')
      .eq('subscription_status', 'trial')
      .not('trial_ends_at', 'is', null)
      .lt('trial_ends_at', now)

    if (trialSelectError) {
      console.error('[expireSubscriptions] Error al listar trials:', trialSelectError)
      return {
        ok: false,
        downgradedCount: 0,
        trialDowngradedCount: 0,
        organizationIds: [],
        trialOrganizationIds: [],
        error: trialSelectError.message,
      }
    }

    if (trialOrgs?.length) {
      trialIds = trialOrgs.map((o: { id: string }) => o.id)

      const { error: trialUpdateError } = await supabase
        .from('organizations')
        .update({
          plan_tier: 'free',
          subscription_status: 'expired',
          updated_at: now,
          // Mantenemos trial_ends_at para registro histórico
        })
        .in('id', trialIds)

      if (trialUpdateError) {
        console.error('[expireSubscriptions] Error al bajar trials:', trialUpdateError)
        return {
          ok: false,
          downgradedCount: 0,
          trialDowngradedCount: 0,
          organizationIds: [],
          trialOrganizationIds: [],
          error: trialUpdateError.message,
        }
      }

      console.log(`[expireSubscriptions] 🔄 ${trialIds.length} trial(s) expirados → Free:`, trialIds)
    }

    // ─── 2. SUSCRIPCIONES PREMIUM VENCIDAS ────────────────────────────────
    // Orgs premium con current_period_end en el pasado (edge case: Hotmart no renovó)
    const { data: premiumOrgs, error: premiumSelectError } = await supabase
      .from('organizations')
      .select('id')
      .eq('plan_tier', 'premium')
      .not('subscription_status', 'eq', 'trial') // No procesar trials aquí
      .not('current_period_end', 'is', null)
      .lt('current_period_end', now)

    if (premiumSelectError) {
      console.error('[expireSubscriptions] Error al listar orgs premium:', premiumSelectError)
      return {
        ok: false,
        downgradedCount: 0,
        trialDowngradedCount: trialIds.length,
        organizationIds: [],
        trialOrganizationIds: trialIds,
        error: premiumSelectError.message,
      }
    }

    if (premiumOrgs?.length) {
      subscriptionIds = premiumOrgs.map((o: { id: string }) => o.id)

      const { error: premiumUpdateError } = await supabase
        .from('organizations')
        .update({
          plan_tier: 'free',
          subscription_status: 'expired',
          current_period_start: null,
          current_period_end: null,
          updated_at: now,
        })
        .in('id', subscriptionIds)

      if (premiumUpdateError) {
        console.error('[expireSubscriptions] Error al bajar orgs premium:', premiumUpdateError)
        return {
          ok: false,
          downgradedCount: 0,
          trialDowngradedCount: trialIds.length,
          organizationIds: [],
          trialOrganizationIds: trialIds,
          error: premiumUpdateError.message,
        }
      }

      console.log(`[expireSubscriptions] ✅ ${subscriptionIds.length} organización(es) Premium → Free:`, subscriptionIds)
    }

    return {
      ok: true,
      downgradedCount: subscriptionIds.length,
      trialDowngradedCount: trialIds.length,
      organizationIds: subscriptionIds,
      trialOrganizationIds: trialIds,
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[expireSubscriptions] Error inesperado:', err)
    return {
      ok: false,
      downgradedCount: 0,
      trialDowngradedCount: 0,
      organizationIds: [],
      trialOrganizationIds: [],
      error: message,
    }
  }
}
