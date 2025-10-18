import { createClient } from '@/lib/supabase/server'

export interface OrderItem {
  id: string
  order_id: string
  service_id?: string
  inventory_id?: string
  item_type: 'service' | 'product'
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  subtotal: number
  tax_amount: number
  total: number
  mechanic_id?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  // Relaciones
  services?: {
    name: string
    category: string
  }
  inventory?: {
    name: string
    code: string
  }
  employees?: {
    name: string
    role: string
  }
}

export interface CreateOrderItemData {
  order_id: string
  service_id?: string
  inventory_id?: string
  item_type: 'service' | 'product'
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
  discount_amount?: number
  tax_percent?: number
  subtotal: number
  tax_amount: number
  total: number
  mechanic_id?: string
  status?: string
  notes?: string
}

export interface UpdateOrderItemData {
  service_id?: string
  inventory_id?: string
  item_type?: 'service' | 'product'
  description?: string
  quantity?: number
  unit_price?: number
  discount_percent?: number
  discount_amount?: number
  tax_percent?: number
  subtotal?: number
  tax_amount?: number
  total?: number
  mechanic_id?: string
  status?: string
  notes?: string
}

/**
 * Obtener todos los items de una orden
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
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
    throw new Error('Error al obtener items de la orden')
  }

  return data || []
}

/**
 * Obtener un item específico
 */
export async function getOrderItem(itemId: string): Promise<OrderItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
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
    .eq('id', itemId)
    .single()

  if (error) {
    console.error('Error fetching order item:', error)
    return null
  }

  return data
}

/**
 * Crear un nuevo item en una orden
 */
export async function createOrderItem(data: CreateOrderItemData): Promise<OrderItem> {
  const supabase = await createClient()

  // Verificar que la orden existe
  const { data: order, error: orderError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('id', data.order_id)
    .single()

  if (orderError || !order) {
    throw new Error('Orden no encontrada')
  }

  // Si es un producto, verificar stock
  if (data.item_type === 'product' && data.inventory_id) {
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('id', data.inventory_id)
      .single()

    if (inventoryError || !inventoryItem) {
      throw new Error('Producto no encontrado en inventario')
    }

    if (inventoryItem.quantity < data.quantity) {
      throw new Error(`Solo hay ${inventoryItem.quantity} unidades disponibles`)
    }
  }

  // Crear el item
  const { data: newItem, error: createError } = await supabase
    .from('order_items')
    .insert(data)
    .select()
    .single()

  if (createError) {
    console.error('Error creating order item:', createError)
    throw new Error('Error al crear el item')
  }

  // Si es un producto, actualizar stock
  if (data.item_type === 'product' && data.inventory_id) {
    const { error: updateStockError } = await supabase
      .from('inventory')
      .update({ 
        quantity: supabase.raw(`quantity - ${data.quantity}`)
      })
      .eq('id', data.inventory_id)

    if (updateStockError) {
      console.error('Error updating inventory:', updateStockError)
      // No fallar la operación, solo loggear el error
    }
  }

  return newItem
}

/**
 * Actualizar un item existente
 */
export async function updateOrderItem(itemId: string, data: UpdateOrderItemData): Promise<OrderItem> {
  const supabase = await createClient()

  // Obtener el item actual para comparar cambios
  const { data: existingItem, error: itemError } = await supabase
    .from('order_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (itemError || !existingItem) {
    throw new Error('Item no encontrado')
  }

  // Si es un producto y cambió la cantidad, verificar stock
  if (existingItem.item_type === 'product' && existingItem.inventory_id) {
    const newQuantity = data.quantity || existingItem.quantity
    const quantityDiff = newQuantity - existingItem.quantity

    if (quantityDiff > 0) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', existingItem.inventory_id)
        .single()

      if (inventoryError || !inventoryItem) {
        throw new Error('Producto no encontrado en inventario')
      }

      if (inventoryItem.quantity < quantityDiff) {
        throw new Error(`Solo hay ${inventoryItem.quantity} unidades disponibles`)
      }
    }
  }

  // Actualizar el item
  const { data: updatedItem, error: updateError } = await supabase
    .from('order_items')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating order item:', updateError)
    throw new Error('Error al actualizar el item')
  }

  // Si es un producto y cambió la cantidad, actualizar stock
  if (existingItem.item_type === 'product' && existingItem.inventory_id) {
    const quantityDiff = (data.quantity || existingItem.quantity) - existingItem.quantity
    
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

  return updatedItem
}

/**
 * Eliminar un item
 */
export async function deleteOrderItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  // Obtener el item para restaurar stock si es necesario
  const { data: existingItem, error: itemError } = await supabase
    .from('order_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (itemError || !existingItem) {
    throw new Error('Item no encontrado')
  }

  // Eliminar el item
  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)

  if (deleteError) {
    console.error('Error deleting order item:', deleteError)
    throw new Error('Error al eliminar el item')
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
}

/**
 * Calcular totales de una orden
 */
export async function calculateOrderTotals(orderId: string): Promise<{
  subtotal: number
  totalDiscounts: number
  totalTax: number
  grandTotal: number
}> {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from('order_items')
    .select('subtotal, discount_amount, tax_amount, total')
    .eq('order_id', orderId)

  if (error) {
    console.error('Error calculating order totals:', error)
    throw new Error('Error al calcular totales')
  }

  const subtotal = items?.reduce((sum, item) => sum + item.subtotal, 0) || 0
  const totalDiscounts = items?.reduce((sum, item) => sum + item.discount_amount, 0) || 0
  const totalTax = items?.reduce((sum, item) => sum + item.tax_amount, 0) || 0
  const grandTotal = items?.reduce((sum, item) => sum + item.total, 0) || 0

  return {
    subtotal,
    totalDiscounts,
    totalTax,
    grandTotal
  }
}

/**
 * Actualizar el total de la orden en work_orders
 */
export async function updateOrderTotal(orderId: string): Promise<void> {
  const supabase = await createClient()

  try {
    const totals = await calculateOrderTotals(orderId)

    const { error } = await supabase
      .from('work_orders')
      .update({ 
        final_cost: totals.grandTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order total:', error)
      throw new Error('Error al actualizar el total de la orden')
    }
  } catch (error) {
    console.error('Error in updateOrderTotal:', error)
    throw error
  }
}

/**
 * Obtener servicios disponibles
 */
export async function getAvailableServices(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching services:', error)
    throw new Error('Error al obtener servicios')
  }

  return data || []
}

/**
 * Obtener inventario disponible
 */
export async function getAvailableInventory(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .gt('quantity', 0)
    .order('name')

  if (error) {
    console.error('Error fetching inventory:', error)
    throw new Error('Error al obtener inventario')
  }

  return data || []
}

/**
 * Obtener mecánicos disponibles
 */
export async function getAvailableMechanics(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .eq('role', 'mechanic')
    .order('name')

  if (error) {
    console.error('Error fetching mechanics:', error)
    throw new Error('Error al obtener mecánicos')
  }

  return data || []
}

