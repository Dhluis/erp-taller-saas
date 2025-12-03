'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';

// Tipos para el inventario
export interface InventoryItem {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  // Campos adicionales de la API
  code?: string;
  barcode?: string;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  unit?: string;
  status?: string;
}

export interface CreateInventoryItemData {
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  quantity: number;
  min_quantity: number;
  unit_price: number;
}

export interface UpdateInventoryItemData extends Partial<CreateInventoryItemData> {}

export interface InventoryCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
  count: number;
}

export interface InventoryItemResponse {
  success: boolean;
  data: InventoryItem;
  message: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export interface UseInventoryReturn {
  items: InventoryItem[];
  categories: InventoryCategory[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  createItem: (itemData: CreateInventoryItemData) => Promise<InventoryItem | null>;
  updateItem: (id: string, itemData: UpdateInventoryItemData) => Promise<InventoryItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
  fetchCategories: () => Promise<void>;
  createCategory: (categoryData: CreateCategoryData) => Promise<InventoryCategory | null>;
  updateCategory: (id: string, categoryData: UpdateCategoryData) => Promise<InventoryCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
}

export function useInventory(): UseInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId, ready } = useOrganization(); // ✅ FIX: Obtener organizationId y ready

  // Cargar items de inventario
  const fetchItems = useCallback(async (): Promise<void> => {
    // ✅ FIX: Solo cargar si organizationId está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useInventory] Esperando a que organizationId esté ready...', { organizationId: !!organizationId, ready });
      setLoading(false);
      setItems([]); // Limpiar items mientras espera
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [useInventory] Cargando items para organizationId:', organizationId);
      
      const result = await safeFetch<InventoryResponse>('/api/inventory', {
        timeout: 30000
      });
      
      if (result.success) {
        console.log('✅ [useInventory] Items cargados:', result.data.data.length);
        setItems(result.data.data);
      } else {
        setError('Error al cargar inventario');
        toast.error('Error al cargar inventario');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Error al cargar inventario');
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  }, [organizationId, ready]);

  // Cargar categorías de inventario
  const fetchCategories = useCallback(async (): Promise<void> => {
    // ✅ FIX: Solo cargar si organizationId está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useInventory] Esperando a que organizationId esté ready para categorías...', { organizationId: !!organizationId, ready });
      setCategories([]); // Limpiar categorías mientras espera
      return;
    }

    try {
      console.log('🔄 [useInventory] fetchCategories - Iniciando para organizationId:', organizationId);
      
      const result = await safeFetch<{ success: boolean; data: InventoryCategory[] }>('/api/inventory/categories', {
        timeout: 30000, // 30 segundos para categorías
        retries: 1,     // Solo 1 reintento para evitar rate limits
        retryDelay: 3000 // 3 segundos entre reintentos
      });
      
      if (result.success) {
        console.log('✅ [useInventory] fetchCategories - Exitoso:', result.data.data.length, 'categorías');
        setCategories(result.data.data);
        setError(null); // Limpiar errores previos
      } else {
        console.error('❌ [useInventory] fetchCategories - Error:', result.error);
        setError('Error al cargar categorías: ' + result.error);
        // No mostrar toast para evitar spam
      }
    } catch (error) {
      console.error('❌ [useInventory] fetchCategories - Excepción:', error);
      setError('Error al cargar categorías');
      // No mostrar toast para evitar spam
    }
  }, [organizationId, ready]);

  // Crear nuevo item
  const createItem = async (itemData: CreateInventoryItemData): Promise<InventoryItem | null> => {
    try {
      setError(null);
      
      const result = await safePost<InventoryItemResponse>('/api/inventory', itemData, {
        timeout: 30000
      });
      
      if (result.success) {
        const newItem = result.data.data;
        setItems(prev => [newItem, ...prev]);
        toast.success('Producto creado exitosamente');
        return newItem;
      } else {
        setError('Error al crear producto');
        toast.error('Error al crear producto');
        return null;
      }
    } catch (error) {
      console.error('Error creating inventory item:', error);
      setError('Error al crear producto');
      toast.error('Error al crear producto');
      return null;
    }
  };

  // Actualizar item
  const updateItem = async (id: string, itemData: UpdateInventoryItemData): Promise<InventoryItem | null> => {
    try {
      setError(null);
      
      const result = await safePut<InventoryItemResponse>(`/api/inventory/${id}`, itemData, {
        timeout: 30000
      });
      
      if (result.success) {
        const updatedItem = result.data.data;
        setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
        toast.success('Producto actualizado exitosamente');
        return updatedItem;
      } else {
        setError('Error al actualizar producto');
        toast.error('Error al actualizar producto');
        return null;
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      setError('Error al actualizar producto');
      toast.error('Error al actualizar producto');
      return null;
    }
  };

  // Eliminar item
  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const result = await safeDelete(`/api/inventory/${id}`, {
        timeout: 30000
      });
      
      if (result.success) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Producto eliminado exitosamente');
        return true;
      } else {
        setError('Error al eliminar producto');
        toast.error('Error al eliminar producto');
        return false;
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      setError('Error al eliminar producto');
      toast.error('Error al eliminar producto');
      return false;
    }
  };

  // Crear nueva categoría
  const createCategory = async (categoryData: CreateCategoryData): Promise<InventoryCategory | null> => {
    try {
      setError(null);
      
      const result = await safePost<{ success: boolean; data: InventoryCategory }>('/api/inventory/categories', categoryData, {
        timeout: 30000
      });
      
      if (result.success) {
        const newCategory = result.data.data;
        setCategories(prev => [newCategory, ...prev]);
        toast.success('Categoría creada exitosamente');
        return newCategory;
      } else {
        setError('Error al crear categoría');
        toast.error('Error al crear categoría');
        return null;
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Error al crear categoría');
      toast.error('Error al crear categoría');
      return null;
    }
  };

  // Actualizar categoría
  const updateCategory = async (id: string, categoryData: UpdateCategoryData): Promise<InventoryCategory | null> => {
    try {
      setError(null);
      
      const result = await safePut<{ success: boolean; data: InventoryCategory }>(`/api/inventory/categories/${id}`, categoryData, {
        timeout: 30000
      });
      
      if (result.success) {
        const updatedCategory = result.data.data;
        setCategories(prev => prev.map(category => category.id === id ? updatedCategory : category));
        toast.success('Categoría actualizada exitosamente');
        return updatedCategory;
      } else {
        setError('Error al actualizar categoría');
        toast.error('Error al actualizar categoría');
        return null;
      }
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Error al actualizar categoría');
      toast.error('Error al actualizar categoría');
      return null;
    }
  };

  // Eliminar categoría
  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const result = await safeDelete(`/api/inventory/categories/${id}`, {
        timeout: 30000
      });
      
      if (result.success) {
        setCategories(prev => prev.filter(category => category.id !== id));
        toast.success('Categoría eliminada exitosamente');
        return true;
      } else {
        setError('Error al eliminar categoría');
        toast.error('Error al eliminar categoría');
        return false;
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Error al eliminar categoría');
      toast.error('Error al eliminar categoría');
      return false;
    }
  };

  // ✅ FIX: Solo cargar cuando organizationId esté ready
  useEffect(() => {
    if (ready && organizationId) {
      console.log('🔄 [useInventory] useEffect triggered - organizationId ready:', organizationId);
      // Limpiar datos anteriores antes de cargar nuevos
      setItems([]);
      setCategories([]);
      fetchItems();
      fetchCategories();
    } else {
      console.log('⏳ [useInventory] Esperando a que organizationId esté ready...', { ready, organizationId: !!organizationId });
      // Limpiar datos si organizationId cambia
      setItems([]);
      setCategories([]);
    }
  }, [ready, organizationId, fetchItems, fetchCategories]);

  return {
    items,
    categories,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}