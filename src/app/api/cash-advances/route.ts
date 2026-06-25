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

// Helper: autenticar y obtener organization_id sin depender de getTenantContext
async function getOrgAndAdmin(request: NextRequest): Promise<{ organization_id: string; supabaseAdmin: any } | null> {
  try {
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const serviceClient = getSupabaseServiceClient();
    const supabaseAdmin = (serviceClient || supabase) as any;

    // Buscar por auth_user_id primero
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile?.organization_id) {
      return { organization_id: profile.organization_id, supabaseAdmin };
    }

    // Fallback por id interno
    const { data: profile2 } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile2?.organization_id) {
      return { organization_id: profile2.organization_id, supabaseAdmin };
    }

    return null;
  } catch (e: any) {
    console.error('[cash-advances] getOrgAndAdmin error:', e?.message);
    return null;
  }
}

// GET /api/cash-advances
export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgAndAdmin(request);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    }
    const { organization_id, supabaseAdmin } = ctx;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // Determina si el error es un problema de esquema (falta columna/relación)
    const isSchemaErr = (err: any) =>
      !!err && (
        err.code === 'PGRST200' ||
        err.code?.startsWith('42') ||
        String(err.message).includes('does not exist') ||
        String(err.message).includes('relationship') ||
        String(err.message).includes('column')
      );

    // Construir queries con diferentes niveles de joins (de más completo a más simple)
    const buildQuery = (selectStr: string) => {
      let q = supabaseAdmin
        .from('cash_advances')
        .select(selectStr)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      return q;
    };

    // Nivel 1: joins completos (customer + cash_account + expenses + employee + name)
    const fullSelect = `
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      created_by_user:users!cash_advances_created_by_fkey(id, name),
      cash_account:cash_accounts(id, name, account_type),
      expenses(id, amount, description, expense_date, receipt_image_url),
      customer:customers(id, name, phone)
    `;
    // Nivel 2: sin customer
    const noCustomerSelect = `
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      created_by_user:users!cash_advances_created_by_fkey(id, name),
      cash_account:cash_accounts(id, name, account_type),
      expenses(id, amount, description, expense_date, receipt_image_url)
    `;
    // Nivel 3: sin joins opcionales que dependen de migraciones (expenses/cash_account)
    const minimalSelect = `
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      created_by_user:users!cash_advances_created_by_fkey(id, name)
    `;
    // Nivel 4: sin name (si users.name no existe en producción — migración 021 pendiente)
    const noNameSelect = `
      *,
      employee:users!cash_advances_employee_id_fkey(id, email),
      created_by_user:users!cash_advances_created_by_fkey(id)
    `;
    // Nivel 5: sin FK joins — siempre funciona
    const bareSelect = '*';

    let result = await buildQuery(fullSelect);
    if (isSchemaErr(result.error)) result = await buildQuery(noCustomerSelect);
    if (isSchemaErr(result.error)) result = await buildQuery(minimalSelect);
    if (isSchemaErr(result.error)) result = await buildQuery(noNameSelect);
    if (isSchemaErr(result.error)) result = await buildQuery(bareSelect);

    if (result.error) {
      console.error('[cash-advances GET] Error final:', result.error?.code, result.error?.message);
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    const advances = (result.data || []).map((adv: any) => {
      const totalSpent = (adv.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      return { ...adv, total_spent: totalSpent, balance: adv.amount - totalSpent };
    });

    return NextResponse.json({ success: true, data: advances });
  } catch (error: any) {
    console.error('[cash-advances GET] Unhandled error:', error?.message, error?.code);
    return NextResponse.json({ success: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}

// POST /api/cash-advances
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgAndAdmin(request);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    }
    const { organization_id, supabaseAdmin } = ctx;

    // Obtener el usuario para created_by
    const supabase = createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
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

    let { data: inserted, error: insertError } = await supabaseAdmin
      .from('cash_advances')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback: si falla por customer_id inexistente, reintentar sin ese campo
    if (insertError && insertPayload.customer_id) {
      console.warn('[cash-advances POST] Reintentando sin customer_id:', insertError?.code);
      const { customer_id: _removed, ...payloadWithout } = insertPayload;
      const retry = await supabaseAdmin
        .from('cash_advances')
        .insert(payloadWithout)
        .select()
        .single();
      inserted = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error('[cash-advances POST] Insert error:', insertError?.message);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    const methodLabels: Record<string, string> = { cash: 'efectivo', transfer: 'transferencia', card: 'tarjeta' };

    // Registrar movimiento en cuenta
    if (validated.cash_account_id && inserted) {
      const { error: movError } = await supabaseAdmin
        .from('cash_account_movements')
        .insert({
          cash_account_id: validated.cash_account_id,
          organization_id,
          movement_type: 'withdrawal',
          amount: validated.amount,
          notes: `Anticipo (${methodLabels[validated.payment_method]}): ${validated.purpose}`,
          reference_type: 'cash_advance',
          reference_id: inserted.id,
          created_by: createdById,
        });
      if (movError) console.error('[cash-advances] movimiento cuenta error:', movError?.message);
    }

    // Registrar en financial_transactions (brecha contable)
    if (inserted) {
      supabaseAdmin
        .from('financial_transactions')
        .insert({
          organization_id,
          transaction_type: 'expense',
          category: 'anticipo_efectivo',
          description: `Anticipo (${methodLabels[validated.payment_method]}): ${validated.purpose}`,
          amount: validated.amount,
          account_id: validated.cash_account_id || null,
          reference_type: 'cash_advance',
          reference_id: inserted.id,
          created_by: createdById,
        } as any)
        .then(({ error: ftErr }: { error: any }) => {
          if (ftErr) console.error('[cash-advances] financial_transactions error:', ftErr?.message);
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (error: any) {
    console.error('[cash-advances POST] Unhandled error:', error?.message);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
