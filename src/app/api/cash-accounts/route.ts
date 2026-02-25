/**
 * API: Cuentas de efectivo
 * GET /api/cash-accounts - Listar cuentas con saldo actual
 * POST /api/cash-accounts - Crear cuenta
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

export async function GET(request: NextRequest) {
  try {
    const org = await getOrgId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: accounts, error } = await supabaseAdmin
      .from('cash_accounts')
      .select('*')
      .eq('organization_id', org.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching cash_accounts:', error)
      const code = (error as { code?: string })?.code
      const message = code === '42P01' || (error && 'message' in error && String((error as { message?: string }).message || '').includes('does not exist'))
        ? 'Tabla cash_accounts no existe. Ejecuta la migración 044_cash_accounts.sql en Supabase.'
        : (error as { message?: string }).message ?? 'Error al cargar cuentas'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    const items = await Promise.all(
      (accounts || []).map(async (acc) => {
        const current_balance = await computeCurrentBalance(
          supabaseAdmin,
          acc.id,
          Number(acc.initial_balance) || 0
        )
        return { ...acc, current_balance }
      })
    )

    return NextResponse.json({
      success: true,
      data: { items }
    })
  } catch (e) {
    console.error('GET /api/cash-accounts:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  account_number: z.string().optional().default(''),
  account_type: z.enum(['cash', 'bank']).default('cash'),
  initial_balance: z.number().default(0),
  notes: z.string().optional().default('')
})

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: account, error } = await supabaseAdmin
      .from('cash_accounts')
      .insert({
        organization_id: org.organizationId,
        name: parsed.data.name,
        account_number: parsed.data.account_number || null,
        account_type: parsed.data.account_type,
        initial_balance: parsed.data.initial_balance,
        notes: parsed.data.notes || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating cash_account:', error)
      const code = (error as { code?: string })?.code
      const message = code === '42P01' || (error && 'message' in error && String((error as { message?: string }).message || '').includes('does not exist'))
        ? 'Tabla cash_accounts no existe. Ejecuta la migración 044_cash_accounts.sql en Supabase.'
        : (error as { message?: string }).message ?? 'Error al crear cuenta'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    const current_balance = await computeCurrentBalance(
      supabaseAdmin,
      account.id,
      Number(account.initial_balance) || 0
    )

    return NextResponse.json({
      success: true,
      data: { ...account, current_balance }
    })
  } catch (e) {
    console.error('POST /api/cash-accounts:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
