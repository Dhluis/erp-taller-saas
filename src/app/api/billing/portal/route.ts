import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

const BILLING_RETURN_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
  : 'https://confiadrive.io/settings/billing'

/**
 * POST /api/billing/portal
 * Crea una sesión del Stripe Customer Portal para que el usuario administre su suscripción.
 * Solo para organizaciones Premium con suscripción activa.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { getOrganizationId } = await import('@/lib/auth/organization-server');
    let organizationId: string;
    try {
      organizationId = await getOrganizationId();
    } catch (e: any) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const adminClient = getSupabaseServiceClient() || supabase;

    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_customer_id, plan_tier, subscription_status')
      .eq('id', organizationId)
      .maybeSingle();

    if (!org?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No hay cuenta de facturación asociada. Suscríbete primero a Premium.' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: BILLING_RETURN_URL,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al abrir el portal de facturación'
    console.error('[Billing Portal] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

