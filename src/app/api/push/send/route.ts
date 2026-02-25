import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'admin@eaglessystem.io'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys no configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)')
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
}

export async function POST(request: NextRequest) {
  try {
    configureWebPush()

    const { organizationId, title, body, url } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'organizationId requerido' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('organization_id', organizationId) as { data: any[]; error: any }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Sin suscriptores' })
    }

    const payload = JSON.stringify({ title, body, url: url || '/dashboard' })
    let sent = 0
    const failed: string[] = []

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch (err: any) {
          failed.push(sub.endpoint.substring(0, 40))
          // Si el endpoint ya no es válido (410 Gone), eliminarlo
          if (err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      })
    )

    return NextResponse.json({ success: true, sent, failed: failed.length })
  } catch (err: any) {
    console.error('[POST /api/push/send]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
