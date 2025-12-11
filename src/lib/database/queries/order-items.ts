import { createClient } from '@/lib/supabase/server'

/**
 * Obtener items de una orden específica
 */
export async function getOrderItemsByOrderId(orderId: string) {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      *,
      services (
        id,
        name,
        category,
        base_price
      ),
      products (
        id,
        name,
        code,
        stock_quantity,
        price
      ),
      employees (
        id,
        name,
        role
      )
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching order items:', error)
    throw new Error('Error al obtener los items de la orden')
  }

  return items || []
}

/**
 * Agregar un item a una orden
 */
export async function addOrderItem(orderId: string, itemData: {
  service_id?: string | null
  product_id?: string | null
  item_type: string
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number | null
  discount_amount?: number | null
  tax_percent?: number | null
  subtotal?: number
  tax_amount?: number
  total?: number
  mechanic_id?: string | null
  status?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()

  // Verificar que la orden existe
  const { data: order, error: orderError } = await supabase
    .from('work_orders')
    .select('id, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Orden no encontrada')
  }

  // Si es un producto, verificar stock
  if (itemData.item_type === 'product' && itemData.product_id) {
    const { data: productItem, error: productError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', itemData.product_id)
      .single()

    if (productError || !productItem) {
      throw new Error('Producto no encontrado')
    }

    if (productItem.stock_quantity < itemData.quantity) {
      throw new Error(`Solo hay ${productItem.stock_quantity} unidades disponibles`)
    }
  }

  // Crear el item
  const { data: newItem, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      ...itemData
    })
    .select(`
      *,
      services (
        id,
        name,
        category
      ),
      products (
        id,
        name,
        code
      ),
      employees (
        id,
        name,
        role
      )
    `)
    .single()

  if (error) {
    console.error('Error creating order item:', error)
    throw new Error('Error al crear el item de la orden')
  }

  // Si es un producto, actualizar stock
  if (itemData.item_type === 'product' && itemData.product_id) {
    const { error: updateStockError } = await supabase
      .from('products')
      .update({ 
        stock_quantity: supabase.raw(`stock_quantity - ${itemData.quantity}`)
      })
      .eq('id', itemData.product_id)

    if (updateStockError) {
      console.error('Error updating product stock:', updateStockError)
      // No fallar la operación, solo loggear el error
    }
  }

  // Recalcular totales de la orden después de agregar el item
  try {
    await calculateOrderTotals(orderId)
  } catch (error) {
    console.error('Error recalculating order totals after adding item:', error)
    // No fallar la operación, solo loggear el error
  }

  return newItem
}

/**
 * Actualizar un item de orden
 */
export async function updateOrderItem(itemId: string, data: {
  service_id?: string | null
  product_id?: string | null
  item_type?: string
  description?: string
  quantity?: number
  unit_price?: number
  discount_percent?: number | null
  discount_amount?: number | null
  tax_percent?: number | null
  subtotal?: number
  tax_amount?: number
  total?: number
  mechanic_id?: string | null
  status?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('order_items')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select(`
      *,
      services (
        id,
        name,
        category
      ),
      products (
        id,
        name,
        code
      ),
      employees (
        id,
        name,
        role
      )
    `)
    .single()

  if (error) {
    console.error('Error updating order item:', error)
    throw new Error('Error al actualizar el item de la orden')
  }

  // Recalcular totales de la orden después de actualizar el item
  try {
    // Necesitamos obtener el order_id del item para recalcular totales
    const { data: itemData } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('id', itemId)
      .single()
    
    if (itemData) {
      await calculateOrderTotals(itemData.order_id)
    }
  } catch (error) {
    console.error('Error recalculating order totals after updating item:', error)
    // No fallar la operación, solo loggear el error
  }

  return item
}

/**
 * Eliminar un item de orden
 */
export async function deleteOrderItem(itemId: string) {
  const supabase = await createClient()

  // Obtener el item antes de eliminarlo para restaurar stock si es necesario
  const { data: item, error: fetchError } = await supabase
    .from('order_items')
    .select('product_id, quantity, item_type, order_id')
    .eq('id', itemId)
    .single()

  if (fetchError) {
    console.error('Error fetching item to delete:', fetchError)
    throw new Error('Error al obtener el item para eliminar')
  }

  // Eliminar el item
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting order item:', error)
    throw new Error('Error al eliminar el item de la orden')
  }

  // Si era un producto, restaurar stock
  if (item && item.item_type === 'product' && item.product_id) {
    const { error: updateStockError } = await supabase
      .from('products')
      .update({ 
        stock_quantity: supabase.raw(`stock_quantity + ${item.quantity}`)
      })
      .eq('id', item.product_id)

    if (updateStockError) {
      console.error('Error restoring product stock:', updateStockError)
      // No fallar la operación, solo loggear el error
    }
  }

  // Recalcular totales de la orden después de eliminar el item
  if (item && item.order_id) {
    try {
      await calculateOrderTotals(item.order_id)
    } catch (error) {
      console.error('Error recalculating order totals after deleting item:', error)
      // No fallar la operación, solo loggear el error
    }
  }

  return { success: true }
}

// Tipos para el sistema de órdenes
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Recalcular totales de una orden
 */
export async function calculateOrderTotals(orderId: string, organizationId?: string) {
  const supabase = await createClient()

  // ✅ Validar que la orden pertenece a la organización si se proporciona organizationId
  if (organizationId) {
    const { data: order, error: orderError } = await supabase
      .from('work_orders')
      .select('id, organization_id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single()

    if (orderError || !order) {
      console.error('Error validating order organization:', orderError)
      throw new Error('Orden no encontrada o no pertenece a tu organización')
    }
  }

  // Obtener todos los items de la orden con sus detalles
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      quantity,
      unit_price,
      discount_percent,
      discount_amount,
      tax_percent,
      subtotal,
      tax_amount,
      total
    `)
    .eq('order_id', orderId)

  if (itemsError) {
    console.error('Error fetching items for calculation:', itemsError)
    throw new Error('Error al obtener items para cálculo')
  }

  if (!items || items.length === 0) {
    // Si no hay items, establecer totales en 0
    let updateQuery = supabase
      .from('work_orders')
      .update({
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    // ✅ Validar organization_id si se proporciona
    if (organizationId) {
      updateQuery = updateQuery.eq('organization_id', organizationId)
    }
    
    const { data: updatedOrder, error: updateError } = await updateQuery
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order totals:', updateError)
      throw new Error('Error al actualizar totales de la orden')
    }

    return {
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      order: updatedOrder
    }
  }

  // Calcular totales detallados
  let subtotal = 0
  let totalDiscountAmount = 0
  let totalTaxAmount = 0
  let totalAmount = 0

  items.forEach(item => {
    // Calcular subtotal del item (quantity * unit_price)
    const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0)
    
    // Aplicar descuento si existe
    let itemDiscountAmount = 0
    if (item.discount_percent && item.discount_percent > 0) {
      itemDiscountAmount = itemSubtotal * (item.discount_percent / 100)
    } else if (item.discount_amount && item.discount_amount > 0) {
      itemDiscountAmount = item.discount_amount
    }
    
    // Subtotal después de descuento
    const itemSubtotalAfterDiscount = itemSubtotal - itemDiscountAmount
    
    // Calcular impuestos sobre el subtotal después de descuento
    let itemTaxAmount = 0
    if (item.tax_percent && item.tax_percent > 0) {
      itemTaxAmount = itemSubtotalAfterDiscount * (item.tax_percent / 100)
    }
    
    // Total del item
    const itemTotal = itemSubtotalAfterDiscount + itemTaxAmount
    
    // Acumular totales
    subtotal += itemSubtotal
    totalDiscountAmount += itemDiscountAmount
    totalTaxAmount += itemTaxAmount
    totalAmount += itemTotal
  })

  // Actualizar la orden con los nuevos totales calculados
  let updateQuery = supabase
    .from('work_orders')
    .update({
      subtotal,
      tax_amount: totalTaxAmount,
      discount_amount: totalDiscountAmount,
      total_amount: totalAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
  
  // ✅ Validar organization_id si se proporciona
  if (organizationId) {
    updateQuery = updateQuery.eq('organization_id', organizationId)
  }
  
  const { data: updatedOrder, error: updateError } = await updateQuery
    .select()
    .single()

  if (updateError) {
    console.error('Error updating order totals:', updateError)
    throw new Error('Error al actualizar totales de la orden')
  }

  return {
    subtotal,
    tax_amount: totalTaxAmount,
    discount_amount: totalDiscountAmount,
    total_amount: totalAmount,
    order: updatedOrder,
    items_count: items.length
  }
}

/**
 * Obtener un item específico por ID
 */
export async function getOrderItemById(itemId: string) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('order_items')
    .select(`
      *,
      services (
        id,
        name,
        category
      ),
      products (
        id,
        name,
        code
      ),
      employees (
        id,
        name,
        role
      )
    `)
    .eq('id', itemId)
    .single()

  if (error) {
    console.error('Error fetching order item by id:', error)
    throw new Error('Error al obtener el item de la orden')
  }

  return item
}
