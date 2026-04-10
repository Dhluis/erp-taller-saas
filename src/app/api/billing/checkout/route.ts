import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { PRICING, getPricingByCountry, CountryCode } from '@/lib/billing/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Autenticar usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Obtener datos del usuario y organización
    const { data: profile } = (await supabase
      .from('users')
      .select('organization_id, full_name, email')
      .eq('auth_user_id', user.id)
      .single()) as { data: any }

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    if (!profile.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const { data: org } = (await supabase
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()) as { data: any }

    // 3. Obtener el plan seleccionado del body
    const body = await request.json()
    const { plan, country } = body // 'monthly' o 'annual', y código de país opcional

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // Obtener el precio correcto basado en el país (soporte multi-moneda)
    const pricingConfig = getPricingByCountry(country as CountryCode)
    
    // Castear a any temporalmente para acceder a stripePriceId ya que no todos los países lo tienen definido aún
    const countryPlan = (pricingConfig as any)[plan as 'monthly' | 'annual']
    const priceId = countryPlan?.stripePriceId || PRICING[plan as 'monthly' | 'annual'].stripePriceId

    // 4. Crear o recuperar Stripe Customer
    if (!org) {
      return NextResponse.json({ error: 'Datos de organización no encontrados' }, { status: 404 })
    }

    let customerId = org.stripe_customer_id

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
