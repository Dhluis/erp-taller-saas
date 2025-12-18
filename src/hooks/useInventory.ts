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

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url);
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        
        if (cached && cacheAge < 30000) {
          console.log('💾 [useInventory] Usando cache');
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
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al crear producto');
      }

      toast.success('Producto creado exitosamente');
      
      if (enableCache) cacheRef.current.clear();
      await fetchItems();

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
      console.log('🔄 [useInventory] fetchCategories - Iniciando (GET) para organizationId:', organizationId);
      
      // ✅ GET para LEER categorías existentes
      const result = await safeFetch<{ success: boolean; data: any[] }>(
        `/api/inventory/categories`
      );
      
      console.log('🔍 [useInventory] fetchCategories - Respuesta completa:', {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        dataValue: result.data
      });
      
      if (result.success && result.data) {
        // La API devuelve { success: true, data: [...] }
        // safeFetch parsea esto, entonces result.data es el objeto completo
        // Necesitamos acceder a result.data.data si está anidado, o result.data si es directo
        const responseData = (result.data as any)?.data || result.data;
        const categoriesList = Array.isArray(responseData) ? responseData : [];
        
        console.log('📊 [useInventory] fetchCategories - Categorías extraídas:', {
          count: categoriesList.length,
          firstCategory: categoriesList[0] ? {
            id: categoriesList[0].id,
            name: categoriesList[0].name,
            organization_id: categoriesList[0].organization_id
          } : null
        });
        
        setCategories(categoriesList);
        console.log('✅ [useInventory] fetchCategories - Exitoso:', categoriesList.length, 'categorías');
        setError(null);
      } else {
        console.error('❌ [useInventory] fetchCategories - Error:', result.error);
        setCategories([]);
        setError(null);
      }
    } catch (error: any) {
      console.error('❌ [useInventory] fetchCategories - Excepción:', error);
      setCategories([]);
      setError(null);
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

    try {
      console.log('🔄 [useInventory] createCategory - Creando categoría:', categoryData.name);
      
      // ✅ POST para CREAR nueva categoría
      const result = await safePost<any>('/api/inventory/categories', {
        ...categoryData,
        organization_id: organizationId
      });
      
      if (result.success && result.data) {
        toast.success(`Categoría "${categoryData.name}" creada exitosamente`);
        console.log('✅ [useInventory] createCategory - Exitoso:', result.data);
        
        // Recargar lista de categorías
        await fetchCategories();
        
        return result.data;
      } else {
        throw new Error(result.error || 'Error al crear categoría');
      }
    } catch (error: any) {
      console.error('❌ [useInventory] createCategory - Error:', error);
      toast.error('Error al crear categoría');
      return null;
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
    try {
      console.log('🔄 [useInventory] deleteCategory - Eliminando categoría:', id);
      
      const response = await fetch(`/api/inventory/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include', // ✅ FIX: Incluir cookies para autenticación
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
        throw new Error(data.error || 'Error al eliminar categoría');
      }

      // ✅ No mostrar toast aquí - la página lo maneja
      await fetchCategories();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [useInventory] deleteCategory - Error:', errorMessage);
      setError(errorMessage);
      // ✅ No mostrar toast de error aquí - la página lo maneja
      throw err; // Re-lanzar para que la página pueda manejarlo
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
