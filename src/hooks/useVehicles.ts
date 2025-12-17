/**
 * useVehicles Hook con Paginación
 * Eagles ERP - Hook para gestión de vehículos con paginación
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useOrganization } from '@/lib/context/SessionContext';
import type { PaginatedResponse, SearchParams } from '@/types/pagination';
import { buildPaginationQueryString } from '@/lib/utils/pagination';
import type { Vehicle, CreateVehicleData, UpdateVehicleData } from '@/lib/database/queries/vehicles';

// ==========================================
// HOOK OPTIONS
// ==========================================

interface UseVehiclesOptions extends Partial<SearchParams> {
  autoLoad?: boolean;
  enableCache?: boolean;
}

interface UseVehiclesReturn {
  // Data
  vehicles: Vehicle[];
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
  createVehicle: (data: CreateVehicleData) => Promise<Vehicle | null>;
  updateVehicle: (id: string, data: UpdateVehicleData) => Promise<Vehicle | null>;
  deleteVehicle: (id: string) => Promise<boolean>;
  fetchVehiclesByCustomer: (customerId: string) => Promise<Vehicle[]>;
}

// ==========================================
// HOOK
// ==========================================

export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 20, // 20 para vehicles
    search: initialSearch = '',
    filters: initialFilters = {},
    sortBy: initialSortBy = 'created_at',
    sortOrder: initialSortOrder = 'desc',
    autoLoad = true,
    enableCache = false
  } = options;

  // ==========================================
  // STATE
  // ==========================================
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
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
  
  const fetchVehicles = useCallback(async () => {
    if (!organizationId || !ready) {
      console.log('⏳ [useVehicles] Esperando organizationId...');
      setVehicles([]);
      setLoading(false);
      return;
    }

    if (isFetching.current) {
      console.log('⏸️ [useVehicles] Fetch ya en progreso');
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

      const url = `/api/vehicles?${queryString}`;
      console.log('🔄 [useVehicles] Fetching:', url);

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url);
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        
        if (cached && cacheAge < 30000) {
          console.log('💾 [useVehicles] Usando cache');
          const responseData = cached.data.data || cached.data;
          setVehicles(responseData.items || []);
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
        throw new Error(result.error || 'Error al cargar vehículos');
      }

      // Extraer datos
      const responseData = result.data || result;
      const vehiclesData = responseData.items || [];
      const paginationData = responseData.pagination;

      // Actualizar state
      setVehicles(vehiclesData);
      setPagination(paginationData);

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result,
          timestamp: Date.now()
        });
      }

      console.log('✅ [useVehicles] Vehículos cargados:', {
        items: vehiclesData.length,
        page: paginationData.page,
        total: paginationData.total
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar vehículos', { description: errorMessage });
      console.error('❌ [useVehicles] Error:', err);
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

  const createVehicle = useCallback(async (data: CreateVehicleData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al crear vehículo');
      }

      toast.success('Vehículo creado exitosamente');
      
      if (enableCache) cacheRef.current.clear();
      await fetchVehicles();

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear vehículo', { description: errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchVehicles, enableCache]);

  const updateVehicle = useCallback(async (id: string, data: UpdateVehicleData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar vehículo');
      }

      toast.success('Vehículo actualizado');
      
      if (enableCache) cacheRef.current.clear();
      await fetchVehicles();

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar vehículo', { description: errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchVehicles, enableCache]);

  const deleteVehicle = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar vehículo');
      }

      toast.success('Vehículo eliminado');
      
      if (enableCache) cacheRef.current.clear();
      await fetchVehicles();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar vehículo', { description: errorMessage });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchVehicles, enableCache]);

  // ==========================================
  // SPECIAL QUERIES
  // ==========================================

  const fetchVehiclesByCustomer = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`/api/vehicles?filter_customer_id=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data?.items) {
        return data.data.items;
      }
      return [];
    } catch (err) {
      toast.error('Error al cargar vehículos del cliente');
      return [];
    }
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    if (autoLoad && ready && organizationId) {
      fetchVehicles();
    }
  }, [autoLoad, ready, organizationId, fetchVehicles]);

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Data
    vehicles,
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
    refresh: fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    fetchVehiclesByCustomer,
  };
}
