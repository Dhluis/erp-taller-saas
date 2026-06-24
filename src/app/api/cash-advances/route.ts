import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
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
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let query = supabaseAdmin
      .from('cash_advances')
      .select(`
        *,
        employee:users!cash_advances_employee_id_fkey(id, name, email),
        customer:customers(id, name, phone),
        created_by_user:users!cash_advances_created_by_fkey(id, name),
        cash_account:cash_accounts(id, name, account_type),
        expenses(id, amount, description, expense_date, receipt_image_url)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: advances, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, name')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createAdvanceSchema.parse(body);

    const { data: advance, error } = await supabaseAdmin
      .from('cash_advances')
      .insert({
        organization_id: profile.organization_id,
        employee_id: validated.employee_id || null,
        customer_id: validated.customer_id || null,
        amount: validated.amount,
        purpose: validated.purpose,
        notes: validated.notes || null,
        payment_method: validated.payment_method,
        cash_account_id: validated.cash_account_id || null,
        status: 'open',
        created_by: profile.id,
      })
      .select(`
        *,
        employee:users!cash_advances_employee_id_fkey(id, name, email),
        customer:customers(id, name, phone),
        cash_account:cash_accounts(id, name, account_type)
      `)
      .single();

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
          organization_id: profile.organization_id,
          movement_type: 'withdrawal',
          amount: validated.amount,
          notes: `Anticipo (${methodLabels[validated.payment_method]}): ${validated.purpose}`,
          reference_type: 'cash_advance',
          reference_id: (advance as any).id,
          created_by: profile.id,
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
          organization_id: profile.organization_id,
          transaction_type: 'expense',
          category: 'anticipo_efectivo',
          description: `Anticipo (${methodLabels[validated.payment_method]}): ${validated.purpose}`,
          amount: validated.amount,
          account_id: validated.cash_account_id || null,
          reference_type: 'cash_advance',
          reference_id: (advance as any).id,
          created_by: profile.id,
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
          organizationId: profile.organization_id,
          title: 'Anticipo registrado',
          body: `${profile.name || 'El administrador'} registró un anticipo de $${validated.amount.toFixed(2)} para: ${validated.purpose}`,
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
