import { createClient, getSupabaseServiceClient } from '@/lib/supabase/server'
import { DatabaseError, handleSupabaseError } from '@/lib/errors/APIError'

/**
 * Tipos para el sistema de inventario
 */
export interface InventoryCategory {
  id: string
  organization_id: string
  name: string
  description?: string
  created_at: string
}

export interface InventoryItem {
  id: string
  organization_id: string
  category_id: string
  name: string
  description?: string
  sku: string
  quantity: number
  min_quantity: number
  unit_price: number
  created_at: string
  updated_at: string
  // Relación con categoría
  category?: InventoryCategory
}

export interface InventoryMovement {
  id: string
  inventory_id: string
  movement_type: 'entrada' | 'salida' | 'ajuste'
  quantity: number
  reference_type?: string
  reference_id?: string
  notes?: string
  created_at: string
  // Relación con item
  inventory_item?: {
    name: string
    sku: string
  }
}

export interface CreateInventoryItemData {
  category_id: string
  name: string
  description?: string
  sku: string
  quantity: number
  min_quantity: number
  unit_price: number
}

export interface UpdateInventoryItemData extends Partial<CreateInventoryItemData> {}

export interface CreateInventoryMovementData {
  inventory_id: string
  movement_type: 'entrada' | 'salida' | 'ajuste'
  quantity: number
  reference_type?: string
  reference_id?: string
  notes?: string
}

export interface CreateInventoryCategoryData {
  name: string
  description?: string
}

export interface UpdateInventoryCategoryData extends Partial<CreateInventoryCategoryData> {}

/**
 * ARTÍCULOS DE INVENTARIO - CRUD
 */

/**
 * Obtener todas las categorías de inventario
 */
export async function getAllCategories(organizationId: string): Promise<InventoryCategory[]> {
  console.log('🔍 getAllCategories - Iniciando para organization:', organizationId)
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('❌ Error fetching categories:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    throw new DatabaseError('Error al obtener categorías de inventario', error)
  }

  console.log('✅ getAllCategories - Exitoso:', data?.length || 0, 'categorías encontradas')
  return data as InventoryCategory[]
}

/**
 * Crear una nueva categoría de inventario
 * IMPORTANTE: Usa Service Client para bypasear RLS
 */
export async function createCategory(categoryData: {
  name: string
  description?: string
  organization_id: string
}): Promise<InventoryCategory> {
  console.log('🔄 [createCategory] Iniciando creación:', categoryData.name)
  console.log('📦 [createCategory] Datos completos:', categoryData)
  
  // ✅ Usar Service Client en lugar de browser client
  const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServiceClient()
  
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert([{
      name: categoryData.name,
      description: categoryData.description || null,
      organization_id: categoryData.organization_id
    }])
    .select()
    .single()

  if (error) {
    console.error('❌ [createCategory] Error al insertar:', error)
    console.error('❌ [createCategory] Detalles del error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw new DatabaseError('Error al crear categoría de inventario', error)
  }

  if (!data) {
    console.error('❌ [createCategory] No se retornó data')
    throw new DatabaseError('Error: categoría no fue creada', error)
  }

  console.log('✅ [createCategory] Categoría creada exitosamente:', data.id)
  return data as InventoryCategory
}

/**
 * Obtener todos los artículos de inventario
 */
export async function getAllInventoryItems(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      category:inventory_categories(
        id,
        name,
        description
      )
    `)
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching inventory items:', error)
    throw new DatabaseError('Error al obtener artículos de inventario', error)
  }

  return data as InventoryItem[]
}

/**
 * Obtener un artículo de inventario por ID
 */
export async function getInventoryItemById(organizationId: string, id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      category:inventory_categories(
        id,
        name,
        description
      )
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    console.error('Error fetching inventory item by id:', error)
    throw new Error('Error al obtener el artículo de inventario')
  }

  return data as InventoryItem
}

/**
 * Crear un nuevo artículo de inventario
 */
export async function createInventoryItem(organizationId: string, itemData: CreateInventoryItemData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .insert([
      {
        organization_id: organizationId,
        category_id: itemData.category_id,
        name: itemData.name,
        description: itemData.description,
        sku: itemData.sku,
        quantity: itemData.quantity,
        min_quantity: itemData.min_quantity,
        unit_price: itemData.unit_price,
        code: itemData.sku, // Usar SKU como código
        status: 'active',
      },
    ])
    .select(`
      *,
      category:inventory_categories(
        id,
        name,
        description
      )
    `)
    .single()

  if (error) {
    console.error('Error creating inventory item:', error)
    throw new Error(`Error al crear el artículo de inventario: ${error.message}`)
  }

  return data as InventoryItem
}

/**
 * Actualizar un artículo de inventario
 */
export async function updateInventoryItem(organizationId: string, id: string, itemData: UpdateInventoryItemData) {
  const supabase = await createClient()

  // Mapear los campos correctamente
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (itemData.name !== undefined) updateData.name = itemData.name;
  if (itemData.sku !== undefined) updateData.sku = itemData.sku;
  if (itemData.description !== undefined) updateData.description = itemData.description;
  if (itemData.category_id !== undefined) updateData.category_id = itemData.category_id;
  if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity;
  if (itemData.unit_price !== undefined) updateData.unit_price = itemData.unit_price;
  if (itemData.min_quantity !== undefined) updateData.min_quantity = itemData.min_quantity;

  const { data, error } = await supabase
    .from('inventory')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(`
      *,
      category:inventory_categories(
        id,
        name,
        description
      )
    `)
    .single()

  if (error) {
    console.error('Error updating inventory item:', error)
    throw new Error(`Error al actualizar el artículo de inventario: ${error.message}`)
  }

  return data as InventoryItem
}

/**
 * Eliminar un artículo de inventario
 */
export async function deleteInventoryItem(organizationId: string, id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error deleting inventory item:', error)
    throw new Error('Error al eliminar el artículo de inventario')
  }

  return { success: true }
}

/**
 * Buscar artículos de inventario
 */
export async function searchInventoryItems(searchTerm: string, organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      category:inventory_categories(
        id,
        name,
        description
      )
    `)
    .eq('organization_id', organizationId)
    .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error searching inventory items:', error)
    throw new Error('Error al buscar artículos de inventario')
  }

  return data as InventoryItem[]
}

/**
 * Obtener artículos con stock bajo
 */
export async function getLowStockItems(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      category:inventory_categories(
        id,
        name,
        description
      )
    `)
    .eq('organization_id', organizationId)
    .filter('quantity', 'lte', 'min_quantity')
    .order('quantity', { ascending: true })

  if (error) {
    console.error('Error fetching low stock items:', error)
    throw new Error('Error al obtener artículos con stock bajo')
  }

  return data as InventoryItem[]
}

/**
 * CATEGORÍAS DE INVENTARIO - CRUD
 */

/**
 * Obtener todas las categorías de inventario
 */
export async function getAllInventoryCategories(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching inventory categories:', error)
    throw new Error('Error al obtener categorías de inventario')
  }

  return data as InventoryCategory[]
}

/**
 * Obtener una categoría por ID
 */
export async function getInventoryCategoryById(organizationId: string, id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    console.error('Error fetching inventory category by id:', error)
    throw new Error('Error al obtener la categoría de inventario')
  }

  return data as InventoryCategory
}

/**
 * Crear una nueva categoría de inventario
 */
export async function createInventoryCategory(organizationId: string, categoryData: CreateInventoryCategoryData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .insert([
      {
        ...categoryData,
        organization_id: organizationId,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating inventory category:', error)
    throw new Error('Error al crear la categoría de inventario')
  }

  return data as InventoryCategory
}

/**
 * Actualizar una categoría de inventario
 */
export async function updateInventoryCategory(organizationId: string, id: string, categoryData: UpdateInventoryCategoryData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .update(categoryData)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating inventory category:', error)
    throw new Error('Error al actualizar la categoría de inventario')
  }

  return data as InventoryCategory
}

/**
 * Eliminar una categoría de inventario
 */
/**
 * Eliminar una categoría de inventario
 * IMPORTANTE: Usa Service Client para bypasear RLS
 */
export async function deleteInventoryCategory(organizationId: string, id: string) {
  console.log('🔄 [deleteInventoryCategory] Iniciando eliminación:', id)
  console.log('📦 [deleteInventoryCategory] Organization ID:', organizationId)
  
  // ✅ Usar Service Client en lugar de browser client
  const supabase = getSupabaseServiceClient()

  const { error } = await (supabase
    .from('inventory_categories') as any)
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('❌ [deleteInventoryCategory] Error al eliminar:', error)
    console.error('❌ [deleteInventoryCategory] Detalles del error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw new DatabaseError('Error al eliminar la categoría de inventario', error)
  }

  console.log('✅ [deleteInventoryCategory] Categoría eliminada exitosamente:', id)
  return { success: true }
}

/**
 * MOVIMIENTOS DE INVENTARIO - CRUD
 */

/**
 * Obtener todos los movimientos de inventario
 */
export async function getAllInventoryMovements(inventoryId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      inventory_item:inventory(
        name,
        sku
      )
    `)
    .order('created_at', { ascending: false })

  if (inventoryId) {
    query = query.eq('inventory_id', inventoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching inventory movements:', error)
    throw new Error('Error al obtener movimientos de inventario')
  }

  return data as InventoryMovement[]
}

/**
 * Crear un movimiento de inventario
 */
export async function createInventoryMovement(movementData: CreateInventoryMovementData) {
  const supabase = await createClient()

  // Iniciar transacción
  const { data: item } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('id', movementData.inventory_id)
    .single()

  if (!item) throw new Error('Item de inventario no encontrado')

  // Calcular nueva cantidad
  let newQuantity = item.quantity
  if (movementData.movement_type === 'entrada' || movementData.movement_type === 'ajuste') {
    newQuantity += movementData.quantity
  } else if (movementData.movement_type === 'salida') {
    newQuantity -= movementData.quantity
    if (newQuantity < 0) {
      throw new Error('No hay suficiente stock disponible')
    }
  }

  // Crear movimiento
  const { data: movement, error: movementError } = await supabase
    .from('inventory_movements')
    .insert([movementData])
    .select(`
      *,
      inventory_item:inventory(
        name,
        sku
      )
    `)
    .single()

  if (movementError) {
    console.error('Error creating inventory movement:', movementError)
    throw new Error('Error al crear el movimiento de inventario')
  }

  // Actualizar cantidad en inventario
  const { error: updateError } = await supabase
    .from('inventory')
    .update({ 
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', movementData.inventory_id)

  if (updateError) {
    console.error('Error updating inventory quantity:', updateError)
    throw new Error('Error al actualizar la cantidad del inventario')
  }

  return movement as InventoryMovement
}

/**
 * Obtener movimientos de un artículo específico
 */
export async function getInventoryMovementsByItemId(inventoryId: string) {
  return getAllInventoryMovements(inventoryId)
}

/**
 * Obtener estadísticas de inventario
 */
export async function getInventoryStats(organizationId: string) {
  const supabase = await createClient()

  // Total de artículos
  const { count: totalItems } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Artículos con stock bajo
  const { count: lowStockItems } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .filter('quantity', 'lte', 'min_quantity')

  // Valor total del inventario
  const { data: items } = await supabase
    .from('inventory')
    .select('quantity, unit_price')
    .eq('organization_id', organizationId)

  const totalValue = items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0

  return {
    totalItems: totalItems || 0,
    lowStockItems: lowStockItems || 0,
    totalValue,
  }
}