import { NextRequest, NextResponse } from 'next/server'
import { getPaymentClient } from '@/lib/mercadopago/client'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { type?: string; data?: { id?: string } }

    console.log('[MercadoPago Webhook] Notificación recibida:', body.type)

    if (body.type === 'payment') {
      const paymentId = body.data?.id
      if (!paymentId) {
        return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })
      }

      const paymentClient = getPaymentClient()
      const payment = await paymentClient.get({ id: paymentId })

      console.log('[MercadoPago Webhook] Payment status:', payment.status)

      if (payment.status !== 'approved') {
        return NextResponse.json({ received: true })
      }

      const organizationId =
        (payment as { external_reference?: string }).external_reference ??
        (payment as { metadata?: { organization_id?: string } }).metadata?.organization_id

      if (!organizationId) {
        console.error('[MercadoPago Webhook] No organization_id en external_reference ni metadata')
        return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 })
      }

      const planType = (payment as { metadata?: { plan_type?: string } }).metadata?.plan_type ?? 'monthly'
      const periodMs = planType === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
      const now = new Date()
      const periodEnd = new Date(now.getTime() + periodMs)

      const supabase = getSupabaseServiceClient()
      const { error } = await supabase
        .from('organizations')
        .update({
          plan_tier: 'premium',
          subscription_status: 'active',
          mercadopago_payment_id: String(payment.id),
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', organizationId)

      if (error) {
        console.error('[MercadoPago Webhook] Error actualizando organización:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('[MercadoPago Webhook] ✅ Organización actualizada a Premium:', organizationId)
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    console.error('[MercadoPago Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook error', details: message },
      { status: 500 }
    )
  }
}
