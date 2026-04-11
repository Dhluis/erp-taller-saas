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

    // 2. Obtener organización robustamente (Servidor)
    const { getOrganizationId } = await import('@/lib/auth/organization-server');
    let organizationId: string;
    try {
      organizationId = await getOrganizationId(request);
    } catch (e: any) {
      console.error('[Stripe Checkout] Error obteniendo org:', e.message);
      return NextResponse.json({ error: 'No se pudo identificar tu organización' }, { status: 404 });
    }

    // 3. Obtener datos del perfil y organización usando Service Role
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const adminClient = getSupabaseServiceClient() || supabase;

    const { data: profile } = await adminClient
      .from('users')
      .select('full_name, email')
      .eq('auth_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: org } = await adminClient
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', organizationId)
      .maybeSingle();

    // 4. Obtener el plan seleccionado del body
    const body = await request.json()
    const { plan, country } = body 

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // Obtener el precio correcto basado en el país (soporte multi-moneda)
    const pricingConfig = getPricingByCountry(country as CountryCode)
    
    // Castear a any temporalmente para acceder a stripePriceId ya que no todos los países lo tienen definido aún
    const countryPlan = (pricingConfig as any)[plan as 'monthly' | 'annual']
    const priceId = countryPlan?.stripePriceId || PRICING[plan as 'monthly' | 'annual'].stripePriceId

    console.log('[Stripe Checkout] Generando sesión:', {
      plan,
      country,
      selectedPriceId: priceId,
      isLocalPrice: !!countryPlan?.stripePriceId
    })

    // 4. Crear o recuperar Stripe Customer
    if (!org) {
      return NextResponse.json({ error: 'Datos de organización no encontrados' }, { status: 404 })
    }

    let customerId = org?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: org?.name || profile?.full_name || user.email?.split('@')[0],
        metadata: {
          organization_id: organizationId,
          user_id: user.id
        }
      })
      customerId = customer.id

      // Guardar customer ID en la BD
      await adminClient
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId)
    }

    // 6. Crear Checkout Session con Reintento (Fallback)
    let session;
    try {
      console.log(`[Stripe Checkout] Intentando crear sesión con ID: ${priceId}`);
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io'}/settings/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io'}/settings/billing?canceled=true`,
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
          plan: plan,
          pricing_country: country || 'US',
          attempt: 'primary'
        },
        subscription_data: {
          metadata: {
            organization_id: organizationId,
          }
        }
      })
    } catch (primaryError: any) {
      console.error(`[Stripe Checkout] Error en intento primario (${priceId}):`, primaryError.message);
      
      const fallbackPriceId = PRICING[plan as 'monthly' | 'annual'].stripePriceId;
      
      // Si el error fue con un ID local y el ID local es distinto al global, intentamos con el Global (USD)
      if (priceId !== fallbackPriceId) {
        console.log(`[Stripe Checkout] Reintentando con ID de respaldo (USD): ${fallbackPriceId}...`);
        try {
          session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
              {
                price: fallbackPriceId,
                quantity: 1,
              },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io'}/settings/billing?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io'}/settings/billing?canceled=true`,
            metadata: {
              organization_id: organizationId,
              user_id: user.id,
              plan: plan,
              pricing_country: 'US',
              attempt: 'fallback_usd'
            },
            subscription_data: {
              metadata: {
                organization_id: organizationId,
              }
            }
          });
          console.log('[Stripe Checkout] Sesión de respaldo creada con éxito.');
        } catch (fallbackError: any) {
          console.error('[Stripe Checkout] Fallo total (Incluso el respaldo):', fallbackError.message);
          throw fallbackError;
        }
      } else {
        // Si ya estábamos usando el ID global, no hay más respaldos
        throw primaryError;
      }
    }

    if (!session?.url) {
      throw new Error('No se pudo generar la URL de pago');
    }

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
