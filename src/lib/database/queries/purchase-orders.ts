import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * QUERIES PARA ÓRDENES DE COMPRA (PURCHASE ORDERS)
 * =====================================================
 * Sistema completo de gestión de órdenes de compra
 * con numeración automática y control de inventario
 */

export type PurchaseOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

/**
 * Obtener el último número de orden de compra del año
 */
async function getLastPurchaseOrderNumber(organizationId: string, year: number): Promise<number> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const prefix = `PO-${year}-`
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .eq('organization_id', organizationId)
      .like('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return 0
    }

    // Extraer el número del formato PO-2025-0001
    const lastNumber = data[0].order_number
    const numberPart = lastNumber.split('-')[2]
    return parseInt(numberPart, 10) || 0
  }, { operation: 'getLastPurchaseOrderNumber', table: 'purchase_orders' })
}

/**
 * Generar número de orden de compra único
 * Formato: PO-2025-0001
 */
export async function generatePurchaseOrderNumber(organizationId: string): Promise<string> {
  return executeWithErrorHandling(async () => {
    const year = new Date().getFullYear()
    const lastNumber = await getLastPurchaseOrderNumber(organizationId, year)
    const nextNumber = lastNumber + 1
    return `PO-${year}-${String(nextNumber).padStart(4, '0')}`
  }, { operation: 'generatePurchaseOrderNumber', table: 'purchase_orders' })
}

/**
 * Obtener todas las órdenes de compra con filtros
 */
export async function getAllPurchaseOrders(
  organizationId: string,
  filters?: {
    status?: PurchaseOrderStatus
    supplier_id?: string
    date_from?: string
    date_to?: string
    search?: string
    page?: number
    limit?: number
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (
          id,
          name,
          contact_person,
          email,
          phone
        )
      `)
      .eq('organization_id', organizationId)
      .order('order_date', { ascending: false })

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id)
    }

    if (filters?.date_from) {
      query = query.gte('order_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('order_date', filters.date_to)
    }

    if (filters?.search) {
      query = query.or(
        `order_number.ilike.%${filters.search}%,` +
        `suppliers.name.ilike.%${filters.search}%,` +
        `notes.ilike.%${filters.search}%`
      )
    }

    // Paginación
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }, { operation: 'getAllPurchaseOrders', table: 'purchase_orders' })
}

/**
 * Obtener orden de compra por ID con items
 */
export async function getPurchaseOrderById(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          country,
          tax_id,
          payment_terms
        ),
        purchase_order_items (
          id,
          product_id,
          description,
          quantity,
          unit_price,
          total,
          products (
            id,
            name,
            code,
            unit
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getPurchaseOrderById', table: 'purchase_orders' })
}

/**
 * Crear nueva orden de compra
 */
export async function createPurchaseOrder(data: {
  organization_id: string
  supplier_id: string
  order_date?: string
  expected_delivery_date?: string
  notes?: string
  items?: Array<{
    product_id?: string
    description: string
    quantity: number
    unit_price: number
  }>
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Validaciones
    if (!data.supplier_id) {
      throw new Error('El proveedor es requerido')
    }

    // Verificar que el proveedor existe y está activo
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, is_active')
      .eq('id', data.supplier_id)
      .eq('organization_id', data.organization_id)
      .single()

    if (supplierError || !supplier) {
      throw new Error('Proveedor no encontrado')
    }

    if (!supplier.is_active) {
      throw new Error('El proveedor está inactivo')
    }

    // Generar número de orden
    const orderNumber = await generatePurchaseOrderNumber(data.organization_id)

    // Calcular totales
    const items = data.items || []
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const taxAmount = subtotal * 0.16 // IVA 16%
    const total = subtotal + taxAmount

    // Crear orden de compra
    const { data: newOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        organization_id: data.organization_id,
        supplier_id: data.supplier_id,
        order_number: orderNumber,
        order_date: data.order_date || new Date().toISOString().split('T')[0],
        expected_delivery_date: data.expected_delivery_date,
        status: 'pending',
        subtotal,
        tax_amount: taxAmount,
        total,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Crear items de la orden
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems)

      if (itemsError) {
        // Rollback: eliminar orden creada
        await supabase.from('purchase_orders').delete().eq('id', newOrder.id)
        throw new Error('Error al crear items de la orden: ' + itemsError.message)
      }
    }

    return newOrder
  }, { operation: 'createPurchaseOrder', table: 'purchase_orders' })
}

/**
 * Actualizar orden de compra
 */
export async function updatePurchaseOrder(
  id: string,
  data: {
    supplier_id?: string
    order_date?: string
    expected_delivery_date?: string
    notes?: string
    items?: Array<{
      id?: string
      product_id?: string
      description: string
      quantity: number
      unit_price: number
    }>
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que la orden existe y no está recibida
    const { data: currentOrder } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single()

    if (!currentOrder) {
      throw new Error('Orden de compra no encontrada')
    }

    if (currentOrder.status === 'delivered') {
      throw new Error('No se puede editar una orden ya recibida')
    }

    if (currentOrder.status === 'cancelled') {
      throw new Error('No se puede editar una orden cancelada')
    }

    // Actualizar orden
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString()
    }

    // Recalcular totales si hay items
    if (data.items && data.items.length > 0) {
      const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      const taxAmount = subtotal * 0.16
      const total = subtotal + taxAmount

      updateData.subtotal = subtotal
      updateData.tax_amount = taxAmount
      updateData.total = total
    }

    const { data: updatedOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (orderError) throw orderError

    // Actualizar items si se proporcionan
    if (data.items) {
      // Eliminar items existentes
      await supabase
        .from('purchase_order_items')
        .delete()
        .eq('order_id', id)

      // Crear nuevos items
      const orderItems = data.items.map(item => ({
        order_id: id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems)

      if (itemsError) {
        throw new Error('Error al actualizar items de la orden: ' + itemsError.message)
      }
    }

    return updatedOrder
  }, { operation: 'updatePurchaseOrder', table: 'purchase_orders' })
}

/**
 * Actualizar estado de orden de compra
 */
export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Validar transición de estado
    const { data: currentOrder } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single()

    if (!currentOrder) {
      throw new Error('Orden de compra no encontrada')
    }

    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    }

    if (!validTransitions[currentOrder.status]?.includes(status)) {
      throw new Error(`No se puede cambiar el estado de "${currentOrder.status}" a "${status}"`)
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Agregar fecha de recepción si se marca como entregada
    if (status === 'delivered') {
      updateData.delivered_date = new Date().toISOString().split('T')[0]
    }

    const { data: updatedOrder, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updatedOrder
  }, { operation: 'updatePurchaseOrderStatus', table: 'purchase_orders' })
}

/**
 * Obtener órdenes de compra de un proveedor
 */
export async function getPurchaseOrdersBySupplier(supplierId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        order_date,
        expected_delivery_date,
        status,
        subtotal,
        tax_amount,
        total,
        notes
      `)
      .eq('supplier_id', supplierId)
      .order('order_date', { ascending: false })

    if (error) throw error
    return data || []
  }, { operation: 'getPurchaseOrdersBySupplier', table: 'purchase_orders' })
}

/**
 * Obtener órdenes de compra pendientes
 */
export async function getPendingPurchaseOrders(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (
          id,
          name,
          contact_person,
          email,
          phone
        )
      `)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'confirmed', 'shipped'])
      .order('order_date', { ascending: true })

    if (error) throw error
    return data || []
  }, { operation: 'getPendingPurchaseOrders', table: 'purchase_orders' })
}

/**
 * Recibir mercancía (marcar como entregada y actualizar inventario)
 */
export async function receivePurchaseOrder(orderId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener orden con items
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          id,
          product_id,
          description,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Orden de compra no encontrada')
    }

    if (order.status === 'delivered') {
      throw new Error('La orden ya fue recibida')
    }

    if (order.status === 'cancelled') {
      throw new Error('No se puede recibir una orden cancelada')
    }

    // 2. Actualizar inventario por cada item
    if (order.purchase_order_items && order.purchase_order_items.length > 0) {
      for (const item of order.purchase_order_items) {
        if (item.product_id) {
          // Actualizar stock en products
          const { error: stockError } = await supabase
            .from('products')
            .update({
              stock_quantity: supabase.raw(`stock_quantity + ${item.quantity}`),
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id)

          if (stockError) {
            console.error('Error updating stock for product:', item.product_id, stockError)
            // Continuar con otros productos
          }

          // Crear movimiento de inventario
          await supabase
            .from('inventory_movements')
            .insert({
              product_id: item.product_id,
              movement_type: 'in',
              quantity: item.quantity,
              reference: order.order_number,
              notes: `Recepción de orden de compra ${order.order_number}`,
              created_at: new Date().toISOString()
            })
        }
      }
    }

    // 3. Cambiar status a 'delivered'
    const { data: updatedOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'delivered',
        delivered_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) throw updateError

    return updatedOrder
  }, { operation: 'receivePurchaseOrder', table: 'purchase_orders' })
}

/**
 * Cancelar orden de compra
 */
export async function cancelPurchaseOrder(id: string, reason?: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que la orden existe y no está recibida
    const { data: currentOrder } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single()

    if (!currentOrder) {
      throw new Error('Orden de compra no encontrada')
    }

    if (currentOrder.status === 'delivered') {
      throw new Error('No se puede cancelar una orden ya recibida')
    }

    if (currentOrder.status === 'cancelled') {
      throw new Error('La orden ya está cancelada')
    }

    // Cancelar orden
    const { data: cancelledOrder, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'cancelled',
        notes: reason ? `${currentOrder.notes || ''}\n\nCancelada: ${reason}` : currentOrder.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return cancelledOrder
  }, { operation: 'cancelPurchaseOrder', table: 'purchase_orders' })
}

