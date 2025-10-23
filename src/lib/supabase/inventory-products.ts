/**
 * Funciones para manejo de productos de inventario
 */

import { createClient } from './client';
import { Database } from './types';

type InventoryProduct = Database['public']['Tables']['inventory_products']['Row'];
type InventoryProductInsert = Database['public']['Tables']['inventory_products']['Insert'];
type InventoryProductUpdate = Database['public']['Tables']['inventory_products']['Update'];

const supabase = createClient();

/**
 * Obtener todos los productos de inventario
 */
export async function getInventoryProducts() {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select(`
        *,
        category:inventory_categories(name)
      `)
      .order('name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching inventory products:', error);
    return { data: null, error };
  }
}

/**
 * Obtener un producto por ID
 */
export async function getInventoryProductById(id: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select(`
        *,
        category:inventory_categories(name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching inventory product:', error);
    return { data: null, error };
  }
}

/**
 * Crear un nuevo producto
 */
export async function createInventoryProduct(product: InventoryProductInsert) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating inventory product:', error);
    return { data: null, error };
  }
}

/**
 * Actualizar un producto
 */
export async function updateInventoryProduct(id: string, updates: InventoryProductUpdate) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating inventory product:', error);
    return { data: null, error };
  }
}

/**
 * Eliminar un producto
 */
export async function deleteInventoryProduct(id: string) {
  try {
    const { error } = await supabase
      .from('inventory_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting inventory product:', error);
    return { data: null, error };
  }
}

/**
 * Buscar productos por nombre o SKU
 */
export async function searchInventoryProducts(query: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select(`
        *,
        category:inventory_categories(name)
      `)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
      .order('name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching inventory products:', error);
    return { data: null, error };
  }
}

/**
 * Obtener productos con stock bajo
 */
export async function getLowStockProducts(threshold: number = 10) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select(`
        *,
        category:inventory_categories(name)
      `)
      .lte('current_stock', threshold)
      .order('current_stock');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return { data: null, error };
  }
}

/**
 * Actualizar stock de un producto
 */
export async function updateProductStock(id: string, newStock: number) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .update({ current_stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating product stock:', error);
    return { data: null, error };
  }
}

/**
 * Obtener estadísticas de inventario
 */
export async function getInventoryStats() {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('current_stock, min_stock, cost_price, selling_price');

    if (error) throw error;

    const stats = {
      totalProducts: data.length,
      totalStock: data.reduce((sum, product) => sum + (product.current_stock || 0), 0),
      totalValue: data.reduce((sum, product) => sum + ((product.current_stock || 0) * (product.cost_price || 0)), 0),
      lowStockItems: data.filter(product => (product.current_stock || 0) <= (product.min_stock || 0)).length,
      outOfStockItems: data.filter(product => (product.current_stock || 0) === 0).length
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return { data: null, error };
  }
}















