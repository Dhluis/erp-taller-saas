import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

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

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('[MP Webhook] MERCADOPAGO_ACCESS_TOKEN no configurada')
      return NextResponse.json({ error: 'MercadoPago not configured' }, { status: 500 })
    }

    // Obtener detalles del pago desde MercadoPago
    const mercadopago = new MercadoPagoConfig({ accessToken })
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

    const supabase = getSupabaseServiceClient()

    // Si ya es premium y tiene período vigente, extender desde current_period_end en lugar de reemplazar
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('plan_tier, current_period_end')
      .eq('id', organizationId)
      .single()

    const now = new Date()
    let periodStart: Date
    let periodEnd: Date

    if (
      existingOrg &&
      (existingOrg as { plan_tier?: string }).plan_tier === 'premium' &&
      (existingOrg as { current_period_end?: string | null }).current_period_end
    ) {
      const currentEnd = new Date((existingOrg as { current_period_end: string }).current_period_end)
      if (currentEnd > now) {
        // Extender desde el fin del período actual
        periodStart = currentEnd
        periodEnd = new Date(currentEnd)
        if (planType === 'annual') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }
        console.log('[MP Webhook] Renovación: extendiendo período hasta', periodEnd.toISOString())
      } else {
        periodStart = now
        periodEnd = new Date(now)
        if (planType === 'annual') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }
      }
    } else {
      periodStart = now
      periodEnd = new Date(now)
      if (planType === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      }
    }

    // Actualizar organización a Premium
    const { error } = await supabase
      .from('organizations')
      .update({
        plan_tier: 'premium',
        subscription_status: 'active',
        mercadopago_payment_id: payment.id?.toString(),
        current_period_start: periodStart.toISOString(),
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
