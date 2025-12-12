import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    console.log('🔄 PUT /api/orders/[id]/items/[itemId] - Iniciando...')
    
    const tenantContext = await getTenantContext(request)
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

    // Actualizar item
    const { data: item, error } = await supabase
      .from('order_items')
      .update({
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
        status: body.status,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.itemId)
      .eq('order_id', params.id)
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
      console.error('❌ Error actualizando item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Actualizar totales de la orden
    await updateOrderTotals(supabase, params.id)

    console.log('✅ Item actualizado:', item.id)
    return NextResponse.json(item)

  } catch (error: any) {
    console.error('💥 Error en PUT /api/orders/[id]/items/[itemId]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    console.log('🔄 DELETE /api/orders/[id]/items/[itemId] - Iniciando...')
    
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Eliminar item
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', params.itemId)
      .eq('order_id', params.id)

    if (error) {
      console.error('❌ Error eliminando item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Actualizar totales de la orden
    await updateOrderTotals(supabase, params.id)

    console.log('✅ Item eliminado:', params.itemId)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('💥 Error en DELETE /api/orders/[id]/items/[itemId]:', error)
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
      // Si no hay items, poner totales en cero
      await supabase
        .from('work_orders')
        .update({
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
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