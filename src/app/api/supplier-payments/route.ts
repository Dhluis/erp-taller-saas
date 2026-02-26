/**
 * API: Pagos a proveedores (Compras)
 * GET /api/supplier-payments - Listar pagos a proveedores (supplier_id no nulo)
 * POST /api/supplier-payments - Registrar pago y opcional retiro en cuenta de efectivo
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

export async function GET(request: NextRequest) {
  try {
    const org = await getOrgIdAndUserId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const { searchParams } = request.nextUrl
    const supplierId = searchParams.get('supplier_id') || undefined
    const dateFrom = searchParams.get('date_from') || undefined
    const dateTo = searchParams.get('date_to') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const supabaseAdmin = getSupabaseServiceClient()
    let query = supabaseAdmin
      .from('payments')
      .select('id, supplier_id, amount, payment_date, payment_method, reference, notes, status, created_at')
      .eq('organization_id', org.organizationId)
      .not('supplier_id', 'is', null)
      .order('payment_date', { ascending: false })
      .limit(limit)

    if (supplierId) query = query.eq('supplier_id', supplierId)
    if (dateFrom) query = query.gte('payment_date', dateFrom)
    if (dateTo) query = query.lte('payment_date', dateTo)

    const { data: items, error } = await query

    if (error) {
      console.error('[GET /api/supplier-payments]', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const payments = items || []
    const stats = {
      total: payments.length,
      totalPaid: payments.filter((p: { status?: string }) => p.status === 'completed' || p.status === 'paid').reduce((s: number, p: { amount?: number }) => s + Number(p.amount || 0), 0),
      totalPending: payments.filter((p: { status?: string }) => p.status === 'pending').reduce((s: number, p: { amount?: number }) => s + Number(p.amount || 0), 0)
    }

    return NextResponse.json({
      success: true,
      data: { items: payments, stats }
    })
  } catch (e) {
    console.error('GET /api/supplier-payments:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al listar pagos' },
      { status: 500 }
    )
  }
}

const createSchema = z.object({
  supplier_id: z.string().uuid('Proveedor requerido'),
  amount: z.number().positive('Monto debe ser mayor a 0'),
  payment_date: z.string().min(1, 'Fecha de pago requerida'),
  payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'check', 'other', 'transfer']).default('transfer'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed']).optional().default('completed'),
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
    const { cash_account_id, ...rest } = parsed.data

    const insertData = {
      organization_id: org.organizationId,
      supplier_id: rest.supplier_id,
      amount: rest.amount,
      payment_date: rest.payment_date,
      payment_method: rest.payment_method,
      reference: rest.reference ?? null,
      notes: rest.notes ?? null,
      status: rest.status
    }

    const { data: payment, error: insertError } = await supabaseAdmin
      .from('payments')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/supplier-payments]', insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    if (cash_account_id) {
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
          movement_type: 'withdrawal',
          amount: parsed.data.amount,
          notes: `Pago a proveedor ${payment.id}`,
          reference_type: 'supplier_payment',
          reference_id: payment.id,
          created_by: org.userId
        })
      }
    }

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (e) {
    console.error('POST /api/supplier-payments:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al registrar pago' },
      { status: 500 }
    )
  }
}
