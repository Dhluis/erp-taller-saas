import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/quotations/[id]/convert - Convertir cotización a orden
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const quotationId = params.id

    // Obtener la cotización con sus items
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (*),
        vehicles (*),
        quotation_items (*)
      `)
      .eq('id', quotationId)
      .single()

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que la cotización esté aprobada
    if (quotation.status !== 'approved') {
      return NextResponse.json(
        { error: 'Solo se pueden convertir cotizaciones aprobadas' },
        { status: 400 }
      )
    }

    // Verificar que no haya sido convertida anteriormente
    if (quotation.converted_to_order) {
      return NextResponse.json(
        { error: 'Esta cotización ya ha sido convertida a orden' },
        { status: 400 }
      )
    }

    // Generar número de orden
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    
    // Obtener el siguiente número secuencial
    const { data: lastOrder, error: lastError } = await supabase
      .from('work_orders')
      .select('order_number')
      .like('order_number', `ORD-${year}${month}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (lastOrder && lastOrder.length > 0) {
      const lastNumber = parseInt(lastOrder[0].order_number.split('-')[2])
      nextNumber = lastNumber + 1
    }

    const orderNumber = `ORD-${year}${month}-${String(nextNumber).padStart(4, '0')}`

    // Crear la orden de trabajo
    const orderData = {
      order_number: orderNumber,
      customer_id: quotation.client_id,
      vehicle_id: quotation.vehicle_id,
      status: 'reception',
      description: `Orden generada desde cotización ${quotation.quotation_number}`,
      estimated_cost: quotation.total,
      final_cost: quotation.total,
      entry_date: new Date().toISOString(),
      estimated_completion: quotation.delivery_time,
      notes: `Cotización: ${quotation.quotation_number}\n${quotation.notes || ''}`
    }

    const { data: newOrder, error: orderError } = await supabase
      .from('work_orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Error al crear orden de trabajo' },
        { status: 500 }
      )
    }

    // Crear los items de la orden
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const orderItems = quotation.quotation_items.map((item: any) => ({
        order_id: newOrder.id,
        service_id: item.service_id,
        inventory_id: item.inventory_id,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        tax_percent: item.tax_percent,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        total: item.total,
        status: 'pending'
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        // No fallar la operación, solo loggear el error
      }
    }

    // Actualizar la cotización como convertida
    const { error: updateError } = await supabase
      .from('quotations')
      .update({
        status: 'converted',
        converted_to_order: true,
        order_id: newOrder.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)

    if (updateError) {
      console.error('Error updating quotation:', updateError)
      // No fallar la operación, solo loggear el error
    }

    return NextResponse.json({
      success: true,
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      quotation_id: quotationId
    })
  } catch (error) {
    console.error('Error in POST /api/quotations/[id]/convert:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

