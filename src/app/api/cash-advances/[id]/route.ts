import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';

async function getOrg(request: NextRequest): Promise<{ organizationId: string; admin: any } | null> {
  try {
    const supabase = createClientFromRequest(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const serviceClient = getSupabaseServiceClient();
    const admin = (serviceClient || supabase) as any;

    const { data: profile } = await admin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile?.organization_id) return { organizationId: profile.organization_id, admin };

    const { data: p2 } = await admin
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (p2?.organization_id) return { organizationId: p2.organization_id, admin };
    return null;
  } catch {
    return null;
  }
}

// PATCH /api/cash-advances/[id] - Cerrar o cancelar anticipo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!['closed', 'cancelled'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
    }

    const ctx = await getOrg(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    const { organizationId, admin } = ctx;

    const { data: advance } = await admin
      .from('cash_advances')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!advance) return NextResponse.json({ success: false, error: 'Anticipo no encontrado' }, { status: 404 });
    if (advance.status !== 'open') return NextResponse.json({ success: false, error: 'Solo se pueden cerrar anticipos abiertos' }, { status: 400 });

    const { data: updated, error } = await admin
      .from('cash_advances')
      .update({
        status,
        notes: notes || null,
        closed_at: status === 'closed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// DELETE /api/cash-advances/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getOrg(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    const { organizationId, admin } = ctx;

    const { data: existing } = await admin.from('cash_advances').select('id').eq('id', id).eq('organization_id', organizationId).single();
    if (!existing) return NextResponse.json({ success: false, error: 'Anticipo no encontrado' }, { status: 404 });

    const { error } = await admin.from('cash_advances').delete().eq('id', id).eq('organization_id', organizationId);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// GET /api/cash-advances/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getOrg(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 });
    const { organizationId, admin } = ctx;

    const isSchemaErr = (err: any) =>
      !!err && (
        err.code === 'PGRST200' ||
        err.code?.startsWith('42') ||
        String(err.message).includes('does not exist') ||
        String(err.message).includes('relationship') ||
        String(err.message).includes('column')
      );

    const buildQ = (sel: string) =>
      admin.from('cash_advances').select(sel).eq('id', id).eq('organization_id', organizationId).single();

    let result = await buildQ(`
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      customer:customers(id, name, phone),
      created_by_user:users!cash_advances_created_by_fkey(id, name),
      expenses(id, amount, description, expense_date, receipt_image_url, payment_method)
    `);
    if (isSchemaErr(result.error)) result = await buildQ(`
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      created_by_user:users!cash_advances_created_by_fkey(id, name),
      expenses(id, amount, description, expense_date, receipt_image_url, payment_method)
    `);
    if (isSchemaErr(result.error)) result = await buildQ(`
      *,
      employee:users!cash_advances_employee_id_fkey(id, name, email),
      created_by_user:users!cash_advances_created_by_fkey(id, name)
    `);
    if (isSchemaErr(result.error)) result = await buildQ(`
      *,
      employee:users!cash_advances_employee_id_fkey(id, email),
      created_by_user:users!cash_advances_created_by_fkey(id)
    `);
    if (isSchemaErr(result.error)) result = await buildQ('*');

    if (result.error || !result.data) {
      return NextResponse.json({ success: false, error: 'Anticipo no encontrado' }, { status: 404 });
    }

    const advance = result.data;
    const totalSpent = (advance.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    return NextResponse.json({ success: true, data: { ...advance, total_spent: totalSpent, balance: advance.amount - totalSpent } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
