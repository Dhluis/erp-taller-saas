import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

// GET /api/purchase-orders - Listar órdenes de compra con filtros
export async function GET(request: NextRequest) {
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
    
    // 3. Query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // 4. Query purchase orders con JOIN a suppliers
    const { data: orders, error: ordersError, count } = await supabaseAdmin
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
      `, { count: 'exact' })
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (ordersError) {
      console.error('❌ Error querying orders:', ordersError);
      return NextResponse.json({ 
        success: false,
        error: ordersError.message,
        data: null
      }, { status: 500 });
    }
    
    // 5. Return con formato correcto
    return NextResponse.json({
      success: true,
      data: {
        items: orders || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      error: null
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/purchase-orders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      data: null
    }, { status: 500 });
  }
}

// Schema de validación
const purchaseOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().positive()
});

const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid(),
  order_date: z.string(), // ISO date
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Debe incluir al menos un item')
});

// POST /api/purchase-orders - Crear nueva orden de compra
export async function POST(request: NextRequest) {
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
    
    // 2. Get organization_id y user id
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
    
    const organizationId = userProfile.organization_id;
    const userId = userProfile.id;
    
    // 3. Validar input
    const body = await request.json();
    const validatedData = createPurchaseOrderSchema.parse(body);
    
    // 4. Verificar que supplier existe y pertenece a la organización
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .select('id, name')
      .eq('id', validatedData.supplier_id)
      .eq('organization_id', organizationId)
      .single();
    
    if (supplierError || !supplier) {
      return NextResponse.json({ 
        success: false,
        error: 'Proveedor no encontrado',
        data: null
      }, { status: 404 });
    }
    
    // 5. Verificar que todos los productos existen
    const productIds = validatedData.items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('inventory')
      .select('id, name')
      .in('id', productIds)
      .eq('organization_id', organizationId);
    
    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json({ 
        success: false,
        error: 'Uno o más productos no existen',
        data: null
      }, { status: 404 });
    }
    
    // 6. El trigger generate_purchase_order_number_trigger generará automáticamente
    //    el número de orden al insertar, así que no necesitamos llamar la función RPC
    
    // 7. Calcular totales
    const subtotal = validatedData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_cost);
    }, 0);
    
    const taxRate = 0.16; // 16% IVA
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // 8. Crear purchase order (el trigger generará order_number automáticamente)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .insert({
        organization_id: organizationId,
        supplier_id: validatedData.supplier_id,
        status: 'draft',
        order_date: validatedData.order_date,
        expected_delivery_date: validatedData.expected_delivery_date || null,
        subtotal,
        tax,
        total,
        notes: validatedData.notes || null,
        created_by: userId
      })
      .select()
      .single();
    
    if (orderError || !order) {
      console.error('Error creando orden:', orderError);
      return NextResponse.json({ 
        success: false,
        error: 'Error creando orden: ' + orderError?.message,
        data: null
      }, { status: 500 });
    }
    
    // 9. Crear items de la orden
    const orderItems = validatedData.items.map(item => ({
      organization_id: organizationId,
      purchase_order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      quantity_received: 0,
      unit_cost: item.unit_cost,
      total: item.quantity * item.unit_cost
    }));
    
    const { error: itemsError } = await supabaseAdmin
      .from('purchase_order_items')
      .insert(orderItems);
    
    if (itemsError) {
      console.error('Error creando items:', itemsError);
      // Intentar eliminar la orden si falló la creación de items
      await supabaseAdmin
        .from('purchase_orders')
        .delete()
        .eq('id', order.id);
      
      return NextResponse.json({ 
        success: false,
        error: 'Error creando items de la orden',
        data: null
      }, { status: 500 });
    }
    
    // 10. Retornar orden creada
    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        order_number: order.order_number,
        supplier: supplier.name,
        status: order.status,
        total: order.total,
        items_count: orderItems.length
      },
      error: null
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error in POST /api/purchase-orders:', error);
    
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
