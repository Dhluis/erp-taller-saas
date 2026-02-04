import { NextRequest, NextResponse } from 'next/server'
import { 
  updatePurchaseOrder, 
  cancelPurchaseOrder 
} from '@/lib/database/queries/purchase-orders'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// GET /api/purchase-orders/[id] - Obtener orden de compra por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado',
        data: null
      }, { status: 401 });
    }
    
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo obtener organización',
        data: null
      }, { status: 403 });
    }
    
    // Query orden con supplier
    const { data: order, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers (
          id,
          name,
          contact_name,
          email,
          phone
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', userProfile.organization_id)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json({ 
        success: false,
        error: 'Orden no encontrada',
        data: null
      }, { status: 404 });
    }
    
    // Query items con productos
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('purchase_order_items')
      .select(`
        *,
        product:inventory (
          id,
          name,
          current_stock
        )
      `)
      .eq('purchase_order_id', params.id)
      .eq('organization_id', userProfile.organization_id);
    
    if (itemsError) {
      console.error('Error loading items:', itemsError);
    }
    
    // Mapear items con TODOS los campos necesarios
    const mappedItems = (items || []).map((item: any) => ({
      id: item.id,
      product_id: item.product?.id || item.product_id,
      product_name: item.product?.name || 'Producto desconocido',
      product_stock: item.product?.current_stock || 0,
      quantity: item.quantity,
      quantity_received: item.quantity_received || 0,
      unit_cost: parseFloat(item.unit_cost) || 0,
      total: parseFloat(item.total) || 0,
      notes: item.notes
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items: mappedItems
      },
      error: null
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/purchase-orders/[id]:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      data: null
    }, { status: 500 });
  }
}

// PUT /api/purchase-orders/[id] - Actualizar orden de compra
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const updatedOrder = await updatePurchaseOrder(params.id, body)

    return NextResponse.json(
      {
        data: updatedOrder,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in PUT /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al actualizar orden de compra'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Cancelar orden de compra
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason')
    
    const cancelledOrder = await cancelPurchaseOrder(params.id, reason || undefined)

    return NextResponse.json(
      {
        data: cancelledOrder,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in DELETE /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al cancelar orden de compra'
      },
      { status: 500 }
    )
  }
}

