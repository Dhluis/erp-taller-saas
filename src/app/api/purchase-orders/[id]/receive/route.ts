/**
 * API Route: Receive Purchase Order
 * POST /api/purchase-orders/[id]/receive - Recibir mercancía de orden de compra
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const receiveSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    product_id: z.string().uuid(),
    quantity_received: z.number().int().positive(),
    unit_cost: z.number().optional()
  })).min(1)
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // 2. Get organization_id y workshop_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, workshop_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'No se pudo obtener organización' }, { status: 403 });
    }
    
    // 3. Parse y validar body
    const body = await request.json();
    const validation = receiveSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos', 
        details: validation.error.errors 
      }, { status: 400 });
    }
    
    const { items } = validation.data;
    
    // 4. Verificar orden existe y pertenece a organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, order_number, status, organization_id')
      .eq('id', params.id)
      .eq('organization_id', userProfile.organization_id)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    
    // 5. Verificar status permite recepción
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'No se puede recibir una orden cancelada' }, { status: 400 });
    }
    
    if (order.status === 'received') {
      return NextResponse.json({ error: 'Esta orden ya fue completamente recibida' }, { status: 400 });
    }
    
    // 6. Verificar que todos los items pertenecen a la orden
    const itemIds = items.map(item => item.id);
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('purchase_order_items')
      .select('id, product_id, quantity_ordered, quantity_received, unit_cost, organization_id')
      .eq('purchase_order_id', params.id)
      .eq('organization_id', userProfile.organization_id)
      .in('id', itemIds);
    
    if (itemsError || !orderItems || orderItems.length !== items.length) {
      return NextResponse.json({ 
        error: 'Uno o más items no pertenecen a esta orden' 
      }, { status: 400 });
    }
    
    // Crear mapa para validación rápida
    const itemsMap = new Map(orderItems.map(item => [item.id, item]));
    
    // 7. Validar items antes de procesar
    for (const item of items) {
      const orderItem = itemsMap.get(item.id);
      if (!orderItem) {
        return NextResponse.json({ 
          error: `Item ${item.id} no encontrado en la orden` 
        }, { status: 400 });
      }
      
      if (orderItem.product_id !== item.product_id) {
        return NextResponse.json({ 
          error: `El product_id del item ${item.id} no coincide` 
        }, { status: 400 });
      }
      
      // Validar que no se exceda la cantidad ordenada
      const newQuantityReceived = orderItem.quantity_received + item.quantity_received;
      if (newQuantityReceived > orderItem.quantity_ordered) {
        return NextResponse.json({ 
          error: `La cantidad recibida excede la ordenada para el item ${item.id}. Ordenado: ${orderItem.quantity_ordered}, Ya recibido: ${orderItem.quantity_received}, Intenta recibir: ${item.quantity_received}` 
        }, { status: 400 });
      }
      
      // Verificar que el producto existe
      const { data: product } = await supabaseAdmin
        .from('inventory')
        .select('id')
        .eq('id', item.product_id)
        .eq('organization_id', userProfile.organization_id)
        .single();
      
      if (!product) {
        return NextResponse.json({ 
          error: `Producto ${item.product_id} no encontrado` 
        }, { status: 404 });
      }
    }
    
    // 8. Procesar cada item
    for (const item of items) {
      const orderItem = itemsMap.get(item.id)!;
      
      // 8a. Obtener stock actual ANTES de actualizar (para previous_stock)
      const { data: productBefore } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('id', item.product_id)
        .single();
      
      const previousStock = productBefore?.current_stock || 0;
      
      // 8b. Actualizar quantity_received en purchase_order_items
      // Usar el unit_cost del orderItem si no viene en el body
      const unitCost = item.unit_cost || orderItem.unit_cost || null;
      
      const { error: updateError } = await supabaseAdmin
        .from('purchase_order_items')
        .update({ 
          quantity_received: orderItem.quantity_received + item.quantity_received
        })
        .eq('id', item.id)
        .eq('organization_id', userProfile.organization_id);
      
      if (updateError) {
        throw new Error(`Error actualizando item: ${updateError.message}`);
      }
      
      // 8c. Actualizar stock con función SQL (SEGURA)
      const { error: stockError } = await supabaseAdmin
        .rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity_received
        });
      
      if (stockError) {
        // Rollback: revertir quantity_received
        await supabaseAdmin
          .from('purchase_order_items')
          .update({ 
            quantity_received: orderItem.quantity_received
          })
          .eq('id', item.id)
          .eq('organization_id', userProfile.organization_id);
        
        throw new Error(`Error actualizando stock: ${stockError.message}`);
      }
      
      // 8d. Calcular nuevo stock
      const newStock = previousStock + item.quantity_received;
      
      // 8e. Crear inventory_movement con estructura correcta
      const { error: movementError } = await supabaseAdmin
        .from('inventory_movements')
        .insert({
          organization_id: userProfile.organization_id,
          workshop_id: userProfile.workshop_id || null,
          product_id: item.product_id,
          movement_type: 'entrada',
          quantity: item.quantity_received,
          unit_cost: unitCost,
          total_cost: unitCost ? (unitCost * item.quantity_received) : null,
          previous_stock: previousStock,
          new_stock: newStock,
          notes: `Recepción de Orden de Compra ${order.order_number}`,
          reference_id: params.id,
          reference_type: 'purchase_order',
          created_by: user.id
        });
      
      if (movementError) {
        // Rollback: revertir stock y quantity_received
        await supabaseAdmin.rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: -item.quantity_received
        });
        await supabaseAdmin
          .from('purchase_order_items')
          .update({ 
            quantity_received: orderItem.quantity_received
          })
          .eq('id', item.id)
          .eq('organization_id', userProfile.organization_id);
        
        throw new Error(`Error creando movimiento: ${movementError.message}`);
      }
    }
    
    // 9. Verificar status actualizado (el trigger lo hace automáticamente)
    const { data: updatedOrder } = await supabaseAdmin
      .from('purchase_orders')
      .select('status, received_date')
      .eq('id', params.id)
      .single();
    
    // 10. Si la orden está completamente recibida, actualizar received_by y received_date
    if (updatedOrder?.status === 'received' && !updatedOrder.received_date) {
      await supabaseAdmin
        .from('purchase_orders')
        .update({
          received_by: user.id,
          received_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', params.id)
        .eq('organization_id', userProfile.organization_id);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Mercancía recibida correctamente',
      data: {
        items_received: items.length,
        order_status: updatedOrder?.status || order.status
      }
    });
    
  } catch (error) {
    console.error('Error receiving order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
