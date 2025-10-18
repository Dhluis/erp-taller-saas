/**
 * Servicio de Categorías de Inventario
 * Funciones para manejar categorías de productos
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { InventoryCategory, InventoryCategoryInsert, InventoryCategoryUpdate } from '@/types/supabase-simple'

// Re-exportar los tipos generados
export type { InventoryCategory, InventoryCategoryInsert, InventoryCategoryUpdate }

export interface CategoryStats {
  totalCategories: number
  activeCategories: number
  inactiveCategories: number
  categoriesWithProducts: number
}

/**
 * Obtener categorías de inventario
 */
export async function getInventoryCategories(filters?: {
  is_active?: boolean
  parent_id?: string
}): Promise<InventoryCategory[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('inventory_categories').select('*')
      
      if (filters) {
        if (filters.is_active !== undefined) {
          // Usar status en lugar de is_active
          const statusValue = filters.is_active ? 'active' : 'inactive'
          query = query.eq('status', statusValue)
        }
        if (filters.parent_id) {
          query = query.eq('parent_id', filters.parent_id)
        }
      }
      
      const { data, error } = await query
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch inventory categories: ${error.message}`)
      }
      
      // Mapear los datos para asegurar compatibilidad
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        is_active: item.status === 'active'
      }))
      
      return mappedData
    },
    {
      operation: 'getInventoryCategories',
      table: 'inventory_categories'
    }
  )
}

/**
 * Obtener estadísticas de categorías
 */
export async function getCategoryStats(): Promise<CategoryStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Usar solo la columna 'status' que sabemos que existe
      const { data, error } = await client
        .from('inventory_categories')
        .select('status')
      
      if (error) {
        throw new Error(`Failed to fetch category stats: ${error.message}`)
      }
      
      const totalCategories = data?.length || 0
      
      // Determinar categorías activas basado en status
      const activeCategories = data?.filter((c: any) => c.status === 'active').length || 0
      const inactiveCategories = data?.filter((c: any) => c.status === 'inactive').length || 0
      
      // Contar categorías con productos
      const { data: productsData } = await client
        .from('products')
        .select('category')
        .not('category', 'is', null)
      
      const categoriesWithProducts = new Set(productsData?.map((p: any) => p.category)).size
      
      return {
        totalCategories,
        activeCategories,
        inactiveCategories,
        categoriesWithProducts
      }
    },
    {
      operation: 'getCategoryStats',
      table: 'inventory_categories'
    }
  )
}

/**
 * Crear categoría
 */
export async function createCategory(category: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryCategory> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('inventory_categories')
        .insert(category)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create category: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createCategory',
      table: 'inventory_categories'
    }
  )
}

/**
 * Actualizar categoría
 */
export async function updateCategory(id: string, category: Partial<InventoryCategory>): Promise<InventoryCategory> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('inventory_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update category: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateCategory',
      table: 'inventory_categories'
    }
  )
}

/**
 * Crear categoría de inventario (alias para createCategory)
 */
export async function createInventoryCategory(category: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryCategory> {
  return createCategory(category)
}

/**
 * Actualizar categoría de inventario (alias para updateCategory)
 */
export async function updateInventoryCategory(id: string, category: Partial<InventoryCategory>): Promise<InventoryCategory> {
  return updateCategory(id, category)
}

/**
 * Eliminar categoría de inventario
 */
export async function deleteInventoryCategory(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('inventory_categories')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete inventory category: ${error.message}`)
      }
    },
    {
      operation: 'deleteInventoryCategory',
      table: 'inventory_categories'
    }
  )
}
