import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 GET /api/orders/[id]/items - Iniciando...')
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/orders/[id]/items] Error de autenticación:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [GET /api/orders/[id]/items] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    
    // ✅ Verificar que la orden pertenece a la organización del usuario
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select('id, organization_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (orderError || !order) {
      console.error('❌ [GET /api/orders/[id]/items] Orden no encontrada o no autorizada:', orderError)
      return NextResponse.json(
        { error: 'Orden no encontrada o no autorizada' },
        { status: 404 }
      )
    }
    
    // ✅ Obtener items de la orden usando supabaseAdmin (bypass RLS)
    const { data: items, error } = await supabaseAdmin
      .from('order_items')
      .select(`
        *,
        service:services (
          id,
          name,
          category
        ),
        product:products!inventory_id (
          id,
          name,
          code
        ),
        mechanic:employees!mechanic_id (
          id,
          name
        )
      `)
      .eq('order_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Items obtenidos:', items?.length || 0)
    return NextResponse.json(items || [])

  } catch (error: any) {
    console.error('💥 Error en GET /api/orders/[id]/items:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 POST /api/orders/[id]/items - Iniciando...')
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [POST /api/orders/[id]/items] Error de autenticación:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, workshop_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [POST /api/orders/[id]/items] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const workshopId = userProfile.workshop_id;
    
    // ✅ Verificar que la orden pertenece a la organización del usuario
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select('id, organization_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (orderError || !order) {
      console.error('❌ [POST /api/orders/[id]/items] Orden no encontrada o no autorizada:', orderError)
      return NextResponse.json(
        { error: 'Orden no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)
    
    // Calcular totales
    const quantity = body.quantity || 1
    const unitPrice = body.unit_price || 0
    const discountPercent = body.discount_percent || 0
    const taxPercent = body.tax_percent || 16
    
    const subtotal = quantity * unitPrice
    const discountAmount = subtotal * (discountPercent / 100)
    const subtotalAfterDiscount = subtotal - discountAmount
    const taxAmount = subtotalAfterDiscount * (taxPercent / 100)
    const total = subtotalAfterDiscount + taxAmount

    // Crear nuevo item
    const itemData: any = {
      order_id: params.id,
      item_type: body.item_type,
      service_id: body.service_id || null,
      inventory_id: body.inventory_id || null,
      description: body.description,
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      subtotal,
      tax_amount: taxAmount,
      total,
      mechanic_id: body.mechanic_id || null,
      status: body.status || 'pending',
      notes: body.notes || null
    }
    
    // ✅ Solo agregar workshop_id si existe
    if (workshopId) {
      itemData.workshop_id = workshopId
    }
    
    const { data: item, error } = await supabaseAdmin
      .from('order_items')
      .insert(itemData)
      .select(`
        *,
        service:services (
          id,
          name,
          category
        ),
        product:products!inventory_id (
          id,
          name,
          code
        ),
        mechanic:employees!mechanic_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('❌ Error creando item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Actualizar totales de la orden
    await updateOrderTotals(supabaseAdmin, params.id)

    console.log('✅ Item creado:', item.id)
    return NextResponse.json(item)

  } catch (error: any) {
    console.error('💥 Error en POST /api/orders/[id]/items:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Función auxiliar para actualizar totales de la orden
async function updateOrderTotals(supabase: any, orderId: string) {
  try {
    // Obtener todos los items de la orden
    const { data: items } = await supabase
      .from('order_items')
      .select('subtotal, tax_amount, discount_amount, total')
      .eq('order_id', orderId)

    if (!items || items.length === 0) {
      return
    }

    // Calcular totales
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
    const taxAmount = items.reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0)
    const discountAmount = items.reduce((sum: number, item: any) => sum + (item.discount_amount || 0), 0)
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)

    // Actualizar orden
    await supabase
      .from('work_orders')
      .update({
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    console.log('✅ Totales de orden actualizados')
  } catch (error) {
    console.error('❌ Error actualizando totales:', error)
  }
}