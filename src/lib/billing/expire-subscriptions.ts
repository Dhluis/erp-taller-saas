/**
 * =====================================================
 * BILLING: Expiración automática de suscripciones
 * =====================================================
 * Baja a plan Free las organizaciones Premium cuyo
 * current_period_end ya pasó (MercadoPago y edge cases de Stripe).
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export interface ExpireSubscriptionsResult {
  ok: boolean
  downgradedCount: number
  organizationIds: string[]
  error?: string
}

/**
 * Encuentra organizaciones Premium con período vencido y las pasa a Free.
 * Pensado para ser llamado por un cron diario (ej. Vercel Cron).
 */
export async function expireSubscriptions(): Promise<ExpireSubscriptionsResult> {
  const supabase = getSupabaseServiceClient()
  const now = new Date().toISOString()

  try {
    // Organizaciones premium con current_period_end en el pasado
    const { data: orgs, error: selectError } = await supabase
      .from('organizations')
      .select('id')
      .eq('plan_tier', 'premium')
      .not('current_period_end', 'is', null)
      .lt('current_period_end', now)

    if (selectError) {
      console.error('[expireSubscriptions] Error al listar orgs:', selectError)
      return {
        ok: false,
        downgradedCount: 0,
        organizationIds: [],
        error: selectError.message,
      }
    }

    if (!orgs?.length) {
      return { ok: true, downgradedCount: 0, organizationIds: [] }
    }

    const ids = orgs.map((o: { id: string }) => o.id)

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        plan_tier: 'free',
        subscription_status: 'expired',
        current_period_start: null,
        current_period_end: null,
        updated_at: now,
        // No tocamos subscription_id ni mercadopago_payment_id (auditoría)
      })
      .in('id', ids)

    if (updateError) {
      console.error('[expireSubscriptions] Error al actualizar orgs:', updateError)
      return {
        ok: false,
        downgradedCount: 0,
        organizationIds: [],
        error: updateError.message,
      }
    }

    console.log(`[expireSubscriptions] ✅ ${ids.length} organización(es) pasadas a Free:`, ids)
    return {
      ok: true,
      downgradedCount: ids.length,
      organizationIds: ids,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[expireSubscriptions] Error inesperado:', err)
    return {
      ok: false,
      downgradedCount: 0,
      organizationIds: [],
      error: message,
    }
  }
}
