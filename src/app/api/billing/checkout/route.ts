import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { PRICING } from '@/lib/billing/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Autenticar usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Obtener datos del usuario y organización
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()

    // 3. Obtener el plan seleccionado del body
    const body = await request.json()
    const { plan } = body // 'monthly' o 'annual'

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const priceId = PRICING[plan as 'monthly' | 'annual'].stripePriceId

    // 4. Crear o recuperar Stripe Customer
    let customerId = org?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: org?.name || profile.full_name,
        metadata: {
          organization_id: profile.organization_id,
          user_id: user.id
        }
      })
      customerId = customer.id

      // Guardar customer ID en la BD
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.organization_id)
    }

    // 5. Crear Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        organization_id: profile.organization_id,
        user_id: user.id,
        plan: plan
      },
      subscription_data: {
        metadata: {
          organization_id: profile.organization_id,
        }
      }
    })

    return NextResponse.json({ url: session.url })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear sesión de pago'
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
