import { createClient } from '@/lib/supabase/client'

export interface InventoryMovement {
  id: string
  product_id: string
  product_name?: string
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  reference_type: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return'
  reference_id?: string
  notes?: string
  user_id?: string
  user_name?: string
  created_at: string
  updated_at: string
}

export interface MovementStats {
  totalMovements: number
  movementsIn: number
  movementsOut: number
  totalQuantityIn: number
  totalQuantityOut: number
  adjustmentsToday: number
}

export async function getInventoryMovements(): Promise<InventoryMovement[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        user_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching inventory movements:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No inventory movements found in database')
      return []
    }

    return data.map(movement => ({
      id: movement.id,
      product_id: movement.product_id,
      product_name: 'Producto', // Simplificado sin JOIN
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      reference_type: movement.reference_type,
      reference_id: movement.reference_id,
      notes: movement.notes,
      user_id: movement.user_id,
      user_name: 'Usuario', // Simplificado sin JOIN
      created_at: movement.created_at,
      updated_at: movement.updated_at
    }))
  } catch (error) {
    console.error('Unexpected error fetching inventory movements:', error)
    return []
  }
}

export async function createInventoryMovement(movementData: Partial<InventoryMovement>): Promise<InventoryMovement | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([{
        product_id: movementData.product_id,
        movement_type: movementData.movement_type,
        quantity: movementData.quantity,
        reference_type: movementData.reference_type,
        reference_id: movementData.reference_id,
        notes: movementData.notes,
        user_id: movementData.user_id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating inventory movement:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating inventory movement:', error)
    return null
  }
}

export async function updateInventoryMovement(id: string, movementData: Partial<InventoryMovement>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('inventory_movements')
      .update({
        ...movementData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating inventory movement:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating inventory movement:', error)
    return false
  }
}

export async function deleteInventoryMovement(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting inventory movement:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting inventory movement:', error)
    return false
  }
}

export async function getMovementStats(): Promise<MovementStats> {
  const supabase = createClient()
  
  try {
    const { data: movements, error } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity, created_at')

    if (error) {
      console.error('Error fetching movement stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        totalMovements: 0,
        movementsIn: 0,
        movementsOut: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0,
        adjustmentsToday: 0
      }
    }

    if (!movements || movements.length === 0) {
      console.log('No movements found for stats calculation')
      return {
        totalMovements: 0,
        movementsIn: 0,
        movementsOut: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0,
        adjustmentsToday: 0
      }
    }

    const today = new Date().toISOString().split('T')[0]
    
    const totalMovements = movements.length
    const movementsIn = movements.filter(m => m.movement_type === 'in').length
    const movementsOut = movements.filter(m => m.movement_type === 'out').length
    const totalQuantityIn = movements
      .filter(m => m.movement_type === 'in')
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0)
    const totalQuantityOut = movements
      .filter(m => m.movement_type === 'out')
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0)
    const adjustmentsToday = movements
      .filter(m => m.movement_type === 'adjustment' && m.created_at?.startsWith(today))
      .length

    return {
      totalMovements,
      movementsIn,
      movementsOut,
      totalQuantityIn,
      totalQuantityOut,
      adjustmentsToday
    }
  } catch (error) {
    console.error('Unexpected error fetching movement stats:', error)
    return {
      totalMovements: 0,
      movementsIn: 0,
      movementsOut: 0,
      totalQuantityIn: 0,
      totalQuantityOut: 0,
      adjustmentsToday: 0
    }
  }
}
