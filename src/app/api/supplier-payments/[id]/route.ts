import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

async function getOrgIdAndUserId(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const supabaseAdmin = getSupabaseServiceClient()
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  const profile = data as { id: string, organization_id: string } | null;
  if (!profile?.organization_id) return { error: 'No se pudo obtener organización', status: 403 as const }
  return { organizationId: profile.organization_id, userId: profile.id }
}

const updateSchema = z.object({
  status: z.enum(['pending', 'completed']).optional(),
  cash_account_id: z.string().uuid().optional().nullable()
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  try {
    const org = await getOrgIdAndUserId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const id = id
    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { status, cash_account_id } = parsed.data;
    const supabaseAdmin = getSupabaseServiceClient()

    // Retrieve existing payment to ensure ownership
    const { data: existingPayment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('organization_id', org.organizationId)
      .single()

    if (fetchError || !existingPayment) {
      return NextResponse.json({ success: false, error: 'Pago no encontrado o sin acceso' }, { status: 404 })
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;

    const paymentsQuery = supabaseAdmin.from('payments') as any;
    const { data: rawUpdatedPayment, error: updateError } = await paymentsQuery
      .update(updates)
      .eq('id', id)
      .eq('organization_id', org.organizationId)
      .select()
      .single()

    if (updateError || !rawUpdatedPayment) {
      return NextResponse.json({ success: false, error: updateError?.message || 'Error al actualizar' }, { status: 500 })
    }

    const updatedPayment = rawUpdatedPayment as { id: string };

    if (status === 'completed' && cash_account_id && (existingPayment as any).status !== 'completed') {
       const { data: account } = await supabaseAdmin
        .from('cash_accounts')
        .select('id')
        .eq('id', cash_account_id)
        .eq('organization_id', org.organizationId)
        .single()

      if (account) {
        const movementData: any = {
          cash_account_id,
          organization_id: org.organizationId,
          movement_type: 'withdrawal',
          amount: (existingPayment as any).amount,
          notes: `Pago a proveedor ${updatedPayment.id}`,
          reference_type: 'supplier_payment',
          reference_id: updatedPayment.id,
          created_by: org.userId
        };
        await supabaseAdmin.from('cash_account_movements').insert(movementData);
      }
    }

    return NextResponse.json({ success: true, data: rawUpdatedPayment })
  } catch (e) {
    console.error(`PATCH /api/supplier-payments/[id]:`, e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al actualizar pago' },
      { status: 500 }
    )
  }
}
