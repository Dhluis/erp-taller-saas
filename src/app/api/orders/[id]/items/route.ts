import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 GET /api/orders/[id]/items - Iniciando...')
    
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener items de la orden
    const { data: items, error } = await supabase
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
    
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await createClient()
    
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
    if (tenantContext.workshopId) {
      itemData.workshop_id = tenantContext.workshopId
    }
    
    const { data: item, error } = await supabase
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
    await updateOrderTotals(supabase, params.id)

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