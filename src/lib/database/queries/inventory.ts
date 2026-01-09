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
  console.log('🔄 [createInventoryItem] Iniciando creación:', itemData.name)
  console.log('📦 [createInventoryItem] Datos completos:', { organizationId, ...itemData })
  
  // ✅ Usar Service Client
  const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServiceClient()

  // ✅ Generar código único POR ORGANIZACIÓN (multi-tenant)
  // Después de la migración 022, el constraint es UNIQUE(organization_id, code)
  // Estrategia: Usar SKU directamente si está disponible, o generar uno único
  // Si el SKU ya existe en esta organización, agregar sufijo numérico
  let uniqueCode = itemData.sku || `PROD-${Date.now()}`
  
  // ✅ Si hay SKU, verificar si ya existe en esta organización
  if (itemData.sku) {
    const { data: existingWithCode } = await supabase
      .from('inventory')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', itemData.sku)
      .maybeSingle()
    
    // Si ya existe, agregar sufijo numérico
    if (existingWithCode) {
      let counter = 1
      let candidateCode = `${itemData.sku}-${counter}`
      let stillExists = true
      
      // Buscar un código disponible (máximo 1000 intentos)
      while (stillExists && counter < 1000) {
        const { data: check } = await supabase
          .from('inventory')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('code', candidateCode)
          .maybeSingle()
        
        if (!check) {
          stillExists = false
          uniqueCode = candidateCode
        } else {
          counter++
          candidateCode = `${itemData.sku}-${counter}`
        }
      }
      
      if (counter >= 1000) {
        // Si no encontramos uno disponible después de 1000 intentos, usar timestamp
        uniqueCode = `${itemData.sku}-${Date.now()}`
      }
    } else {
      uniqueCode = itemData.sku
    }
  }
  
  const insertData = {
    organization_id: organizationId,
    category_id: itemData.category_id,
    name: itemData.name,
    description: itemData.description || null,
    sku: itemData.sku || null,
    quantity: itemData.quantity || 0,
    min_quantity: itemData.min_quantity || 0,
    unit_price: itemData.unit_price || 0,
    code: uniqueCode, // ✅ Código único por organización (multi-tenant)
    status: 'active',
  }

  console.log('📦 [createInventoryItem] Datos a insertar:', insertData)

  const { data, error } = await supabase
    .from('inventory')
    .insert([insertData])
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
    console.error('❌ [createInventoryItem] Error al insertar:', error)
    console.error('❌ [createInventoryItem] Detalles:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    
    // Manejar error específico de constraint único (code duplicado)
    if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
      throw new Error(`Ya existe un producto con el código/SKU: ${uniqueCode}. Por favor usa un código diferente.`)
    }
    
    throw new Error(`Error al crear el artículo de inventario: ${error.message}`)
  }

  if (!data) {
    console.error('❌ [createInventoryItem] No se retornó data después de insertar')
    throw new Error('Error: item de inventario no fue creado. Verifica los datos e intenta nuevamente.')
  }

  console.log('✅ [createInventoryItem] Item creado exitosamente:', {
    id: data.id,
    name: data.name,
    sku: data.sku,
    organization_id: data.organization_id
  })
  return data as InventoryItem
}

/**
 * Actualizar un artículo de inventario
 */
export async function updateInventoryItem(organizationId: string, id: string, itemData: UpdateInventoryItemData) {
  console.log('🔄 [updateInventoryItem] Iniciando actualización:', id)
  console.log('📦 [updateInventoryItem] Datos recibidos:', itemData)
  
  // ✅ Usar Service Client
  const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServiceClient()

  // Mapear los campos correctamente
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (itemData.name !== undefined) updateData.name = itemData.name;
  if (itemData.sku !== undefined) {
    updateData.sku = itemData.sku;
    // ✅ No actualizar code automáticamente porque tiene constraint UNIQUE global
    // El code se mantiene como está para evitar conflictos
  }
  if (itemData.description !== undefined) updateData.description = itemData.description;
  if (itemData.category_id !== undefined) updateData.category_id = itemData.category_id;
  if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity;
  if (itemData.unit_price !== undefined) updateData.unit_price = itemData.unit_price;
  
  // ✅ FIX: Mapear minimum_stock a min_quantity si viene
  if (itemData.min_quantity !== undefined) {
    updateData.min_quantity = itemData.min_quantity;
  } else if ((itemData as any).minimum_stock !== undefined) {
    updateData.min_quantity = (itemData as any).minimum_stock;
  }

  console.log('📤 [updateInventoryItem] Datos que se actualizarán:', updateData)
  console.log('🔍 [updateInventoryItem] Buscando producto con id:', id, 'y organization_id:', organizationId)

  // ✅ Verificar que el producto existe y pertenece a la organización antes de actualizar
  const { data: existingItem, error: checkError } = await supabase
    .from('inventory')
    .select('id, name, organization_id, category_id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (checkError) {
    console.error('❌ [updateInventoryItem] Error al buscar producto:', {
      id,
      organizationId,
      checkError: checkError?.message,
      code: checkError?.code,
      details: checkError?.details
    })
    throw new Error(`Error al buscar el producto: ${checkError.message}`)
  }

  if (!existingItem) {
    // ✅ Intentar buscar sin filtro de organization_id para diagnosticar
    const { data: itemWithoutOrgCheck } = await supabase
      .from('inventory')
      .select('id, name, organization_id')
      .eq('id', id)
      .maybeSingle()
    
    if (itemWithoutOrgCheck) {
      console.error('❌ [updateInventoryItem] Producto encontrado pero con diferente organization_id:', {
        productId: id,
        productOrganizationId: itemWithoutOrgCheck.organization_id,
        requestedOrganizationId: organizationId
      })
      throw new Error(`El producto existe pero no pertenece a tu organización`)
    } else {
      console.error('❌ [updateInventoryItem] Producto no encontrado en la base de datos:', {
        id,
        organizationId
      })
      throw new Error(`Producto no encontrado con ID: ${id}`)
    }
  }

  console.log('✅ [updateInventoryItem] Producto encontrado:', existingItem.name)
  console.log('✅ [updateInventoryItem] organization_id del producto:', existingItem.organization_id)

  // ✅ Actualizar el producto (usar solo id ya que verificamos organization_id arriba)
  const { data, error } = await supabase
    .from('inventory')
    .update(updateData)
    .eq('id', id)
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
    console.error('❌ [updateInventoryItem] Error al actualizar:', error)
    console.error('❌ [updateInventoryItem] Detalles:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw new Error(`Error al actualizar el artículo de inventario: ${error.message}`)
  }

  if (!data) {
    console.error('❌ [updateInventoryItem] No se retornó data después de actualizar')
    throw new Error('Error: item de inventario no fue actualizado. Verifica que el producto exista y pertenezca a tu organización.')
  }

  console.log('✅ [updateInventoryItem] Item actualizado exitosamente:', data.id)
  console.log('✅ [updateInventoryItem] min_quantity guardado:', data.min_quantity)
  return data as InventoryItem
}

/**
 * Eliminar un artículo de inventario
 */
export async function deleteInventoryItem(organizationId: string, id: string) {
  console.log('🔄 [deleteInventoryItem] Iniciando eliminación:', { id, organizationId })
  
  // ✅ Usar Service Client
  const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServiceClient()

  // ✅ Verificar que el producto existe y pertenece a la organización
  const { data: existingItem, error: checkError } = await supabase
    .from('inventory')
    .select('id, name, organization_id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (checkError) {
    console.error('❌ [deleteInventoryItem] Error al buscar producto:', checkError)
    throw new Error(`Error al buscar el producto: ${checkError.message}`)
  }

  if (!existingItem) {
    console.error('❌ [deleteInventoryItem] Producto no encontrado o no pertenece a la organización:', { id, organizationId })
    throw new Error(`Producto no encontrado o no pertenece a tu organización`)
  }

  console.log('✅ [deleteInventoryItem] Producto encontrado:', existingItem.name)

  // ✅ Eliminar el producto
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('❌ [deleteInventoryItem] Error al eliminar:', error)
    console.error('❌ [deleteInventoryItem] Detalles:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw new Error(`Error al eliminar el artículo de inventario: ${error.message}`)
  }

  console.log('✅ [deleteInventoryItem] Producto eliminado exitosamente')
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
  console.log('🔄 [deleteInventoryCategory] Iniciando eliminación:', { id, organizationId })
  
  // ✅ Usar Service Client
  const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServiceClient()

  // ✅ Primero buscar sin filtro de organization_id para diagnosticar
  const { data: categoryById, error: findError } = await supabase
    .from('inventory_categories')
    .select('id, name, organization_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) {
    console.error('❌ [deleteInventoryCategory] Error al buscar categoría:', findError)
    throw new Error(`Error al buscar la categoría: ${findError.message}`)
  }

  if (!categoryById) {
    console.error('❌ [deleteInventoryCategory] Categoría no encontrada en la BD:', { id })
    
    // ✅ Intentar buscar todas las categorías de la organización para ver qué existe
    const { data: allCategories } = await supabase
      .from('inventory_categories')
      .select('id, name, organization_id')
      .eq('organization_id', organizationId)
      .limit(10)
    
    console.log('🔍 [deleteInventoryCategory] Categorías de la organización:', allCategories?.length || 0)
    if (allCategories && allCategories.length > 0) {
      console.log('📋 [deleteInventoryCategory] IDs de categorías encontradas:', allCategories.map(c => c.id))
    }
    
    throw new Error(`Categoría no encontrada con ID: ${id}`)
  }

  console.log('🔍 [deleteInventoryCategory] Categoría encontrada en BD:', {
    id: categoryById.id,
    name: categoryById.name,
    categoryOrganizationId: categoryById.organization_id,
    requestedOrganizationId: organizationId,
    match: categoryById.organization_id === organizationId
  })

  // ✅ Verificar que pertenece a la organización correcta
  if (categoryById.organization_id !== organizationId) {
    console.error('❌ [deleteInventoryCategory] La categoría pertenece a otra organización:', {
      categoriaOrganizationId: categoryById.organization_id,
      requestedOrganizationId: organizationId,
      categoryName: categoryById.name,
      match: categoryById.organization_id === organizationId
    })
    throw new Error(`Esta categoría pertenece a otra organización. No tienes permisos para eliminarla.`)
  }

  console.log('✅ [deleteInventoryCategory] Categoría encontrada y validada:', categoryById.name)

  // ✅ Verificar si tiene productos asociados antes de eliminar
  const { data: itemsWithCategory, error: itemsError } = await supabase
    .from('inventory')
    .select('id')
    .eq('category_id', id)
    .eq('organization_id', organizationId)
    .limit(1)

  if (itemsError) {
    console.error('❌ [deleteInventoryCategory] Error verificando productos asociados:', itemsError)
    // Continuar con la eliminación de todas formas, la BD manejará la restricción si existe
  } else if (itemsWithCategory && itemsWithCategory.length > 0) {
    console.error('❌ [deleteInventoryCategory] No se puede eliminar: tiene productos asociados')
    throw new Error(`No se puede eliminar la categoría porque tiene ${itemsWithCategory.length} producto(s) asociado(s)`)
  }

  // ✅ Eliminar la categoría
  const { error } = await supabase
    .from('inventory_categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('❌ [deleteInventoryCategory] Error al eliminar:', error)
    console.error('❌ [deleteInventoryCategory] Detalles:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    
    // Manejar error específico de foreign key constraint
    if (error.code === '23503' || error.message.includes('foreign key')) {
      throw new Error('No se puede eliminar la categoría porque tiene productos asociados')
    }
    
    throw new Error(`Error al eliminar la categoría: ${error.message}`)
  }

  console.log('✅ [deleteInventoryCategory] Categoría eliminada exitosamente')
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