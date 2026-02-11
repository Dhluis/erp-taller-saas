import { NextRequest, NextResponse } from 'next/server'
import { getPreferenceClient } from '@/lib/mercadopago/client'
import { createClient } from '@/lib/supabase/server'
import { PRICING_BY_COUNTRY, type CountryCode } from '@/lib/billing/constants'

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { plan, country } = body as { plan?: string; country?: string }

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const countryCode = (country ?? 'US') as CountryCode
    const countryPricing = PRICING_BY_COUNTRY[countryCode]
    const pricing = countryPricing?.[plan as 'monthly' | 'annual']

    if (!pricing) {
      return NextResponse.json({ error: 'Pricing no disponible para este país' }, { status: 400 })
    }

    const preferenceClient = getPreferenceClient()
    const siteUrl = getBaseUrl()
    if (!siteUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no configurada' }, { status: 500 })
    }

    const title = 'mercadopagoTitle' in pricing
      ? pricing.mercadopagoTitle
      : `Eagles ERP - ${plan === 'monthly' ? 'Mensual' : 'Anual'}`

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: `eagles-erp-${plan}`,
            title,
            description: `Suscripción ${plan === 'monthly' ? 'mensual' : 'anual'} a Eagles ERP`,
            quantity: 1,
            unit_price: pricing.amount,
            currency_id: pricing.currency,
          },
        ],
        payer: { email: profile.email ?? undefined },
        back_urls: {
          success: `${siteUrl}/settings/billing?success=true&processor=mercadopago`,
          failure: `${siteUrl}/settings/billing?error=payment_failed`,
          pending: `${siteUrl}/settings/billing?pending=true`,
        },
        auto_return: 'approved',
        external_reference: profile.organization_id,
        metadata: {
          organization_id: profile.organization_id,
          user_id: user.id,
          plan_type: plan,
          country: countryCode,
        },
        notification_url: `${siteUrl}/api/billing/mercadopago/webhook`,
        statement_descriptor: 'EAGLES ERP',
      },
    })

    const checkoutUrl = preference.init_point ?? (preference as { sandbox_init_point?: string }).sandbox_init_point
    if (!checkoutUrl) {
      console.error('[MercadoPago Checkout] Preference sin init_point')
      return NextResponse.json({ error: 'Error al generar URL de checkout' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl, preferenceId: preference.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear checkout'
    console.error('[MercadoPago Checkout] Error:', error)
    return NextResponse.json({ error: 'Error al crear checkout', details: message }, { status: 500 })
  }
}
