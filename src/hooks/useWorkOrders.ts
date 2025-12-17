/**
 * useWorkOrders Hook con Paginación
 * Eagles ERP - Hook para gestión de órdenes de trabajo con paginación completa
 */

'use client'

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/context/SessionContext';
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api';
import type { PaginatedResponse, SearchParams } from '@/types/pagination';
import { buildPaginationQueryString } from '@/lib/utils/pagination';

// ==========================================
// TYPES
// ==========================================

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  status: 'reception' | 'diagnosis' | 'initial_quote' | 'waiting_approval' | 'disassembly' | 'waiting_parts' | 'assembly' | 'testing' | 'ready' | 'completed' | 'cancelled';
  description: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  entry_date: string;
  estimated_completion: string | null;
  completed_at: string | null;
  notes: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    license_plate: string | null;
  };
  items?: WorkOrderItem[];
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  color: string | null;
  mileage: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderStats {
  total: number;
  pending: number;
  in_progress: number;
  diagnosed: number;
  approved: number;
  in_repair: number;
  waiting_parts: number;
  completed: number;
  delivered: number;
  total_revenue: number;
  average_order_value: number;
}

export interface CreateWorkOrderData {
  customer_id: string;
  vehicle_id: string;
  description: string;
  diagnosis?: string;
  assigned_to?: string;
  estimated_completion?: string;
}

export interface UpdateWorkOrderData {
  customer_id?: string;
  vehicle_id?: string;
  description?: string;
  diagnosis?: string;
  assigned_to?: string;
  estimated_completion?: string;
}

export interface CreateOrderItemData {
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface UpdateOrderItemData {
  item_type?: 'service' | 'part';
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
}

interface UseWorkOrdersOptions extends Partial<SearchParams> {
  autoLoad?: boolean;
  enableCache?: boolean;
  status?: string; // Filtro por estado
}

interface UseWorkOrdersReturn {
  // Estado
  workOrders: WorkOrder[] | null;
  customers: Customer[];
  vehicles: Vehicle[];
  currentWorkOrder: WorkOrder | null;
  stats: WorkOrderStats | null;
  loading: boolean;
  error: string | null;

  // Paginación
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

  // Operaciones de órdenes
  fetchWorkOrders: (status?: string) => Promise<WorkOrder[]>;
  searchWorkOrders: (searchTerm: string) => Promise<WorkOrder[]>;
  fetchStats: () => Promise<WorkOrderStats | null>;
  fetchWorkOrderById: (id: string) => Promise<WorkOrder | null>;
  createWorkOrder: (orderData: CreateWorkOrderData) => Promise<WorkOrder | null>;
  updateWorkOrder: (id: string, orderData: UpdateWorkOrderData) => Promise<WorkOrder | null>;
  deleteWorkOrder: (id: string) => Promise<boolean>;
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => Promise<WorkOrder | null>;
  updateDiscount: (id: string, discount: number) => Promise<WorkOrder | null>;

  // Operaciones de items
  fetchOrderItems: (workOrderId: string) => Promise<WorkOrderItem[]>;
  addOrderItem: (workOrderId: string, itemData: CreateOrderItemData) => Promise<WorkOrderItem | null>;
  updateOrderItem: (workOrderId: string, itemId: string, itemData: UpdateOrderItemData) => Promise<WorkOrderItem | null>;
  deleteOrderItem: (workOrderId: string, itemId: string) => Promise<boolean>;

  // Consultas especiales
  fetchWorkOrdersByCustomer: (customerId: string) => Promise<WorkOrder[]>;
  fetchWorkOrdersByVehicle: (vehicleId: string) => Promise<WorkOrder[]>;

  // Funciones para Kanban
  loadData: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<{ success: boolean }>;

  // Utilidades
  setCurrentWorkOrder: (order: WorkOrder | null) => void;
  refresh: () => Promise<void>;
}

// ==========================================
// HOOK
// ==========================================

export function useWorkOrders(options: UseWorkOrdersOptions = {}): UseWorkOrdersReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 20,
    search: initialSearch = '',
    filters: initialFilters = {},
    sortBy: initialSortBy = 'created_at',
    sortOrder: initialSortOrder = 'desc',
    status: initialStatus,
    autoLoad = false, // Por defecto false para mantener compatibilidad
    enableCache = false
  } = options;

  const { organizationId } = useSession();
  
  // ==========================================
  // STATE
  // ==========================================
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkOrder | null>(null);
  const [stats, setStats] = useState<WorkOrderStats | null>(null);
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
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortByState] = useState(initialSortBy);
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>(initialSortOrder);

  // Refs
  const isFetching = useRef(false);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  // ==========================================
  // FETCH FUNCTION (con paginación)
  // ==========================================
  
  const fetchWorkOrders = useCallback(async (status?: string) => {
    // Si se pasa status como parámetro, actualizar el filtro
    if (status !== undefined) {
      setStatusFilter(status);
    }

    const currentStatus = status || statusFilter;

    // Guard: Prevenir fetch múltiples simultáneos
    if (isFetching.current) {
      console.log('⏸️ [useWorkOrders] Fetch ya en progreso, ignorando...');
      return workOrders || [];
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      // Construir query params
      const queryParams: any = {
        page,
        pageSize,
        sortBy,
        sortOrder,
        search: search || undefined,
        filters
      };

      if (currentStatus) {
        queryParams.status = currentStatus;
      }

      const queryString = buildPaginationQueryString(queryParams);
      const url = `/api/work-orders?${queryString}`;
      
      console.log('🔄 [useWorkOrders] Fetching:', url);

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url);
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        
        // Cache válido por 30 segundos
        if (cached && cacheAge < 30000) {
          console.log('💾 [useWorkOrders] Usando cache');
          const responseData = cached.data.data || cached.data;
          const items = responseData.items || [];
          setWorkOrders(items);
          setPagination(responseData.pagination);
          setLoading(false);
          isFetching.current = false;
          return items;
        }
      }

      // Fetch
      const result = await safeFetch<PaginatedResponse<WorkOrder>>(url, { 
        timeout: 30000,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener órdenes');
      }

      // Extraer datos
      const responseData = result.data.data || result.data;
      const items = responseData.items || [];
      const paginationData = responseData.pagination;

      // Actualizar state
      setWorkOrders(items);
      setPagination(paginationData);

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result.data,
          timestamp: Date.now()
        });
      }

      console.log('✅ [useWorkOrders] Órdenes cargadas:', {
        items: items.length,
        page: paginationData.page,
        total: paginationData.total
      });

      return items;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar órdenes', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [page, pageSize, search, filters, statusFilter, sortBy, sortOrder, enableCache, workOrders]);

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
    setPage(1); // Reset to first page when changing page size
    
    // Limpiar cache al cambiar pageSize
    if (enableCache) {
      cacheRef.current.clear();
    }
  }, [enableCache]);

  // ==========================================
  // FILTER ACTIONS
  // ==========================================

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch);
    setPage(1); // Reset to first page when searching
    
    // Limpiar cache al buscar
    if (enableCache) {
      cacheRef.current.clear();
    }
  }, [enableCache]);

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters);
    setPage(1); // Reset to first page when filtering
    
    // Limpiar cache al filtrar
    if (enableCache) {
      cacheRef.current.clear();
    }
  }, [enableCache]);

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortByState(newSortBy);
    setSortOrderState(newSortOrder);
    setPage(1); // Reset to first page when sorting
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setFiltersState({});
    setStatusFilter(undefined);
    setPage(1);
    
    // Limpiar cache
    if (enableCache) {
      cacheRef.current.clear();
    }
  }, [enableCache]);

  // ==========================================
  // OTHER FUNCTIONS (mantener compatibilidad)
  // ==========================================

  // 🔍 BUSCAR ÓRDENES
  const searchWorkOrders = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm);
    return await fetchWorkOrders();
  }, [setSearch, fetchWorkOrders]);

  // 📊 OBTENER ESTADÍSTICAS
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<{ success: boolean; data: WorkOrderStats }>('/api/work-orders?stats=true', { 
        timeout: 30000 
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener estadísticas');
      }

      setStats(result.data.data);
      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar estadísticas', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 👁️ OBTENER UNA ORDEN POR ID
  const fetchWorkOrderById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<{ success: boolean; data: WorkOrder }>(`/api/work-orders/${id}`, { 
        timeout: 30000 
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener orden');
      }

      setCurrentWorkOrder(result.data.data);
      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar orden', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ➕ CREAR NUEVA ORDEN
  const createWorkOrder = useCallback(async (orderData: CreateWorkOrderData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safePost<{ success: boolean; data: WorkOrder }>(
        '/api/work-orders',
        orderData,
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al crear orden');
      }

      toast.success('Orden creada exitosamente', {
        description: `Orden #${result.data.data.id.slice(0, 8)} ha sido creada`,
      });

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      // Actualizar lista
      await fetchWorkOrders();

      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear orden', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders, enableCache]);

  // ✏️ ACTUALIZAR ORDEN
  const updateWorkOrder = useCallback(async (id: string, orderData: UpdateWorkOrderData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safePut<{ success: boolean; data: WorkOrder }>(
        `/api/work-orders/${id}`,
        orderData,
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al actualizar orden');
      }

      toast.success('Orden actualizada', {
        description: 'Los cambios han sido guardados',
      });

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      // Actualizar lista
      await fetchWorkOrders();

      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar orden', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders, enableCache]);

  // 🗑️ ELIMINAR ORDEN
  const deleteWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeDelete(`/api/work-orders/${id}`, {
        timeout: 30000
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar orden');
      }

      toast.success('Orden eliminada', {
        description: 'La orden ha sido eliminada correctamente',
      });

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      // Actualizar lista
      await fetchWorkOrders();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar orden', {
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders, enableCache]);

  // 🔄 CAMBIAR ESTADO DE ORDEN
  const updateWorkOrderStatus = useCallback(async (id: string, status: WorkOrder['status']) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safePut<{ success: boolean; data: WorkOrder }>(
        `/api/work-orders/${id}/status`,
        { status },
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al cambiar estado');
      }

      const statusLabels: Record<string, string> = {
        reception: 'Recepción',
        diagnosis: 'Diagnóstico',
        initial_quote: 'Cotización Inicial',
        waiting_approval: 'Esperando Aprobación',
        disassembly: 'Desmontaje',
        waiting_parts: 'Esperando Piezas',
        assembly: 'Ensamblaje',
        testing: 'Pruebas',
        ready: 'Lista',
        completed: 'Completada',
        cancelled: 'Cancelada',
      };

      toast.success('Estado actualizado', {
        description: `Orden cambió a: ${statusLabels[status] || status}`,
      });

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      // Actualizar lista
      await fetchWorkOrders();

      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cambiar estado', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders, enableCache]);

  // 💰 ACTUALIZAR DESCUENTO
  const updateDiscount = useCallback(async (id: string, discount: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safePut<{ success: boolean; data: WorkOrder }>(
        `/api/work-orders/${id}/discount`,
        { discount },
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al actualizar descuento');
      }

      toast.success('Descuento actualizado', {
        description: `Nuevo descuento: $${discount.toFixed(2)}`,
      });

      // Si tenemos la orden actual cargada, actualizarla
      if (currentWorkOrder?.id === id) {
        setCurrentWorkOrder(result.data.data);
      }

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      // Actualizar lista
      await fetchWorkOrders();

      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar descuento', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrders, enableCache]);

  // 📦 OBTENER ITEMS DE UNA ORDEN
  const fetchOrderItems = useCallback(async (workOrderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<WorkOrderItem[]>(`/api/work-orders/${workOrderId}/items`, { 
        timeout: 30000 
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener items');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar items', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ➕ AGREGAR ITEM A ORDEN
  const addOrderItem = useCallback(async (workOrderId: string, itemData: CreateOrderItemData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safePost<{ success: boolean; data: WorkOrderItem }>(
        `/api/work-orders/${workOrderId}/items`,
        itemData,
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al agregar item');
      }

      toast.success('Item agregado', {
        description: `${itemData.item_name} agregado a la orden`,
      });

      // Recargar orden actual si es la misma
      if (currentWorkOrder?.id === workOrderId) {
        await fetchWorkOrderById(workOrderId);
      }

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al agregar item', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrderById, enableCache]);

  // ✏️ ACTUALIZAR ITEM
  const updateOrderItem = useCallback(async (
    workOrderId: string,
    itemId: string,
    itemData: UpdateOrderItemData
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safePut<{ success: boolean; data: WorkOrderItem }>(
        `/api/work-orders/${workOrderId}/items/${itemId}`,
        itemData,
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al actualizar item');
      }

      toast.success('Item actualizado', {
        description: 'Los cambios han sido guardados',
      });

      // Recargar orden actual si es la misma
      if (currentWorkOrder?.id === workOrderId) {
        await fetchWorkOrderById(workOrderId);
      }

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      return result.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar item', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrderById, enableCache]);

  // 🗑️ ELIMINAR ITEM
  const deleteOrderItem = useCallback(async (workOrderId: string, itemId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeDelete(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        timeout: 30000
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar item');
      }

      toast.success('Item eliminado', {
        description: 'El item ha sido eliminado de la orden',
      });

      // Recargar orden actual si es la misma
      if (currentWorkOrder?.id === workOrderId) {
        await fetchWorkOrderById(workOrderId);
      }

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar item', {
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrderById, enableCache]);

  // 👤 OBTENER ÓRDENES POR CLIENTE
  const fetchWorkOrdersByCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<{ success: boolean; data: WorkOrder[] }>(
        `/api/work-orders/customer/${customerId}`,
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener órdenes');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar órdenes del cliente', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚗 OBTENER ÓRDENES POR VEHÍCULO
  const fetchWorkOrdersByVehicle = useCallback(async (vehicleId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<{ success: boolean; data: WorkOrder[] }>(
        `/api/work-orders/vehicle/${vehicleId}`,
        { timeout: 30000 }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener órdenes');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar órdenes del vehículo', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 📋 CARGAR TODOS LOS DATOS PARA KANBAN
  const loadData = useCallback(async () => {
    // ✅ Validar organizationId del contexto
    if (!organizationId) {
      console.error('❌ No organization ID available');
      setError('No se encontró la organización');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Cargando datos del Kanban...');
      
      // ✅ Usar API routes en lugar de queries directas desde el cliente
      const [ordersRes, customersRes, vehiclesRes] = await Promise.all([
        // Cargar órdenes desde API (sin paginación para Kanban - todas las órdenes)
        fetch('/api/work-orders?page=1&pageSize=1000', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }),
        // Cargar clientes desde API
        fetch('/api/customers?page=1&pageSize=1000', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }),
        // Cargar vehículos desde API
        fetch('/api/vehicles', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }),
      ]);

      // Procesar respuesta de órdenes
      if (!ordersRes.ok) {
        const errorData = await ordersRes.json();
        throw new Error(errorData.error || 'Error al cargar órdenes');
      }
      const ordersResult = await ordersRes.json();
      const ordersData = ordersResult.success 
        ? (ordersResult.data?.items || ordersResult.data || [])
        : [];

      // Procesar respuesta de clientes
      if (!customersRes.ok) {
        const errorData = await customersRes.json();
        throw new Error(errorData.error || 'Error al cargar clientes');
      }
      const customersResult = await customersRes.json();
      const customersData = customersResult.success 
        ? (customersResult.data?.items || customersResult.data || [])
        : [];

      // Procesar respuesta de vehículos
      if (!vehiclesRes.ok) {
        const errorData = await vehiclesRes.json();
        throw new Error(errorData.error || 'Error al cargar vehículos');
      }
      const vehiclesResult = await vehiclesRes.json();
      const vehiclesData = vehiclesResult.success 
        ? (vehiclesResult.data?.items || vehiclesResult.data || [])
        : [];

      console.log('✅ Órdenes cargadas:', ordersData?.length || 0);
      console.log('✅ Clientes cargados:', customersData?.length || 0);
      console.log('✅ Vehículos cargados:', vehiclesData?.length || 0);

      // Actualizar estados
      setWorkOrders(ordersData || []);
      setCustomers(customersData || []);
      setVehicles(vehiclesData || []);

      console.log('✅ Datos cargados exitosamente');

    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      console.error('💥 Error en loadData:', errorMessage);
      setError(errorMessage);
      toast.error('Error al cargar datos', {
        description: errorMessage,
      });
      
      // IMPORTANTE: Setear arrays vacíos para que el Kanban no se quede cargando
      setWorkOrders([]);
      setCustomers([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // 🔄 ACTUALIZAR ESTADO DE ORDEN (PARA KANBAN)
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    // ✅ Validar organizationId del contexto
    if (!organizationId) {
      console.error('❌ No organization ID available');
      throw new Error('No se encontró la organización');
    }

    try {
      // ✅ Usar API route en lugar de query directa
      const result = await safePut<{ success: boolean }>(
        `/api/work-orders/${orderId}`,
        {
          status: newStatus,
          updated_at: new Date().toISOString(),
        },
        { timeout: 30000 }
      );

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar estado');
      }

      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear();
      }

      return { success: result.success };
    } catch (error: any) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }, [organizationId, enableCache]);

  // 🔄 REFRESH
  const refresh = useCallback(async () => {
    await fetchWorkOrders();
  }, [fetchWorkOrders]);

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Estado
    workOrders,
    customers,
    vehicles,
    currentWorkOrder,
    stats,
    loading,
    error,

    // Paginación
    pagination,

    // Navigation Actions
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,

    // Filter Actions
    setSearch,
    setFilters,
    setSorting,
    clearFilters,

    // Operaciones de órdenes
    fetchWorkOrders,
    searchWorkOrders,
    fetchStats,
    fetchWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    updateWorkOrderStatus,
    updateDiscount,

    // Operaciones de items
    fetchOrderItems,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,

    // Consultas especiales
    fetchWorkOrdersByCustomer,
    fetchWorkOrdersByVehicle,

    // Funciones para Kanban
    loadData,
    updateOrderStatus,

    // Utilidades
    setCurrentWorkOrder,
    refresh,
  };
}
