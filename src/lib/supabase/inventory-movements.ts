/**
 * Servicio de Movimientos de Inventario
 * Funciones para manejar movimientos de inventario
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'

export interface InventoryMovement {
  id: string
  product_id: string
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  unit_cost?: number
  total_cost?: number
  reference?: string
  notes?: string
  created_at: string
  created_by?: string
}

export interface MovementStats {
  totalMovements: number
  movementsByType: Array<{
    type: string
    count: number
    totalQuantity: number
  }>
  recentMovements: InventoryMovement[]
}

/**
 * Obtener movimientos de inventario
 */
export async function getInventoryMovements(filters?: {
  product_id?: string
  type?: string
  date_from?: string
  date_to?: string
}): Promise<InventoryMovement[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('inventory_movements').select('*')
      
      if (filters) {
        if (filters.product_id) {
          query = query.eq('product_id', filters.product_id)
        }
        if (filters.type) {
          query = query.eq('type', filters.type)
        }
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch inventory movements: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getInventoryMovements',
      table: 'inventory_movements'
    }
  )
}

/**
 * Obtener estadísticas de movimientos
 */
export async function getMovementStats(): Promise<MovementStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('inventory_movements')
        .select('type, quantity, created_at')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch movement stats: ${error.message}`)
      }
      
      const totalMovements = data?.length || 0
      
      // Agrupar por tipo
      const movementsByType = data?.reduce((acc: any, movement: any) => {
        const type = movement.type
        if (!acc[type]) {
          acc[type] = { count: 0, totalQuantity: 0 }
        }
        acc[type].count += 1
        acc[type].totalQuantity += movement.quantity
        return acc
      }, {}) || {}
      
      const movementsByTypeArray = Object.entries(movementsByType).map(([type, data]: [string, any]) => ({
        type,
        count: data.count,
        totalQuantity: data.totalQuantity
      }))
      
      // Movimientos recientes
      const recentMovements = data?.slice(0, 10) || []
      
      return {
        totalMovements,
        movementsByType: movementsByTypeArray,
        recentMovements
      }
    },
    {
      operation: 'getMovementStats',
      table: 'inventory_movements'
    }
  )
}

/**
 * Crear movimiento de inventario
 */
export async function createInventoryMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>): Promise<InventoryMovement> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('inventory_movements')
        .insert(movement)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create inventory movement: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createInventoryMovement',
      table: 'inventory_movements'
    }
  )
}

/**
 * Actualizar movimiento de inventario
 */
export async function updateInventoryMovement(id: string, movement: Partial<InventoryMovement>): Promise<InventoryMovement> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('inventory_movements')
        .update(movement)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update inventory movement: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateInventoryMovement',
      table: 'inventory_movements'
    }
  )
}

/**
 * Eliminar movimiento de inventario
 */
export async function deleteInventoryMovement(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('inventory_movements')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete inventory movement: ${error.message}`)
      }
    },
    {
      operation: 'deleteInventoryMovement',
      table: 'inventory_movements'
    }
  )
}
