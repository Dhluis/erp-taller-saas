import { createClient } from '@/lib/supabase/client'

export interface WorkOrder {
  id: string
  customer_name: string
  vehicle_info: string
  service_description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  total: number
  created_at: string
  updated_at: string
}

export interface CreateWorkOrderData {
  customer_name: string
  vehicle_info: string
  service_description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  total: number
}

export interface WorkOrderStats {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
}

export async function getWorkOrders(): Promise<WorkOrder[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching work orders:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No work orders found in database')
      return []
    }

    return data.map(order => ({
      id: order.id,
      customer_name: order.customer_name || 'Cliente desconocido',
      vehicle_info: order.vehicle_info || 'Vehículo no especificado',
      service_description: order.service_description || 'Sin descripción',
      status: order.status || 'pending',
      total: Number(order.total) || 0,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Unexpected error fetching work orders:', error)
    return []
  }
}

export async function createWorkOrder(orderData: CreateWorkOrderData): Promise<WorkOrder | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .insert([{
        customer_name: orderData.customer_name,
        vehicle_info: orderData.vehicle_info,
        service_description: orderData.service_description,
        status: orderData.status,
        total: orderData.total
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating work order:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating work order:', error)
    return null
  }
}

export async function updateWorkOrder(id: string, orderData: Partial<CreateWorkOrderData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (orderData.customer_name) updateData.customer_name = orderData.customer_name
    if (orderData.vehicle_info) updateData.vehicle_info = orderData.vehicle_info
    if (orderData.service_description) updateData.service_description = orderData.service_description
    if (orderData.status) updateData.status = orderData.status
    if (orderData.total !== undefined) updateData.total = orderData.total

    const { error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating work order:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating work order:', error)
    return false
  }
}

export async function deleteWorkOrder(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting work order:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting work order:', error)
    return false
  }
}

export async function getWorkOrderStats(): Promise<WorkOrderStats> {
  const supabase = createClient()
  
  try {
    const { data: orders, error } = await supabase
      .from('work_orders')
      .select('status, total')

    if (error) {
      console.error('Error fetching work order stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        totalOrders: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0
      }
    }

    if (!orders || orders.length === 0) {
      console.log('No work orders found for stats calculation')
      return {
        totalOrders: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0
      }
    }

    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const inProgressOrders = orders.filter(o => o.status === 'in_progress').length
    const completedOrders = orders.filter(o => o.status === 'completed').length
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

    return {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue
    }
  } catch (error) {
    console.error('Unexpected error fetching work order stats:', error)
    return {
      totalOrders: 0,
      pendingOrders: 0,
      inProgressOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0
    }
  }
}
