import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/orders/[id]/items/[itemId] - Actualizar item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = await createClient()
    const { id: orderId, itemId } = params
    const body = await request.json()

    // Verificar que el item existe y pertenece a la orden
    const { data: existingItem, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single()

    if (itemError || !existingItem) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Si es un producto y cambió la cantidad, verificar stock
    if (existingItem.item_type === 'product' && existingItem.inventory_id) {
      const newQuantity = body.quantity || existingItem.quantity
      const quantityDiff = newQuantity - existingItem.quantity

      if (quantityDiff > 0) {
        const { data: inventoryItem, error: inventoryError } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', existingItem.inventory_id)
          .single()

        if (inventoryError || !inventoryItem) {
          return NextResponse.json(
            { error: 'Producto no encontrado en inventario' },
            { status: 404 }
          )
        }

        if (inventoryItem.quantity < quantityDiff) {
          return NextResponse.json(
            { error: `Solo hay ${inventoryItem.quantity} unidades disponibles` },
            { status: 400 }
          )
        }
      }
    }

    // Actualizar el item
    const { data: updatedItem, error: updateError } = await supabase
      .from('order_items')
      .update({
        service_id: body.service_id || null,
        inventory_id: body.inventory_id || null,
        item_type: body.item_type,
        description: body.description,
        quantity: body.quantity,
        unit_price: body.unit_price,
        discount_percent: body.discount_percent,
        discount_amount: body.discount_amount,
        tax_percent: body.tax_percent,
        subtotal: body.subtotal,
        tax_amount: body.tax_amount,
        total: body.total,
        mechanic_id: body.mechanic_id || null,
        status: body.status,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order item:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar el item' },
        { status: 500 }
      )
    }

    // Si es un producto y cambió la cantidad, actualizar stock
    if (existingItem.item_type === 'product' && existingItem.inventory_id) {
      const quantityDiff = (body.quantity || existingItem.quantity) - existingItem.quantity
      
      if (quantityDiff !== 0) {
        const { error: updateStockError } = await supabase
          .from('inventory')
          .update({ 
            quantity: supabase.raw(`quantity + ${quantityDiff}`)
          })
          .eq('id', existingItem.inventory_id)

        if (updateStockError) {
          console.error('Error updating inventory:', updateStockError)
          // No fallar la operación, solo loggear el error
        }
      }
    }

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error in PUT /api/orders/[id]/items/[itemId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id]/items/[itemId] - Eliminar item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = await createClient()
    const { id: orderId, itemId } = params

    // Verificar que el item existe y pertenece a la orden
    const { data: existingItem, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single()

    if (itemError || !existingItem) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el item
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      console.error('Error deleting order item:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar el item' },
        { status: 500 }
      )
    }

    // Si era un producto, restaurar stock
    if (existingItem.item_type === 'product' && existingItem.inventory_id) {
      const { error: restoreStockError } = await supabase
        .from('inventory')
        .update({ 
          quantity: supabase.raw(`quantity + ${existingItem.quantity}`)
        })
        .eq('id', existingItem.inventory_id)

      if (restoreStockError) {
        console.error('Error restoring inventory:', restoreStockError)
        // No fallar la operación, solo loggear el error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/orders/[id]/items/[itemId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

