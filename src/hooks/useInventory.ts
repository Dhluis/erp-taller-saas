/**
 * useInventory Hook con Paginación
 * Eagles ERP - Hook para gestión de inventario con paginación
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useOrganization } from '@/lib/context/SessionContext';
import type { PaginatedResponse, SearchParams } from '@/types/pagination';
import { buildPaginationQueryString } from '@/lib/utils/pagination';
import { safeFetch, safePost } from '@/lib/api/fetch-utils';

// ==========================================
// TYPES
// ==========================================

export interface InventoryItem {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  quantity: number;
  min_quantity: number;
  minimum_stock?: number;
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

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

// ==========================================
// HOOK OPTIONS
// ==========================================

interface UseInventoryOptions extends Partial<SearchParams> {
  autoLoad?: boolean;
  enableCache?: boolean;
}

interface UseInventoryReturn {
  // Data
  items: InventoryItem[];
  categories: InventoryCategory[];
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  
  // Navigation Actions
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  changePageSize: (size: number) => void;
  
  // Filter Actions
  setSearch: (search: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  clearFilters: () => void;
  
  // CRUD Actions
  refresh: () => Promise<void>;
  createItem: (itemData: CreateInventoryItemData) => Promise<InventoryItem | null>;
  updateItem: (id: string, itemData: UpdateInventoryItemData) => Promise<InventoryItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
  
  // Categories
  fetchCategories: () => Promise<void>;
  createCategory: (categoryData: CreateCategoryData) => Promise<InventoryCategory | null>;
  updateCategory: (id: string, categoryData: UpdateCategoryData) => Promise<InventoryCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
}

// ==========================================
// HOOK
// ==========================================

export function useInventory(options: UseInventoryOptions = {}): UseInventoryReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 50, // 50 para inventory
    search: initialSearch = '',
    filters: initialFilters = {},
    sortBy: initialSortBy = 'name',
    sortOrder: initialSortOrder = 'asc',
    autoLoad = true,
    enableCache = false
  } = options;

  // ==========================================
  // STATE
  // ==========================================
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  
  // Filter state
  const [search, setSearchState] = useState(initialSearch);
  const [filters, setFiltersState] = useState(initialFilters);
  const [sortBy, setSortByState] = useState(initialSortBy);
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>(initialSortOrder);
  
  // Context
  const { organizationId, ready } = useOrganization();
  
  // Refs
  const isFetching = useRef(false);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  // ==========================================
  // FETCH FUNCTION CON PAGINACIÓN
  // ==========================================
  
  const fetchItems = useCallback(async () => {
    if (!organizationId || !ready) {
      console.log('⏳ [useInventory] Esperando organizationId...');
      setItems([]);
      setLoading(false);
      return;
    }

    if (isFetching.current) {
      console.log('⏸️ [useInventory] Fetch ya en progreso');
      return;
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      // Construir query params con paginación
      const queryString = buildPaginationQueryString({
        page,
        pageSize,
        sortBy,
        sortOrder,
        search: search || undefined,
        filters
      });

      const url = `/api/inventory?${queryString}`;
      console.log('🔄 [useInventory] Fetching:', url);

      // Check cache - REDUCIDO a 5 segundos para evitar datos obsoletos
      if (enableCache) {
        const cached = cacheRef.current.get(url);
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        
        if (cached && cacheAge < 5000) { // ✅ 5 segundos en lugar de 30
          console.log('💾 [useInventory] Usando cache (edad:', cacheAge, 'ms)');
          const responseData = cached.data.data || cached.data;
          setItems(responseData.items || []);
          setPagination(responseData.pagination);
          setLoading(false);
          isFetching.current = false;
          return;
        }
      }

      // Fetch
      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al cargar inventario');
      }

      // Extraer datos
      const responseData = result.data || result;
      const itemsData = responseData.items || [];
      const paginationData = responseData.pagination;

      // Actualizar state
      setItems(itemsData);
      setPagination(paginationData);

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result,
          timestamp: Date.now()
        });
      }

      console.log('✅ [useInventory] Items cargados:', {
        items: itemsData.length,
        page: paginationData.page,
        total: paginationData.total
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar inventario', { description: errorMessage });
      console.error('❌ [useInventory] Error:', err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [organizationId, ready, page, pageSize, search, filters, sortBy, sortOrder, enableCache]);

  // ==========================================
  // NAVIGATION ACTIONS
  // ==========================================

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== page) {
      setPage(newPage);
    }
  }, [pagination.totalPages, page]);

  const goToNextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setPage(p => p + 1);
    }
  }, [pagination.hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      setPage(p => Math.max(1, p - 1));
    }
  }, [pagination.hasPreviousPage]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setPage(pagination.totalPages);
  }, [pagination.totalPages]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    if (enableCache) cacheRef.current.clear();
  }, [enableCache]);

  // ==========================================
  // FILTER ACTIONS
  // ==========================================

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch);
    setPage(1);
    if (enableCache) cacheRef.current.clear();
  }, [enableCache]);

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters);
    setPage(1);
    if (enableCache) cacheRef.current.clear();
  }, [enableCache]);

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortByState(newSortBy);
    setSortOrderState(newSortOrder);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setFiltersState({});
    setPage(1);
    if (enableCache) cacheRef.current.clear();
  }, [enableCache]);

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  const createItem = useCallback(async (itemData: CreateInventoryItemData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 [useInventory] createItem - Enviando POST:', itemData);
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ Incluir cookies para autenticación
        body: JSON.stringify(itemData),
      });

      console.log('📡 [useInventory] createItem - Response status:', response.status);

      const data = await response.json();
      
      console.log('📦 [useInventory] createItem - Response data:', data);

      if (!data.success) {
        console.error('❌ [useInventory] createItem - Error en respuesta:', data.error);
        throw new Error(data.error || 'Error al crear producto');
      }

      console.log('✅ [useInventory] createItem - Producto creado:', data.data?.id);
      toast.success('Producto creado exitosamente');
      
      // ✅ SIEMPRE limpiar cache después de crear
      cacheRef.current.clear();
      console.log('🗑️ [useInventory] createItem - Cache limpiado');
      
      // ✅ Pequeño delay para asegurar que la DB se sincronice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔄 [useInventory] createItem - Recargando lista...');
      await fetchItems();
      console.log('✅ [useInventory] createItem - Lista recargada, items:', items.length);

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear producto', { description: errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchItems, enableCache]);

  const updateItem = useCallback(async (id: string, itemData: UpdateInventoryItemData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar producto');
      }

      toast.success('Producto actualizado');
      
      if (enableCache) cacheRef.current.clear();
      await fetchItems();

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar producto', { description: errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchItems, enableCache]);

  const deleteItem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        credentials: 'include', // ✅ Incluir cookies para autenticación
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al eliminar producto');
      }

      toast.success('Producto eliminado exitosamente');
      
      if (enableCache) cacheRef.current.clear();
      await fetchItems();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar producto', { description: errorMessage });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchItems, enableCache]);

  // ==========================================
  // CATEGORIES
  // ==========================================

  /**
   * Obtiene la lista de categorías existentes (GET)
   * Se usa para poblar el dropdown al crear/editar productos
   */
  const fetchCategories = useCallback(async (): Promise<void> => {
    if (!organizationId || !ready) {
      console.log('⏳ [useInventory] fetchCategories - Esperando organizationId...');
      setCategories([]);
      return;
    }

    try {
      console.log('🔄 [useInventory] fetchCategories - GET para org:', organizationId);
      
      // ✅ GET directo sin wrapper
      const response = await fetch('/api/inventory/categories', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });

      const result = await response.json();
      console.log('📦 [useInventory] fetchCategories - Respuesta completa:', result);
      
      // ✅ Extraer el array correctamente
      // La API devuelve: { success: true, data: [...] }
      // Pero a veces viene anidado: { success: true, data: { success: true, data: [...] } }
      let categoriesArray: any[] = [];
      
      if (result.success) {
        if (Array.isArray(result.data)) {
          categoriesArray = result.data;
        } else if (result.data?.data && Array.isArray(result.data.data)) {
          // Caso anidado
          categoriesArray = result.data.data;
        }
      }
      
      console.log('📊 [useInventory] fetchCategories - Array extraído:', categoriesArray.length, 'categorías');
      console.log('📋 [useInventory] fetchCategories - IDs:', categoriesArray.map((c: any) => ({ id: c.id, name: c.name })));
      
      // ✅ Crear nuevo array para que React detecte el cambio
      setCategories([...categoriesArray]);
      console.log('✅ [useInventory] fetchCategories -', categoriesArray.length, 'categorías guardadas en state');
      setError(null);
    } catch (error: any) {
      console.error('❌ [useInventory] fetchCategories - Error:', error);
      setCategories([]);
    }
  }, [organizationId, ready]);

  /**
   * Crea una nueva categoría (POST)
   * Se usa cuando el usuario agrega una categoría nueva desde el formulario
   */
  const createCategory = useCallback(async (categoryData: CreateCategoryData) => {
    if (!organizationId) {
      toast.error('No se pudo obtener la organización');
      return null;
    }

    setLoading(true);
    try {
      console.log('🔄 [useInventory] createCategory - Creando:', categoryData.name);
      
      const response = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...categoryData,
          organization_id: organizationId
        })
      });

      const result = await response.json();
      console.log('📦 [useInventory] createCategory - Respuesta:', result);
      
      if (result.success && result.data) {
        toast.success(`Categoría "${categoryData.name}" creada`);
        console.log('✅ [useInventory] createCategory - Creada, recargando lista...');
        
        // ✅ Recargar y ESPERAR
        await fetchCategories();
        
        // ✅ Delay para asegurar actualización de estado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ [useInventory] createCategory - Lista actualizada');
        return result.data;
      } else {
        throw new Error(result.error || 'Error al crear');
      }
    } catch (error: any) {
      console.error('❌ [useInventory] createCategory - Error:', error);
      toast.error(error.message || 'Error al crear categoría');
      // Recargar de todas formas
      await fetchCategories();
      return null;
    } finally {
      setLoading(false);
    }
  }, [organizationId, fetchCategories]);

  const updateCategory = useCallback(async (id: string, categoryData: UpdateCategoryData) => {
    try {
      const response = await fetch(`/api/inventory/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar categoría');
      }

      toast.success('Categoría actualizada');
      await fetchCategories();

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar categoría', { description: errorMessage });
      return null;
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    setLoading(true);
    try {
      console.log('🔄 [useInventory] deleteCategory - Eliminando:', id);
      
      const response = await fetch(`/api/inventory/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Si es 404, la categoría ya no existe - solo recargar
        if (response.status === 404) {
          console.log('ℹ️ [useInventory] Categoría ya no existe, recargando...');
          await fetchCategories();
          return true;
        }
        throw new Error(data.error || `Error ${response.status}`);
      }

      console.log('✅ [useInventory] deleteCategory - Eliminada, recargando lista...');
      
      // ✅ Recargar y ESPERAR a que termine
      await fetchCategories();
      
      // ✅ Pequeño delay para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ [useInventory] deleteCategory - Lista actualizada');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [useInventory] deleteCategory - Error:', errorMessage);
      // Recargar de todas formas
      await fetchCategories();
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    if (autoLoad && ready && organizationId) {
      fetchItems();
      fetchCategories();
    }
  }, [autoLoad, ready, organizationId, fetchItems, fetchCategories]);

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Data
    items,
    categories,
    loading,
    error,
    
    // Pagination
    pagination,
    
    // Navigation
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    
    // Filters
    setSearch,
    setFilters,
    setSorting,
    clearFilters,
    
    // CRUD
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    
    // Categories
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
