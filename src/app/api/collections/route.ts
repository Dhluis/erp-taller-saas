/**
 * API: Cobros (Collections)
 * POST /api/collections - Crear cobro y opcionalmente registrar ingreso en cuenta de efectivo
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

const createSchema = z.object({
  customer_id: z.string().min(1, 'Cliente requerido'),
  amount: z.number().positive('Monto debe ser mayor a 0'),
  currency: z.string().optional().default('USD'),
  due_date: z.string().min(1, 'Fecha de vencimiento requerida'),
  notes: z.string().optional(),
  reference_number: z.string().optional(),
  payment_method: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional().default('pending'),
  cash_account_id: z.string().uuid().optional().nullable()
})

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgIdAndUserId(request)
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
    const { status, cash_account_id, ...rest } = parsed.data

    const insertData = {
      organization_id: org.organizationId,
      ...rest,
      status: status as 'pending' | 'paid' | 'overdue' | 'cancelled',
      ...(status === 'paid' ? {
        payment_method: parsed.data.payment_method || 'cash',
        paid_date: new Date().toISOString().split('T')[0]
      } : {})
    }

    const { data: collection, error: insertError } = await supabaseAdmin
      .from('collections')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/collections]', insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    if (status === 'paid' && cash_account_id) {
      const { data: account } = await supabaseAdmin
        .from('cash_accounts')
        .select('id')
        .eq('id', cash_account_id)
        .eq('organization_id', org.organizationId)
        .single()
      if (account) {
        await supabaseAdmin.from('cash_account_movements').insert({
          cash_account_id,
          organization_id: org.organizationId,
          movement_type: 'deposit',
          amount: parsed.data.amount,
          notes: `Cobro ${collection.id}`,
          reference_type: 'collection',
          reference_id: collection.id,
          created_by: org.userId
        })
      }
    }

    return NextResponse.json({ success: true, data: collection }, { status: 201 })
  } catch (e) {
    console.error('POST /api/collections:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al crear cobro' },
      { status: 500 }
    )
  }
}
