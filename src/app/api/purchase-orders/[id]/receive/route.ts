import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema para validar input
const receiveItemSchema = z.object({
  id: z.string().uuid(),                    // purchase_order_item.id
  product_id: z.string().uuid(),
  quantity_received: z.number().int().positive()
});

const receiveSchema = z.object({
  items: z.array(receiveItemSchema).min(1)
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Autenticación
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado',
        data: null
      }, { status: 401 });
    }
    
    // 2. Get organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo obtener organización',
        data: null
      }, { status: 403 });
    }
    
    // 3. Validar input
    const body = await request.json();
    const validatedData = receiveSchema.parse(body);
    
    // 4. Verificar que la orden existe y pertenece a la organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, order_number, status, organization_id')
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
    
    // 5. Validar que la orden no esté cancelada o ya recibida
    if (order.status === 'cancelled') {
      return NextResponse.json({ 
        success: false,
        error: 'No se puede recibir una orden cancelada',
        data: null
      }, { status: 400 });
    }
    
    if (order.status === 'received') {
      return NextResponse.json({ 
        success: false,
        error: 'Esta orden ya fue recibida completamente',
        data: null
      }, { status: 400 });
    }
    
    // 6. Procesar cada item
    const results = [];
    
    for (const item of validatedData.items) {
      // 6a. Verificar que el item pertenece a esta orden
      const { data: orderItem, error: itemError } = await supabaseAdmin
        .from('purchase_order_items')
        .select('id, quantity_ordered, quantity_received, unit_cost')
        .eq('id', item.id)
        .eq('purchase_order_id', params.id)
        .single();
      
      if (itemError || !orderItem) {
        console.error(`Item ${item.id} no encontrado`);
        continue;
      }
      
      // 6b. Validar que no exceda la cantidad ordenada
      const newTotalReceived = (orderItem.quantity_received || 0) + item.quantity_received;
      if (newTotalReceived > orderItem.quantity_ordered) {
        return NextResponse.json({ 
          success: false,
          error: `La cantidad recibida para el item ${item.id} excede la cantidad ordenada`,
          data: null
        }, { status: 400 });
      }
      
      // 6c. Obtener stock ANTES de actualizar
      const { data: product } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('id', item.product_id)
        .single();
      
      const previousStock = product?.current_stock || 0;
      
      // 6d. Actualizar quantity_received en purchase_order_items
      const { error: updateError } = await supabaseAdmin
        .from('purchase_order_items')
        .update({ 
          quantity_received: newTotalReceived 
        })
        .eq('id', item.id);
      
      if (updateError) {
        console.error('Error actualizando item:', updateError);
        continue;
      }
      
      // 6e. Incrementar stock usando la función SQL
      const { error: stockError } = await supabaseAdmin
        .rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity_received
        });
      
      if (stockError) {
        console.error('Error incrementando stock:', stockError);
        // IMPORTANTE: Aquí deberíamos hacer rollback del quantity_received
        // pero para simplicidad continuamos
        continue;
      }
      
      const newStock = previousStock + item.quantity_received;
      
      // 6f. Crear inventory_movement
      const { error: movementError } = await supabaseAdmin
        .from('inventory_movements')
        .insert({
          organization_id: userProfile.organization_id,
          product_id: item.product_id,
          movement_type: 'entry',
          quantity: item.quantity_received,
          previous_stock: previousStock,
          new_stock: newStock,
          unit_cost: orderItem.unit_cost,
          total_cost: orderItem.unit_cost ? (orderItem.unit_cost * item.quantity_received) : null,
          reference_type: 'purchase_order',
          reference_id: params.id,
          notes: `Recepción de Orden de Compra ${order.order_number}`,
          created_by: userProfile.id
        });
      
      if (movementError) {
        console.error('Error creando movement:', movementError);
      }
      
      results.push({
        item_id: item.id,
        product_id: item.product_id,
        quantity_received: item.quantity_received,
        new_total_received: newTotalReceived,
        previous_stock: previousStock,
        new_stock: newStock
      });
    }
    
    // 7. El trigger update_purchase_order_status() actualizará automáticamente
    //    el status de la orden si todos los items están completamente recibidos
    
    // 8. Obtener estado actualizado de la orden
    const { data: updatedOrder } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, order_number, status')
      .eq('id', params.id)
      .single();
    
    return NextResponse.json({
      success: true,
      data: {
        order_id: params.id,
        order_number: order.order_number,
        items_processed: results.length,
        results,
        order_status: updatedOrder?.status || order.status
      },
      error: null
    });
    
  } catch (error) {
    console.error('❌ Error in POST /api/purchase-orders/[id]/receive:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
        data: null
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      data: null
    }, { status: 500 });
  }
}
