/**
 * Servicios para productos
 */

import { getSupabaseClient } from './client'
import type { SupabaseClient } from './client'
import { Product, ProductInsert, ProductUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Product

export interface CreateProduct {
  name: string
  description?: string
  sku: string
  category_id?: string
  brand?: string
  unit_price: number
  cost_price?: number
  stock_quantity?: number
  min_stock: number
  max_stock?: number
  unit?: string
  weight?: number
  dimensions?: string
  barcode?: string
  is_active?: boolean
  created_by?: string
}

export interface UpdateProduct extends Partial<CreateProduct> {
  id: string
  updated_by?: string
}

export interface ProductFilters {
  category_id?: string
  brand?: string
  is_active?: boolean
  min_price?: number
  max_price?: number
  low_stock?: boolean
  search?: string
}

/**
 * Obtener productos con filtros
 */
export async function getProducts(filters: ProductFilters = {}) {
  const client = getSupabaseClient()
  let query = client.from('products').select('*')

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters.brand) {
    query = query.eq('brand', filters.brand)
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  if (filters.min_price) {
    query = query.gte('unit_price', filters.min_price)
  }
  if (filters.max_price) {
    query = query.lte('unit_price', filters.max_price)
  }
  if (filters.low_stock) {
    query = query.lte('stock_quantity', query.select('min_stock'))
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('name')
  
  if (error) {
    console.error('Error fetching products:', error)
    throw error
  }
  
  return data as Product[]
}

/**
 * Obtener producto por ID
 */
export async function getProduct(id: string): Promise<Product | null> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    throw error
  }
  
  return data as Product
}

/**
 * Crear producto
 */
export async function createProduct(product: CreateProduct): Promise<Product> {
  const client = getSupabaseClient()
  
  const productData = {
    organization_id: '00000000-0000-0000-0000-000000000000',
    name: product.name,
    description: product.description,
    sku: product.sku,
    category_id: product.category_id,
    brand: product.brand,
    unit_price: product.unit_price,
    cost_price: product.cost_price,
    stock_quantity: product.stock_quantity || 0,
    min_stock: product.min_stock,
    max_stock: product.max_stock,
    unit: product.unit,
    weight: product.weight,
    dimensions: product.dimensions,
    barcode: product.barcode,
    is_active: product.is_active !== false,
    created_by: product.created_by
  }

  const { data, error } = await client
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) {
    console.error('Error creating product:', error)
    throw error
  }
  
  return data as Product
}

/**
 * Actualizar producto
 */
export async function updateProduct(product: UpdateProduct): Promise<Product> {
  const client = getSupabaseClient()
  
  const { id, updated_by, ...updateData } = product
  
  const { data, error } = await client
    .from('products')
    .update({
      ...updateData,
      updated_by,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating product:', error)
    throw error
  }
  
  return data as Product
}

/**
 * Eliminar producto
 */
export async function deleteProduct(id: string): Promise<void> {
  const client = getSupabaseClient()
  
  const { error } = await client
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

/**
 * Actualizar stock de producto
 */
export async function updateProductStock(id: string, newStock: number): Promise<Product> {
  const client = getSupabaseClient()
  
  const { data, error } = await client
    .from('products')
    .update({
      stock_quantity: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating product stock:', error)
    throw error
  }
  
  return data as Product
}

/**
 * Obtener métricas de productos
 */
export async function getProductMetrics() {
  const client = getSupabaseClient()
  
  const { data, error } = await client
    .from('products')
    .select('*')

  if (error) {
    console.error('Error fetching products for metrics:', error)
    throw error
  }

  const products = data as Product[]
  
  const activeProducts = products.filter((p: Product) => p.is_active).length
  const lowStockProducts = products.filter((p: Product) => p.stock_quantity <= p.min_stock).length
  
  const totalValue = products.reduce((sum: number, p: Product) => sum + (p.stock_quantity * (p.cost_price || 0)), 0)
  
  return {
    totalProducts: products.length,
    activeProducts,
    lowStockProducts,
    totalValue
  }
}
