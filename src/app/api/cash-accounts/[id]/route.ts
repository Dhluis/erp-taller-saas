/**
 * API: Una cuenta de efectivo
 * GET /api/cash-accounts/[id] - Detalle con saldo actual
 * PUT /api/cash-accounts/[id] - Actualizar cuenta
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

async function getOrgId(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const supabaseAdmin = getSupabaseServiceClient()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.organization_id) return { error: 'No se pudo obtener organización', status: 403 as const }
  return { organizationId: profile.organization_id }
}

async function computeCurrentBalance(supabaseAdmin: any, accountId: string, initialBalance: number) {
  const { data: movs } = await supabaseAdmin
    .from('cash_account_movements')
    .select('movement_type, amount')
    .eq('cash_account_id', accountId)
  let delta = 0
  for (const m of movs || []) {
    if (m.movement_type === 'deposit' || m.movement_type === 'adjustment') delta += Number(m.amount)
    else if (m.movement_type === 'withdrawal') delta -= Number(m.amount)
  }
  return initialBalance + delta
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrgId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id } = await params

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: account, error } = await supabaseAdmin
      .from('cash_accounts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', org.organizationId)
      .single()

    if (error || !account) {
      return NextResponse.json({ success: false, error: 'Cuenta no encontrada' }, { status: 404 })
    }

    const current_balance = await computeCurrentBalance(supabaseAdmin, id, Number(account.initial_balance) || 0)
    return NextResponse.json({
      success: true,
      data: { ...account, current_balance }
    })
  } catch (e) {
    console.error('GET /api/cash-accounts/[id]:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  account_number: z.string().optional(),
  account_type: z.enum(['cash', 'bank']).optional(),
  initial_balance: z.number().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrgId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id } = await params

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: account, error } = await supabaseAdmin
      .from('cash_accounts')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', org.organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating cash_account:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    if (!account) {
      return NextResponse.json({ success: false, error: 'Cuenta no encontrada' }, { status: 404 })
    }

    const current_balance = await computeCurrentBalance(supabaseAdmin, id, Number(account.initial_balance) || 0)
    return NextResponse.json({
      success: true,
      data: { ...account, current_balance }
    })
  } catch (e) {
    console.error('PUT /api/cash-accounts/[id]:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
