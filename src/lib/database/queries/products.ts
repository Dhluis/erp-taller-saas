import { createClient } from '@/lib/supabase/server'
import { Product, ProductInsert, ProductUpdate } from '@/types/supabase-simple'
import { executeWithErrorHandling } from '@/lib/core/errors'

const PRODUCT_SELECT_STATEMENT = `
  *,
  inventory_categories (
    id,
    name,
    description
  )
`

/**
 * Obtener todos los productos con filtros opcionales
 */
export async function getAllProducts(
  organizationId: string,
  filters?: {
    type?: 'product' | 'service'
    category?: string
    is_active?: boolean
    low_stock?: boolean
  }
): Promise<Product[]> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT_STATEMENT)
      .eq('organization_id', organizationId)

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    if (filters?.low_stock) {
      query = query.lte('stock_quantity', 'min_stock')
    }

    const { data, error } = await query.order('name', { ascending: true })
    if (error) throw error
    return data || []
  }, { operation: 'getAllProducts', table: 'products' })
}

/**
 * Obtener un producto específico por ID
 */
export async function getProductById(id: string, organizationId: string): Promise<Product | null> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_STATEMENT)
      .eq('id', id)
      .eq('organization_id', organizationId) // ✅ Validar organización
      .single()
    if (error) throw error
    return data
  }, { operation: 'getProductById', table: 'products' })
}

/**
 * Obtener solo productos (type='product')
 */
export async function getProducts(organizationId: string): Promise<Product[]> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_STATEMENT)
      .eq('organization_id', organizationId)
      .eq('type', 'product')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw error
    return data || []
  }, { operation: 'getProducts', table: 'products' })
}

/**
 * Obtener solo servicios (type='service')
 */
export async function getServices(organizationId: string): Promise<Product[]> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_STATEMENT)
      .eq('organization_id', organizationId)
      .eq('type', 'service')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw error
    return data || []
  }, { operation: 'getServices', table: 'products' })
}

/**
 * Obtener productos con stock bajo
 */
export async function getLowStockProducts(organizationId: string): Promise<Product[]> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_STATEMENT)
      .eq('organization_id', organizationId)
      .eq('type', 'product')
      .eq('is_active', true)
      .lte('stock_quantity', 'min_stock')
      .order('stock_quantity', { ascending: true })
    if (error) throw error
    return data || []
  }, { operation: 'getLowStockProducts', table: 'products' })
}

/**
 * Buscar productos por query
 */
export async function searchProducts(
  organizationId: string,
  query: string,
  type?: 'product' | 'service'
): Promise<Product[]> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    let dbQuery = supabase
      .from('products')
      .select(PRODUCT_SELECT_STATEMENT)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,code.ilike.%${query}%,description.ilike.%${query}%`)

    if (type) {
      dbQuery = dbQuery.eq('type', type)
    }

    const { data, error } = await dbQuery.order('name', { ascending: true })
    if (error) throw error
    return data || []
  }, { operation: 'searchProducts', table: 'products' })
}

/**
 * Crear un nuevo producto
 */
export async function createProduct(data: ProductInsert): Promise<Product> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(data)
      .select(PRODUCT_SELECT_STATEMENT)
      .single()
    if (error) throw error
    return newProduct
  }, { operation: 'createProduct', table: 'products' })
}

/**
 * Actualizar un producto
 */
export async function updateProduct(id: string, data: ProductUpdate): Promise<Product> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PRODUCT_SELECT_STATEMENT)
      .single()
    if (error) throw error
    return updatedProduct
  }, { operation: 'updateProduct', table: 'products' })
}

/**
 * Eliminar un producto (soft delete - marcar como inactivo)
 */
export async function deleteProduct(id: string): Promise<void> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { error } = await supabase
      .from('products')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    if (error) throw error
  }, { operation: 'deleteProduct', table: 'products' })
}

/**
 * Actualizar stock de un producto
 */
export async function updateStock(
  id: string,
  quantity: number,
  movementType: 'entrada' | 'salida' | 'ajuste',
  reference?: string
): Promise<Product> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener el producto actual
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', id)
      .single()

    if (fetchError || !currentProduct) {
      throw new Error('Producto no encontrado')
    }

    // 2. Calcular nuevo stock
    let newStock = currentProduct.stock_quantity
    switch (movementType) {
      case 'entrada':
        newStock += quantity
        break
      case 'salida':
        newStock -= quantity
        if (newStock < 0) {
          throw new Error('Stock insuficiente')
        }
        break
      case 'ajuste':
        newStock = quantity
        break
    }

    // 3. Actualizar el stock
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(PRODUCT_SELECT_STATEMENT)
      .single()

    if (updateError) throw updateError

    // 4. Registrar el movimiento en inventory_movements
    try {
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: id,
          type: movementType,
          quantity: Math.abs(quantity),
          movement_date: new Date().toISOString().split('T')[0],
          notes: reference || `Actualización de stock - ${movementType}`,
          organization_id: updatedProduct.organization_id
        })
    } catch (movementError) {
      console.error('Error registrando movimiento de inventario:', movementError)
      // No fallar la operación principal, solo loggear el error
    }

    return updatedProduct
  }, { operation: 'updateStock', table: 'products' })
}

/**
 * Obtener estadísticas de productos
 */
export async function getProductStats(organizationId: string): Promise<{
  totalProducts: number
  totalServices: number
  activeProducts: number
  lowStockProducts: number
  productsByCategory: Array<{ category: string; count: number }>
  totalValue: number
}> {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('type, is_active, category, stock_quantity, min_stock, price')
      .eq('organization_id', organizationId)

    if (error) throw error

    const products = data || []
    const totalProducts = products.filter(p => p.type === 'product').length
    const totalServices = products.filter(p => p.type === 'service').length
    const activeProducts = products.filter(p => p.is_active && p.type === 'product').length
    const lowStockProducts = products.filter(p => 
      p.type === 'product' && 
      p.is_active && 
      p.stock_quantity <= p.min_stock
    ).length

    // Agrupar por categoría
    const categoryCounts = products.reduce((acc: any, product: any) => {
      const category = product.category || 'Sin categoría'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    const productsByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count: count as number
    }))

    // Calcular valor total del inventario
    const totalValue = products
      .filter(p => p.type === 'product' && p.is_active)
      .reduce((sum, product) => sum + (product.stock_quantity * product.price), 0)

    return {
      totalProducts,
      totalServices,
      activeProducts,
      lowStockProducts,
      productsByCategory,
      totalValue
    }
  }, { operation: 'getProductStats', table: 'products' })
}


