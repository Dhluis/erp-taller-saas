import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';

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

    const { data: advance } = await supabaseAdmin
      .from('cash_advances')
      .select('id, status, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!advance) {
      return NextResponse.json({ success: false, error: 'Anticipo no encontrado' }, { status: 404 });
    }

    if (advance.status !== 'open') {
      return NextResponse.json({ success: false, error: 'Solo se pueden cerrar anticipos abiertos' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
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

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/cash-advances/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: profile } = await supabaseAdmin.from('users').select('organization_id').eq('auth_user_id', user.id).single()
    if (!profile?.organization_id) return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 })

    const { data: existing } = await supabaseAdmin.from('cash_advances').select('id').eq('id', id).eq('organization_id', profile.organization_id).single()
    if (!existing) return NextResponse.json({ success: false, error: 'Anticipo no encontrado' }, { status: 404 })

    const { error } = await supabaseAdmin.from('cash_advances').delete().eq('id', id).eq('organization_id', profile.organization_id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// GET /api/cash-advances/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const { data: advance, error } = await supabaseAdmin
      .from('cash_advances')
      .select(`
        *,
        employee:users!cash_advances_employee_id_fkey(id, name, email),
        customer:customers(id, name, phone),
        created_by_user:users!cash_advances_created_by_fkey(id, name),
        expenses(id, amount, description, expense_date, receipt_image_url, payment_method)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (error || !advance) {
      return NextResponse.json({ success: false, error: 'Anticipo no encontrado' }, { status: 404 });
    }

    const totalSpent = ((advance as any).expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const balance = (advance as any).amount - totalSpent;

    return NextResponse.json({ success: true, data: { ...advance, total_spent: totalSpent, balance } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
