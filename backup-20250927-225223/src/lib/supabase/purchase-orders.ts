import { createClient } from '@/lib/supabase/client'

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreatePurchaseOrderData {
  order_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
}

export interface PurchaseOrderStats {
  totalOrders: number
  pendingOrders: number
  confirmedOrders: number
  shippedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  totalValue: number
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        supplier_id,
        order_date,
        expected_delivery_date,
        status,
        subtotal,
        tax_amount,
        total,
        notes,
        created_at,
        updated_at
      `)
      .order('order_date', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No purchase orders found in database')
      return []
    }

    return data.map(order => ({
      id: order.id,
      order_number: order.order_number || 'N/A',
      supplier_id: order.supplier_id || '',
      order_date: order.order_date || new Date().toISOString(),
      expected_delivery_date: order.expected_delivery_date || new Date().toISOString(),
      status: order.status || 'pending',
      subtotal: Number(order.subtotal) || 0,
      tax_amount: Number(order.tax_amount) || 0,
      total: Number(order.total) || 0,
      notes: order.notes || undefined,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Unexpected error fetching purchase orders:', error)
    return []
  }
}

export async function createPurchaseOrder(orderData: CreatePurchaseOrderData): Promise<PurchaseOrder | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{
        order_number: orderData.order_number,
        supplier_id: orderData.supplier_id,
        order_date: orderData.order_date,
        expected_delivery_date: orderData.expected_delivery_date,
        status: orderData.status,
        subtotal: orderData.subtotal,
        tax_amount: orderData.tax_amount,
        total: orderData.total,
        notes: orderData.notes
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating purchase order:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return null
  }
}

export async function updatePurchaseOrder(id: string, orderData: Partial<CreatePurchaseOrderData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (orderData.order_number) updateData.order_number = orderData.order_number
    if (orderData.supplier_id) updateData.supplier_id = orderData.supplier_id
    if (orderData.order_date) updateData.order_date = orderData.order_date
    if (orderData.expected_delivery_date) updateData.expected_delivery_date = orderData.expected_delivery_date
    if (orderData.status) updateData.status = orderData.status
    if (orderData.subtotal !== undefined) updateData.subtotal = orderData.subtotal
    if (orderData.tax_amount !== undefined) updateData.tax_amount = orderData.tax_amount
    if (orderData.total !== undefined) updateData.total = orderData.total
    if (orderData.notes !== undefined) updateData.notes = orderData.notes

    const { error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating purchase order:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating purchase order:', error)
    return false
  }
}

export async function deletePurchaseOrder(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting purchase order:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return false
  }
}

export async function getPurchaseOrderStats(): Promise<PurchaseOrderStats> {
  const supabase = createClient()
  
  try {
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select('status, total')

    if (error) {
      console.error('Error fetching purchase order stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalValue: 0
      }
    }

    if (!orders || orders.length === 0) {
      console.log('No purchase orders found for stats calculation')
      return {
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalValue: 0
      }
    }

    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const confirmedOrders = orders.filter(o => o.status === 'confirmed').length
    const shippedOrders = orders.filter(o => o.status === 'shipped').length
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
    const totalValue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalValue
    }
  } catch (error) {
    console.error('Unexpected error fetching purchase order stats:', error)
    return {
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalValue: 0
    }
  }
}