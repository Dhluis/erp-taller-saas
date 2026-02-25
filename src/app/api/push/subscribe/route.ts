import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { organizationId, userId } = await getTenantContext(request)

    if (!organizationId || !userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const subscription = await request.json()

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Suscripción inválida' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          organization_id: organizationId,
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        } as any,
        { onConflict: 'user_id,endpoint' }
      )

    if (error) {
      console.error('[Push Subscribe]', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[POST /api/push/subscribe]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { organizationId, userId } = await getTenantContext(request)

    if (!organizationId || !userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { endpoint } = await request.json()

    const supabase = getSupabaseServiceClient()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
