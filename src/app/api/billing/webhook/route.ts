import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('[Webhook] No signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verificar firma del webhook
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[Webhook] Signature verification failed:', message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[Webhook] Event received:', event.type)

    const supabase = getSupabaseServiceClient()

    // Procesar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.organization_id
        const subscriptionId = session.subscription

        if (!organizationId || !subscriptionId) {
          console.error('[Webhook] Missing organization_id or subscription_id in checkout.session.completed')
          break
        }

        console.log('[Webhook] Checkout completed:', {
          organizationId,
          subscriptionId,
          customerId: session.customer
        })

        // Obtener detalles de la suscripción
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
        const currentPeriodStart = new Date(subscription.current_period_start * 1000)

        // Actualizar organización
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            plan_tier: 'premium',
            subscription_status: 'active',
            subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
          })
          .eq('id', organizationId)

        if (updateError) {
          console.error('[Webhook] Error updating organization:', updateError)
          throw updateError
        }

        console.log('[Webhook] Organization upgraded to premium:', organizationId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata?.organization_id

        if (!organizationId) {
          console.error('[Webhook] Missing organization_id in customer.subscription.updated')
          break
        }

        console.log('[Webhook] Subscription updated:', {
          organizationId,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        })

        // Si está programado para cancelar al final del período, no hacer downgrade aún
        if (subscription.cancel_at_period_end) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', organizationId)
          console.log('[Webhook] Cancel at period end: actualizando fechas, sin downgrade')
          break
        }

        if (subscription.status === 'canceled') {
          await supabase
            .from('organizations')
            .update({
              plan_tier: 'free',
              subscription_status: 'canceled',
              subscription_id: null,
              current_period_start: null,
              current_period_end: null,
            })
            .eq('id', organizationId)
          console.log('[Webhook] Subscription canceled: organization downgraded to free:', organizationId)
          break
        }

        if (subscription.status === 'past_due') {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'past_due',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', organizationId)
          console.log('[Webhook] Subscription past_due: subscription_status actualizado')
          break
        }

        // active o otros
        const status = subscription.status === 'active' ? 'active' : 'expired'
        await supabase
          .from('organizations')
          .update({
            subscription_status: status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', organizationId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata?.organization_id

        if (!organizationId) {
          console.error('[Webhook] Missing organization_id in customer.subscription.deleted')
          break
        }

        console.log('[Webhook] Subscription canceled:', {
          organizationId,
          subscriptionId: subscription.id
        })

        // Bajar a plan Free
        await supabase
          .from('organizations')
          .update({
            plan_tier: 'free',
            subscription_status: 'canceled',
            subscription_id: null,
            current_period_start: null,
            current_period_end: null,
          })
          .eq('id', organizationId)

        console.log('[Webhook] Organization downgraded to free:', organizationId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
          const organizationId = subscription.metadata?.organization_id

          if (organizationId) {
            console.log('[Webhook] Payment failed:', {
              organizationId,
              subscriptionId
            })

            await supabase
              .from('organizations')
              .update({
                subscription_status: 'expired',
              })
              .eq('id', organizationId)
          }
        }
        break
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    console.error('[Webhook] Error:', error)
    return NextResponse.json(
      { error: String(message) },
      { status: 500 }
    )
  }
}
