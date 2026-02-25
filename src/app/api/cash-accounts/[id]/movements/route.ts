/**
 * API: Movimientos de una cuenta de efectivo
 * GET /api/cash-accounts/[id]/movements - Listar movimientos
 * POST /api/cash-accounts/[id]/movements - Crear movimiento (ingreso/retiro)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

async function getOrgIdAndUserId(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const supabaseAdmin = getSupabaseServiceClient()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.organization_id) return { error: 'No se pudo obtener organización', status: 403 as const }
  return { organizationId: profile.organization_id, userId: profile.id }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrgIdAndUserId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id: accountId } = await params

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: account } = await supabaseAdmin
      .from('cash_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('organization_id', org.organizationId)
      .single()
    if (!account) {
      return NextResponse.json({ success: false, error: 'Cuenta no encontrada' }, { status: 404 })
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200)
    const { data: movements, error } = await supabaseAdmin
      .from('cash_account_movements')
      .select('*')
      .eq('cash_account_id', accountId)
      .eq('organization_id', org.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching movements:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: movements || []
    })
  } catch (e) {
    console.error('GET /api/cash-accounts/[id]/movements:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

const movementSchema = z.object({
  movement_type: z.enum(['deposit', 'withdrawal', 'adjustment']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  notes: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional().nullable()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrgIdAndUserId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id: accountId } = await params

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: account } = await supabaseAdmin
      .from('cash_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('organization_id', org.organizationId)
      .single()
    if (!account) {
      return NextResponse.json({ success: false, error: 'Cuenta no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = movementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { data: movement, error } = await supabaseAdmin
      .from('cash_account_movements')
      .insert({
        cash_account_id: accountId,
        organization_id: org.organizationId,
        movement_type: parsed.data.movement_type,
        amount: parsed.data.amount,
        notes: parsed.data.notes ?? null,
        reference_type: parsed.data.reference_type ?? null,
        reference_id: parsed.data.reference_id ?? null,
        created_by: org.userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating movement:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: movement
    })
  } catch (e) {
    console.error('POST /api/cash-accounts/[id]/movements:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
