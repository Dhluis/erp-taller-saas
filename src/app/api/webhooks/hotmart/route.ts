/**
 * =====================================================
 * WEBHOOK: Hotmart → Confia Drive
 * =====================================================
 * Endpoint: POST /api/webhooks/hotmart
 * 
 * Eventos manejados:
 *   - PURCHASE_APPROVED     → Activar plan Premium (permanente)
 *   - PURCHASE_REFUNDED     → Bajar a plan Free
 *   - PURCHASE_CANCELED     → Bajar a plan Free
 *   - SUBSCRIPTION_CANCELLATION → Bajar a plan Free al vencer
 * 
 * Seguridad: Valida el header X-HOTMART-HOTTOK contra HOTMART_WEBHOOK_SECRET
 * 
 * Configuración en Hotmart:
 *   1. Panel Hotmart → Ferramentas → Webhook
 *   2. URL: https://confiadrive.io/api/webhooks/hotmart
 *   3. Copiar el "Hottok" y pegarlo en HOTMART_WEBHOOK_SECRET (Vercel env vars)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// ─── Tipos del Payload de Hotmart ──────────────────────────────────────────

interface HotmartBuyer {
  email: string
  name: string
  document?: string
  phone?: string
}

interface HotmartPurchase {
  transaction: string  // ID único de la transacción (ej. HP123456789)
  status: string
  payment: {
    type: string        // CREDIT_CARD, BILLET, PIX, etc.
    installments_number?: number
  }
  price?: {
    value: number
    currency_value: string
  }
}

interface HotmartSubscription {
  subscriber_code?: string
  status?: string
}

interface HotmartWebhookPayload {
  id: string
  version: string
  creation_date: number
  event: string
  data: {
    product: {
      id: number
      name: string
    }
    buyer: HotmartBuyer
    purchase: HotmartPurchase
    subscription?: HotmartSubscription
  }
}

// ─── Validación del Token de Hotmart ───────────────────────────────────────

function validateHottok(request: NextRequest): boolean {
  const hottokSecret = process.env.HOTMART_WEBHOOK_SECRET
  if (!hottokSecret) {
    console.error('[Hotmart Webhook] ❌ HOTMART_WEBHOOK_SECRET no configurado')
    return false
  }

  const receivedHottok = request.headers.get('x-hotmart-hottok')
  if (!receivedHottok) {
    console.error('[Hotmart Webhook] ❌ Header X-HOTMART-HOTTOK ausente')
    return false
  }

  return receivedHottok === hottokSecret
}

// ─── Lógica Principal ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Validar autenticidad de la petición
  if (!validateHottok(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: HotmartWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { event, data } = payload
  const buyerEmail = data?.buyer?.email?.toLowerCase()
  const transactionId = data?.purchase?.transaction

  console.log(`[Hotmart Webhook] Event: ${event} | Transaction: ${transactionId} | Buyer: ${buyerEmail}`)

  if (!buyerEmail) {
    console.error('[Hotmart Webhook] ⚠️ Email del comprador no encontrado en el payload')
    return NextResponse.json({ received: true, warning: 'No buyer email' })
  }

  const supabase = getSupabaseServiceClient()

  try {
    switch (event) {
      // ─── PAGO APROBADO → ACTIVAR PREMIUM ────────────────────────────────
      case 'PURCHASE_APPROVED': {
        console.log(`[Hotmart Webhook] 💳 Pago aprobado para: ${buyerEmail}`)

        // Buscar usuario en el sistema por email
        type UserRow = { id: string; organization_id: string }
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, organization_id')
          .eq('email', buyerEmail)
          .maybeSingle() as { data: UserRow | null; error: unknown }

        if (userError || !user) {
          // El comprador aún no tiene cuenta en Confia Drive
          // TODO: Cuando se defina el flujo de "compra antes de registro",
          // aquí se creará la organización automáticamente.
          console.warn(`[Hotmart Webhook] ⚠️ Usuario no encontrado: ${buyerEmail}. El usuario debe registrarse en confiadrive.io`)
          // Respondemos 200 para que Hotmart no re-intente
          return NextResponse.json({
            received: true,
            status: 'user_not_found',
            message: 'El comprador aún no tiene cuenta en Confia Drive. Debe registrarse en confiadrive.io',
          })
        }

        const orgId = user.organization_id

        // Activar plan Premium permanente (sin fecha de vencimiento)
        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        const { error: upgradeError } = await (supabase
          .from('organizations') as any)
          .update({
            plan_tier: 'premium',
            subscription_status: 'active',
            // Guardamos el ID de transacción de Hotmart como referencia
            subscription_id: transactionId,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', orgId)

        if (upgradeError) {
          console.error('[Hotmart Webhook] ❌ Error al activar Premium:', upgradeError)
          return NextResponse.json({ received: true, error: upgradeError.message }, { status: 500 })
        }

        console.log(`[Hotmart Webhook] ✅ Organización ${orgId} → Premium activo. Transacción: ${transactionId}`)
        break
      }

      // ─── REEMBOLSO O CANCELACIÓN → BAJAR A FREE ─────────────────────────
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CANCELED':
      case 'SUBSCRIPTION_CANCELLATION': {
        console.log(`[Hotmart Webhook] 🔄 ${event} para: ${buyerEmail}`)

        type UserRow = { id: string; organization_id: string }
        const { data: user } = await supabase
          .from('users')
          .select('id, organization_id')
          .eq('email', buyerEmail)
          .maybeSingle() as { data: UserRow | null; error: unknown }

        if (!user) {
          console.warn(`[Hotmart Webhook] ⚠️ Usuario no encontrado para downgrade: ${buyerEmail}`)
          return NextResponse.json({ received: true, status: 'user_not_found' })
        }

        const { error: downgradeError } = await (supabase
          .from('organizations') as any)
          .update({
            plan_tier: 'free',
            subscription_status: 'canceled',
            subscription_id: null,
            current_period_start: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.organization_id)

        if (downgradeError) {
          console.error('[Hotmart Webhook] ❌ Error al bajar a Free:', downgradeError)
          return NextResponse.json({ received: true, error: downgradeError.message }, { status: 500 })
        }

        console.log(`[Hotmart Webhook] ✅ Organización ${user.organization_id} → Free. Evento: ${event}`)
        break
      }

      default:
        console.log(`[Hotmart Webhook] ⏭️ Evento ignorado: ${event}`)
    }

    // Hotmart requiere siempre un HTTP 200 para considerar el webhook exitoso
    return NextResponse.json({ received: true, event })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Hotmart Webhook] ❌ Error inesperado:', error)
    return NextResponse.json({ received: true, error: message }, { status: 500 })
  }
}

// Rechazar otros métodos
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
