import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';

// POST /api/purchase-orders/[id]/approve - Aprobar orden de compra
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // 1. Auth — quién está aprobando
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();

    // 2. Obtener perfil del aprobador
    const { data: approverProfile } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, name, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!approverProfile?.organization_id) {
      return NextResponse.json({ success: false, error: 'Perfil no encontrado' }, { status: 403 });
    }

    // 3. Verificar que la orden pertenece a la organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, status, order_number, total, created_by, organization_id')
      .eq('id', orderId)
      .eq('organization_id', approverProfile.organization_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.status === 'confirmed') {
      return NextResponse.json({ success: false, error: 'La orden ya fue aprobada' }, { status: 400 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'No se puede aprobar una orden cancelada' }, { status: 400 });
    }

    // 4. Aprobar: cambiar status + registrar quién y cuándo
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('purchase_orders')
      .update({
        status: 'confirmed',
        approved_by: approverProfile.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      return NextResponse.json({ success: false, error: 'Error al aprobar la orden' }, { status: 500 });
    }

    // 5. Notificación push a quien creó la orden (fire-and-forget)
    if (order.created_by && order.created_by !== approverProfile.id) {
      const approverName = approverProfile.name || 'El administrador';
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: approverProfile.organization_id,
          title: 'Compra aprobada',
          body: `${approverName} aprobó la orden ${order.order_number}`,
          url: `/compras/ordenes/${orderId}`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      error: null,
    });
  } catch (error: any) {
    console.error('Error in POST /api/purchase-orders/[id]/approve:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al aprobar orden' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-orders/[id]/reject - Rechazar orden de compra
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const rejectionNote = body.note || '';

    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();

    const { data: approverProfile } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, name')
      .eq('auth_user_id', user.id)
      .single();

    if (!approverProfile?.organization_id) {
      return NextResponse.json({ success: false, error: 'Perfil no encontrado' }, { status: 403 });
    }

    const { data: order } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, status, order_number, created_by, organization_id')
      .eq('id', orderId)
      .eq('organization_id', approverProfile.organization_id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('purchase_orders')
      .update({
        status: 'cancelled',
        rejected_by: approverProfile.id,
        rejected_at: new Date().toISOString(),
        rejection_note: rejectionNote || null,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Error al rechazar' }, { status: 500 });
    }

    // Notificación push al creador
    if (order.created_by && order.created_by !== approverProfile.id) {
      const approverName = approverProfile.name || 'El administrador';
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: approverProfile.organization_id,
          title: 'Compra rechazada',
          body: `${approverName} rechazó la orden ${order.order_number}${rejectionNote ? ': ' + rejectionNote : ''}`,
          url: `/compras/ordenes/${orderId}`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updatedOrder, error: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
