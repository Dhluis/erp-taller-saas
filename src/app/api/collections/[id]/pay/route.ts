/**
 * API: Marcar cobro como pagado y opcionalmente registrar ingreso en cuenta de efectivo
 * PUT /api/collections/[id]/pay
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

const paySchema = z.object({
  payment_method: z.string().min(1, 'Método de pago requerido'),
  cash_account_id: z.string().uuid().optional().nullable()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrgIdAndUserId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id } = await params

    const body = await request.json()
    const parsed = paySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: collection, error: fetchError } = await supabaseAdmin
      .from('collections')
      .select('id, amount, organization_id')
      .eq('id', id)
      .eq('organization_id', org.organizationId)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ success: false, error: 'Cobro no encontrado' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('collections')
      .update({
        status: 'paid',
        payment_method: parsed.data.payment_method,
        paid_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[PUT /api/collections/[id]/pay]', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    if (parsed.data.cash_account_id) {
      const { data: account } = await supabaseAdmin
        .from('cash_accounts')
        .select('id')
        .eq('id', parsed.data.cash_account_id)
        .eq('organization_id', org.organizationId)
        .single()
      if (account) {
        await supabaseAdmin.from('cash_account_movements').insert({
          cash_account_id: parsed.data.cash_account_id,
          organization_id: org.organizationId,
          movement_type: 'deposit',
          amount: Number(collection.amount),
          notes: `Cobro ${id}`,
          reference_type: 'collection',
          reference_id: id,
          created_by: org.userId
        })
      }
    }

    const { data: updated } = await supabaseAdmin
      .from('collections')
      .select()
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error('PUT /api/collections/[id]/pay:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al marcar cobro como pagado' },
      { status: 500 }
    )
  }
}
