import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { z } from 'zod';

const createAdvanceSchema = z.object({
  employee_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  purpose: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  payment_method: z.enum(['cash', 'transfer', 'card']).default('cash'),
  cash_account_id: z.string().uuid().optional().nullable(),
});

// GET /api/cash-advances
export async function GET(request: NextRequest) {
  try {
    let tenantCtx: Awaited<ReturnType<typeof getTenantContext>>;
    try {
      tenantCtx = await getTenantContext(request);
    } catch {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    }
    const { organizationId: organization_id } = tenantCtx;

    const supabase = createClientFromRequest(request);
    const supabaseAdmin = (getSupabaseServiceClient() || supabase) as any;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const baseSelect = `
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      created_by_user:users!cash_advances_created_by_fkey(id, name),
      cash_account:cash_accounts(id, name, account_type),
      expenses(id, amount, description, expense_date, receipt_image_url)
    `;

    let queryWithCustomer = supabaseAdmin
      .from('cash_advances')
      .select(`${baseSelect}, customer:customers(id, name, phone)`)
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false }) as any;

    if (status) queryWithCustomer = queryWithCustomer.eq('status', status);

    let { data: advances, error } = await queryWithCustomer;

    // Si falla por columna customer_id inexistente (migración pendiente), reintenta sin el join
    if (error) {
      if (error.code === 'PGRST200' || error.message?.includes('customer')) {
        let queryFallback = supabaseAdmin
          .from('cash_advances')
          .select(baseSelect)
          .eq('organization_id', organization_id)
          .order('created_at', { ascending: false }) as any;
        if (status) queryFallback = queryFallback.eq('status', status);
        const fallback = await queryFallback;
        advances = fallback.data;
        error = fallback.error;
      }
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    const advancesWithBalance = (advances || []).map((adv: any) => {
      const totalSpent = (adv.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const balance = adv.amount - totalSpent;
      return { ...adv, total_spent: totalSpent, balance };
    });

    return NextResponse.json({ success: true, data: advancesWithBalance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/cash-advances
export async function POST(request: NextRequest) {
  try {
    // Usar getTenantContext — misma lógica que el resto de rutas que funcionan
    let tenantCtx: Awaited<ReturnType<typeof getTenantContext>>;
    try {
      tenantCtx = await getTenantContext(request);
    } catch {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    }
    const { organizationId: organization_id } = tenantCtx;

    const supabase = createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    const supabaseAdmin = (getSupabaseServiceClient() || supabase) as any;

    // Obtener id interno del usuario para created_by (fallback a auth user id)
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .or(`auth_user_id.eq.${user?.id},id.eq.${user?.id}`)
      .maybeSingle();
    const createdById: string = profile?.id || user?.id || '';

    const body = await request.json();
    const validated = createAdvanceSchema.parse(body);

    const insertPayload: Record<string, any> = {
      organization_id,
      employee_id: validated.employee_id || null,
      amount: validated.amount,
      purpose: validated.purpose,
      notes: validated.notes || null,
      payment_method: validated.payment_method,
      cash_account_id: validated.cash_account_id || null,
      status: 'open',
      created_by: createdById,
    };
    if (validated.customer_id) insertPayload.customer_id = validated.customer_id;

    // INSERT con RETURNING básico para evitar fallo si customer_id no existe aún
    let { data: inserted, error: insertError } = await (supabaseAdmin as any)
      .from('cash_advances')
      .insert(insertPayload)
      .select()
      .single();

    // Si falla por customer_id inexistente, reintenta sin ese campo
    if (insertError && insertPayload.customer_id) {
      const { customer_id: _removed, ...payloadWithout } = insertPayload;
      const retry = await (supabaseAdmin as any)
        .from('cash_advances')
        .insert(payloadWithout)
        .select()
        .single();
      inserted = retry.data;
      insertError = retry.error;
    }

    const advance = inserted;
    const error = insertError;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const methodLabels: Record<string, string> = {
      cash: 'efectivo',
      transfer: 'transferencia',
      card: 'tarjeta',
    };

    // Registrar salida en la cuenta seleccionada
    if (validated.cash_account_id && advance) {
      const { error: movError } = await (supabaseAdmin as any)
        .from('cash_account_movements')
        .insert({
          cash_account_id: validated.cash_account_id,
          organization_id,
          movement_type: 'withdrawal',
          amount: validated.amount,
          notes: `Anticipo (${methodLabels[validated.payment_method]}): ${validated.purpose}`,
          reference_type: 'cash_advance',
          reference_id: (advance as any).id,
          created_by: createdById,
        });

      if (movError) {
        console.error('[cash-advances] No se pudo registrar movimiento en cuenta:', movError);
      }
    }

    // Registrar en financial_transactions (corrige brecha contable)
    if (advance) {
      await supabaseAdmin
        .from('financial_transactions')
        .insert({
          organization_id,
          transaction_type: 'expense',
          category: 'anticipo_efectivo',
          description: `Anticipo (${methodLabels[validated.payment_method]}): ${validated.purpose}`,
          amount: validated.amount,
          account_id: validated.cash_account_id || null,
          reference_type: 'cash_advance',
          reference_id: (advance as any).id,
          created_by: createdById,
        } as any)
        .then(({ error: ftErr }) => {
          if (ftErr) console.error('[cash-advances] No se pudo registrar en financial_transactions:', ftErr);
        });
    }

    // Notificar al empleado si está registrado
    if (validated.employee_id) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization_id,
          title: 'Anticipo registrado',
          body: `${profile?.name || 'El administrador'} registró un anticipo de $${validated.amount.toFixed(2)} para: ${validated.purpose}`,
          url: '/compras/gastos',
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: advance }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
