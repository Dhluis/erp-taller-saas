import { createClient } from '@/lib/supabase/client'

export interface InventoryProduct {
  id: string
  name: string
  description?: string
  category_id: string
  category_name?: string
  sku: string
  barcode?: string
  unit_price: number
  current_stock: number
  min_stock: number
  max_stock: number
  unit: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ProductStats {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  totalValue: number
  outOfStockProducts: number
}

export async function getInventoryProducts(): Promise<InventoryProduct[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        id,
        name,
        description,
        category_id,
        sku,
        barcode,
        unit_price,
        current_stock,
        min_stock,
        max_stock,
        unit,
        status,
        created_at,
        updated_at
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching inventory products:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No inventory products found in database')
      return []
    }

    return data.map(product => ({
      id: product.id,
      name: product.name || 'Producto sin nombre',
      description: product.description || undefined,
      category_id: product.category_id || 'default',
      category_name: 'Sin categoría', // Simplificado sin JOIN
      sku: product.sku || 'N/A',
      barcode: product.barcode || undefined,
      unit_price: Number(product.unit_price) || 0,
      current_stock: Number(product.current_stock) || 0,
      min_stock: Number(product.min_stock) || 0,
      max_stock: Number(product.max_stock) || 0,
      unit: product.unit || 'pcs',
      status: product.status || 'active',
      created_at: product.created_at || new Date().toISOString(),
      updated_at: product.updated_at || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Unexpected error fetching inventory products:', error)
    return []
  }
}

export async function createInventoryProduct(productData: Partial<InventoryProduct>): Promise<InventoryProduct | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert([{
        name: productData.name,
        description: productData.description,
        category_id: productData.category_id,
        sku: productData.sku,
        barcode: productData.barcode,
        unit_price: productData.unit_price,
        current_stock: productData.current_stock || 0,
        min_stock: productData.min_stock,
        max_stock: productData.max_stock,
        unit: productData.unit,
        status: 'active'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating inventory product:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating inventory product:', error)
    return null
  }
}

export async function updateInventoryProduct(id: string, productData: Partial<InventoryProduct>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('inventory')
      .update({
        ...productData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating inventory product:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating inventory product:', error)
    return false
  }
}

export async function deleteInventoryProduct(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting inventory product:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting inventory product:', error)
    return false
  }
}

export async function getProductStats(): Promise<ProductStats> {
  const supabase = createClient()
  
  try {
    const { data: products, error } = await supabase
      .from('inventory')
      .select('status, current_stock, min_stock, unit_price')

    if (error) {
      console.error('Error fetching product stats:', error)
      return {
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        totalValue: 0,
        outOfStockProducts: 0
      }
    }

    const totalProducts = products?.length || 0
    const activeProducts = products?.filter(p => p.status === 'active').length || 0
    const lowStockProducts = products?.filter(p => p.current_stock <= p.min_stock).length || 0
    const outOfStockProducts = products?.filter(p => p.current_stock === 0).length || 0
    const totalValue = products?.reduce((sum, product) => sum + (product.current_stock * product.unit_price), 0) || 0

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalValue,
      outOfStockProducts
    }
  } catch (error) {
    console.error('Error fetching product stats:', error)
    return {
      totalProducts: 0,
      activeProducts: 0,
      lowStockProducts: 0,
      totalValue: 0,
      outOfStockProducts: 0
    }
  }
}
