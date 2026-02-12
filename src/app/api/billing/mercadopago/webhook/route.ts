import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

// Cliente con service role para bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!
})

export async function POST(request: NextRequest) {
  try {
    // Leer query params (formato IPN: ?topic=payment&id=123456)
    const { searchParams } = new URL(request.url)
    const topicParam = searchParams.get('topic')
    const idParam = searchParams.get('id')

    // Leer body (formato Webhook: { type: 'payment', data: { id: '...' } })
    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      body = {}
    }

    // Determinar tipo y paymentId desde cualquiera de los dos formatos
    const type = (body.type as string) ?? topicParam
    const paymentId = (body.data as { id?: string } | undefined)?.id ?? idParam

    console.log('[MP Webhook] Notificación recibida:', { type, paymentId, body: Object.keys(body).length ? body : undefined })

    if (type !== 'payment') {
      console.log('[MP Webhook] Ignorando tipo:', type)
      return NextResponse.json({ received: true })
    }

    if (!paymentId || paymentId === '123456') {
      // 123456 es ID de prueba de MercadoPago, ignorar
      console.log('[MP Webhook] ID de prueba o sin paymentId, ignorando')
      return NextResponse.json({ received: true })
    }

    // Obtener detalles del pago desde MercadoPago
    const paymentClient = new Payment(mercadopago)
    const payment = await paymentClient.get({ id: paymentId })

    console.log('[MP Webhook] Payment status:', payment.status)
    console.log('[MP Webhook] Payment metadata:', payment.metadata)

    // Solo procesar pagos aprobados
    if (payment.status !== 'approved') {
      console.log('[MP Webhook] Pago no aprobado, ignorando')
      return NextResponse.json({ received: true })
    }

    // Obtener organization_id del metadata (o external_reference como fallback)
    const organizationId =
      (payment as { metadata?: { organization_id?: string } }).metadata?.organization_id ??
      (payment as { external_reference?: string }).external_reference
    const planType = (payment as { metadata?: { plan_type?: string } }).metadata?.plan_type ?? 'monthly'

    if (!organizationId) {
      console.error('[MP Webhook] No organization_id en metadata')
      return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 })
    }

    // Calcular fecha de fin del período
    const now = new Date()
    const periodEnd = new Date(now)

    if (planType === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // Actualizar organización a Premium
    const { error } = await supabase
      .from('organizations')
      .update({
        plan_tier: 'premium',
        subscription_status: 'active',
        mercadopago_payment_id: payment.id?.toString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', organizationId)

    if (error) {
      console.error('[MP Webhook] Error actualizando org:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[MP Webhook] ✅ Org ${organizationId} actualizada a Premium hasta ${periodEnd.toISOString()}`)

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('[MP Webhook] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Webhook error', details: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}

// MercadoPago necesita que el endpoint responda GET para verificación
export async function GET() {
  return NextResponse.json({ status: 'MercadoPago webhook active' })
}
