/**
 * API: Arqueo de caja (cierres por cuenta)
 * GET /api/cash-closures - Listar
 * POST /api/cash-closures - Crear cierre
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getCashClosures, createCashClosure } from '@/lib/database/queries/cash-closures'
import { isSupabaseTableMissingError, MIGRATION_045_MESSAGE } from '@/lib/supabase/table-missing'
import { z } from 'zod'

async function getOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const admin = getSupabaseServiceClient()
  const { data: profile } = await admin.from('users').select('id, organization_id').eq('auth_user_id', user.id).single()
  if (!profile?.organization_id) return { error: 'Organización no encontrada', status: 403 as const }
  return { organizationId: profile.organization_id, userId: profile.id }
}

async function getAccountBalance(supabaseAdmin: ReturnType<typeof getSupabaseServiceClient>, accountId: string): Promise<number> {
  const { data: acc } = await supabaseAdmin.from('cash_accounts').select('initial_balance').eq('id', accountId).single()
  const initial = Number(acc?.initial_balance ?? 0)
  const { data: movs } = await supabaseAdmin
    .from('cash_account_movements')
    .select('movement_type, amount')
    .eq('cash_account_id', accountId)
  let delta = 0
  for (const m of movs || []) {
    if (m.movement_type === 'deposit' || m.movement_type === 'adjustment') delta += Number(m.amount)
    else if (m.movement_type === 'withdrawal') delta -= Number(m.amount)
  }
  return initial + delta
}

const createSchema = z.object({
  cash_account_id: z.string().uuid(),
  closing_balance: z.number(),
  counted_amount: z.number(),
  notes: z.string().optional().nullable()
})

export async function GET(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const cash_account_id = request.nextUrl.searchParams.get('cash_account_id') || undefined
    const from = request.nextUrl.searchParams.get('from') || undefined
    const to = request.nextUrl.searchParams.get('to') || undefined
    const list = await getCashClosures(org.organizationId, { cash_account_id, from, to })
    return NextResponse.json({ success: true, data: list })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          migrationRequired: true,
          message: MIGRATION_045_MESSAGE
        },
        { status: 200 }
      )
    }
    console.error('GET /api/cash-closures:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const admin = getSupabaseServiceClient()
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    const { data: account } = await admin
      .from('cash_accounts')
      .select('id')
      .eq('id', parsed.data.cash_account_id)
      .eq('organization_id', org.organizationId)
      .single()
    if (!account) return NextResponse.json({ success: false, error: 'Cuenta no encontrada' }, { status: 404 })
    const openingBalance = await getAccountBalance(admin, parsed.data.cash_account_id)
    const closure = await createCashClosure(
      org.organizationId,
      {
        cash_account_id: parsed.data.cash_account_id,
        closing_balance: parsed.data.closing_balance,
        counted_amount: parsed.data.counted_amount,
        notes: parsed.data.notes ?? undefined
      },
      openingBalance,
      org.userId
    )
    return NextResponse.json({ success: true, data: closure })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        {
          success: false,
          error: MIGRATION_045_MESSAGE,
          code: 'MIGRATION_REQUIRED',
          migration: '045'
        },
        { status: 503 }
      )
    }
    console.error('POST /api/cash-closures:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
