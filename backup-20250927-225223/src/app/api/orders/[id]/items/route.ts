import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/orders/[id]/items - Listar items de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id

    // Verificar que la orden existe
    const { data: order, error: orderError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Obtener items con relaciones
    const { data: items, error } = await supabase
      .from('order_items')
      .select(`
        *,
        services (
          name,
          category
        ),
        inventory (
          name,
          code
        ),
        employees (
          name,
          role
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching order items:', error)
      return NextResponse.json(
        { error: 'Error al obtener items de la orden' },
        { status: 500 }
      )
    }

    return NextResponse.json(items || [])
  } catch (error) {
    console.error('Error in GET /api/orders/[id]/items:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/orders/[id]/items - Crear nuevo item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const body = await request.json()

    // Verificar que la orden existe
    const { data: order, error: orderError } = await supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Validar datos requeridos
    const { item_type, description, quantity, unit_price } = body
    if (!item_type || !description || !quantity || !unit_price) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Si es un producto, verificar stock
    if (item_type === 'product' && body.inventory_id) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', body.inventory_id)
        .single()

      if (inventoryError || !inventoryItem) {
        return NextResponse.json(
          { error: 'Producto no encontrado en inventario' },
          { status: 404 }
        )
      }

      if (inventoryItem.quantity < quantity) {
        return NextResponse.json(
          { error: `Solo hay ${inventoryItem.quantity} unidades disponibles` },
          { status: 400 }
        )
      }
    }

    // Crear el item
    const { data: newItem, error: createError } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        service_id: body.service_id || null,
        inventory_id: body.inventory_id || null,
        item_type: item_type,
        description: description,
        quantity: quantity,
        unit_price: unit_price,
        discount_percent: body.discount_percent || 0,
        discount_amount: body.discount_amount || 0,
        tax_percent: body.tax_percent || 16,
        subtotal: body.subtotal || 0,
        tax_amount: body.tax_amount || 0,
        total: body.total || 0,
        mechanic_id: body.mechanic_id || null,
        status: body.status || 'pending',
        notes: body.notes || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating order item:', createError)
      return NextResponse.json(
        { error: 'Error al crear el item' },
        { status: 500 }
      )
    }

    // Si es un producto, actualizar stock
    if (item_type === 'product' && body.inventory_id) {
      const { error: updateStockError } = await supabase
        .from('inventory')
        .update({ 
          quantity: supabase.raw(`quantity - ${quantity}`)
        })
        .eq('id', body.inventory_id)

      if (updateStockError) {
        console.error('Error updating inventory:', updateStockError)
        // No fallar la operación, solo loggear el error
      }
    }

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/orders/[id]/items:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

