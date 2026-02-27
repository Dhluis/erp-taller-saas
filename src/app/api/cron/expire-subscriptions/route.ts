import { NextRequest, NextResponse } from 'next/server'
import { expireSubscriptions } from '@/lib/billing/expire-subscriptions'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  // Vercel Cron envía: Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  // Alternativa para crons externos: ?secret=...
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') === secret) return true

  return false
}

/**
 * GET/POST /api/cron/expire-subscriptions
 * Baja a Free las organizaciones Premium cuyo período ya venció.
 * Debe ser llamado por un cron (Vercel Cron o externo) con CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await expireSubscriptions()
    return NextResponse.json({
      ok: result.ok,
      downgradedCount: result.downgradedCount,
      organizationIds: result.organizationIds,
      error: result.error,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/expire-subscriptions]', err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
