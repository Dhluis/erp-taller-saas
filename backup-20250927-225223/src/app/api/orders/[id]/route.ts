import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/orders/[id] - Obtener detalles de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id

    const { data: order, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customers (
          name,
          email,
          phone
        ),
        vehicles (
          brand,
          model,
          year,
          license_plate,
          vin
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Actualizar una orden
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const body = await request.json()

    // Verificar que la orden existe
    const { data: existingOrder, error: orderError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', orderId)
      .single()

    if (orderError || !existingOrder) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar la orden
    const { data: updatedOrder, error: updateError } = await supabase
      .from('work_orders')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la orden' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

