/**
 * Servicio de Órdenes de Trabajo
 * Funciones para manejar órdenes de trabajo
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { WorkOrder, WorkOrderInsert, WorkOrderUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: WorkOrder

export interface CreateWorkOrderData {
  customer_id: string
  vehicle_id: string
  description?: string
  estimated_cost?: number
  estimated_completion?: string
  notes?: string
}

export interface UpdateWorkOrderData {
  status?: string
  description?: string
  estimated_cost?: number
  final_cost?: number
  estimated_completion?: string
  completed_at?: string
  notes?: string
  subtotal?: number
  tax_amount?: number
  discount_amount?: number
  total_amount?: number
}

/**
 * Obtener órdenes de trabajo
 */
export async function getWorkOrders(filters?: {
  status?: string
  customer_id?: string
  vehicle_id?: string
  date_from?: string
  date_to?: string
}): Promise<WorkOrder[]> {
  console.log('🔍 getWorkOrders - Usando datos mock temporalmente...')
  
  // TEMPORAL: Usar solo datos mock para evitar errores de BD
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
  
  const mockOrders: WorkOrder[] = [
    {
      id: generateUUID(),
      organization_id: '042ab6bd-8979-4166-882a-c244b5e51e51',
      customer_id: '550e8400-e29b-41d4-a716-446655440001',
      vehicle_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'pending',
      description: 'Reparación de motor',
      estimated_cost: 1500.00,
      final_cost: null,
      entry_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_completion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: null,
      notes: 'Cliente reporta ruido extraño en el motor',
      subtotal: 1500.00,
      tax_amount: 240.00,
      discount_amount: 0,
      total_amount: 1740.00,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: generateUUID(),
      organization_id: '042ab6bd-8979-4166-882a-c244b5e51e51',
      customer_id: '550e8400-e29b-41d4-a716-446655440003',
      vehicle_id: '550e8400-e29b-41d4-a716-446655440004',
      status: 'in_progress',
      description: 'Cambio de aceite y filtros',
      estimated_cost: 120.00,
      final_cost: null,
      entry_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_completion: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: null,
      notes: 'Mantenimiento preventivo',
      subtotal: 120.00,
      tax_amount: 19.20,
      discount_amount: 0,
      total_amount: 139.20,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: generateUUID(),
      organization_id: '042ab6bd-8979-4166-882a-c244b5e51e51',
      customer_id: '550e8400-e29b-41d4-a716-446655440005',
      vehicle_id: '550e8400-e29b-41d4-a716-446655440006',
      status: 'completed',
      description: 'Reparación de frenos',
      estimated_cost: 800.00,
      final_cost: 750.00,
      entry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_completion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Pastillas y discos reemplazados',
      subtotal: 750.00,
      tax_amount: 120.00,
      discount_amount: 50.00,
      total_amount: 820.00,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
  
  console.log(`✅ Generadas ${mockOrders.length} órdenes mock con UUIDs válidos`)
  return mockOrders
}

/**
 * Obtener estadísticas de órdenes de trabajo
 */
export async function getWorkOrderStats(): Promise<{
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  totalValue: number
  completedValue: number
}> {
  console.log('📊 getWorkOrderStats - Usando estadísticas mock...')
  
  // TEMPORAL: Usar solo estadísticas mock
  const mockStats = {
    total: 3,
    pending: 1,
    in_progress: 1,
    completed: 1,
    cancelled: 0,
    totalValue: 2699.20, // 1740.00 + 139.20 + 820.00
    completedValue: 820.00
  }
  
  console.log('✅ Estadísticas mock generadas:', mockStats)
  return mockStats
}

/**
 * Obtener orden de trabajo por ID
 */
export async function getWorkOrderById(id: string): Promise<WorkOrder | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch work order: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getWorkOrderById',
      table: 'work_orders'
    }
  )
}

/**
 * Crear orden de trabajo
 */
export async function createWorkOrder(workOrder: CreateWorkOrderData): Promise<WorkOrder> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('work_orders')
        .insert({
          ...workOrder,
          status: 'pending',
          entry_date: new Date().toISOString(),
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create work order: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createWorkOrder',
      table: 'work_orders'
    }
  )
}

/**
 * Actualizar orden de trabajo
 */
export async function updateWorkOrder(id: string, workOrder: UpdateWorkOrderData): Promise<WorkOrder> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('work_orders')
        .update({
          ...workOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update work order: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateWorkOrder',
      table: 'work_orders'
    }
  )
}

/**
 * Marcar orden como completada
 */
export async function completeWorkOrder(id: string, finalCost?: number): Promise<WorkOrder> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('work_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_cost: finalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to complete work order: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'completeWorkOrder',
      table: 'work_orders'
    }
  )
}

/**
 * Eliminar orden de trabajo
 */
export async function deleteWorkOrder(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('work_orders')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete work order: ${error.message}`)
      }
    },
    {
      operation: 'deleteWorkOrder',
      table: 'work_orders'
    }
  )
}


