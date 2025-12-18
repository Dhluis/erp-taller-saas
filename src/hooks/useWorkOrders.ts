/**
 * useWorkOrders Hook con Paginación
 * Eagles ERP - Hook para gestión de órdenes de trabajo con paginación
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/lib/context/SessionContext'
import type { PaginatedResponse, SearchParams } from '@/types/pagination'
import { buildPaginationQueryString } from '@/lib/utils/pagination'

// ==========================================
// TYPES (mantener los existentes)
// ==========================================

export interface WorkOrderItem {
  id: string
  work_order_id: string
  item_type: 'service' | 'part'
  item_name: string
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface WorkOrder {
  id: string
  organization_id: string
  customer_id: string
  vehicle_id: string
  status: 'reception' | 'diagnosis' | 'initial_quote' | 'waiting_approval' | 'disassembly' | 'waiting_parts' | 'assembly' | 'testing' | 'ready' | 'completed' | 'cancelled'
  description: string | null
  estimated_cost: number | null
  final_cost: number | null
  entry_date: string
  estimated_completion: string | null
  completed_at: string | null
  notes: string | null
  subtotal: number | null
  tax_amount: number | null
  discount_amount: number | null
  total_amount: number | null
  created_at: string
  updated_at: string
  customer?: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
  vehicle?: {
    id: string
    brand: string
    model: string
    year: number | null
    license_plate: string | null
  }
  items?: WorkOrderItem[]
}

export interface Customer {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  customer_id: string
  brand: string
  model: string
  year: number | null
  license_plate: string | null
  vin: string | null
  color: string | null
  mileage: number | null
  created_at: string
  updated_at: string
}

export interface WorkOrderStats {
  total: number
  pending: number
  in_progress: number
  diagnosed: number
  approved: number
  in_repair: number
  waiting_parts: number
  completed: number
  delivered: number
  total_revenue: number
  average_order_value: number
}

export interface CreateWorkOrderData {
  customer_id: string
  vehicle_id: string
  description: string
  diagnosis?: string
  assigned_to?: string
  estimated_completion?: string
}

export interface UpdateWorkOrderData {
  customer_id?: string
  vehicle_id?: string
  description?: string
  diagnosis?: string
  assigned_to?: string
  estimated_completion?: string
  status?: string
}

export interface CreateOrderItemData {
  item_type: 'service' | 'part'
  item_name: string
  description?: string
  quantity: number
  unit_price: number
}

export interface UpdateOrderItemData {
  item_type?: 'service' | 'part'
  item_name?: string
  description?: string
  quantity?: number
  unit_price?: number
}

// ==========================================
// HOOK OPTIONS
// ==========================================

interface UseWorkOrdersOptions extends Partial<SearchParams> {
  autoLoad?: boolean
  enableCache?: boolean
}

interface UseWorkOrdersReturn {
  // Data
  workOrders: WorkOrder[]
  customers: Customer[]
  vehicles: Vehicle[]
  currentWorkOrder: WorkOrder | null
  stats: WorkOrderStats | null
  loading: boolean
  error: string | null
  
  // Pagination
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  
  // Navigation Actions
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  changePageSize: (size: number) => void
  
  // Filter Actions
  setSearch: (search: string) => void
  setFilters: (filters: Record<string, any>) => void
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  clearFilters: () => void
  
  // CRUD Actions
  refresh: () => Promise<void>
  fetchWorkOrderById: (id: string) => Promise<WorkOrder | null>
  createWorkOrder: (data: CreateWorkOrderData) => Promise<WorkOrder | null>
  updateWorkOrder: (id: string, data: UpdateWorkOrderData) => Promise<WorkOrder | null>
  deleteWorkOrder: (id: string) => Promise<boolean>
  updateWorkOrderStatus: (id: string, status: string) => Promise<boolean>
  
  // Items
  addOrderItem: (workOrderId: string, data: CreateOrderItemData) => Promise<WorkOrderItem | null>
  updateOrderItem: (workOrderId: string, itemId: string, data: UpdateOrderItemData) => Promise<WorkOrderItem | null>
  deleteOrderItem: (workOrderId: string, itemId: string) => Promise<boolean>
  
  // Special queries
  fetchWorkOrdersByCustomer: (customerId: string) => Promise<WorkOrder[]>
  fetchWorkOrdersByVehicle: (vehicleId: string) => Promise<WorkOrder[]>
  fetchStats: () => Promise<WorkOrderStats | null>
  
  // Kanban support
  loadData: () => Promise<void>
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<{ success: boolean }>
  
  // Utilities
  setCurrentWorkOrder: (workOrder: WorkOrder | null) => void
}

// ==========================================
// HOOK
// ==========================================

export function useWorkOrders(options: UseWorkOrdersOptions = {}): UseWorkOrdersReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 10, // 10 para work orders (tienen más info)
    search: initialSearch = '',
    filters: initialFilters = {},
    sortBy: initialSortBy = 'created_at',
    sortOrder: initialSortOrder = 'desc',
    autoLoad = true,
    enableCache = false
  } = options

  // ==========================================
  // STATE
  // ==========================================
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkOrder | null>(null)
  const [stats, setStats] = useState<WorkOrderStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  
  // Filter state
  const [search, setSearchState] = useState(initialSearch)
  const [filters, setFiltersState] = useState(initialFilters)
  const [sortBy, setSortByState] = useState(initialSortBy)
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>(initialSortOrder)
  
  // Context
  const { organizationId } = useSession()
  
  // Refs
  const isFetching = useRef(false)
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())

  // ==========================================
  // FETCH FUNCTION CON PAGINACIÓN
  // ==========================================
  
  const fetchWorkOrders = useCallback(async (statusFilter?: string) => {
    if (!organizationId) {
      console.log('⏳ [useWorkOrders] Esperando organizationId...')
      setWorkOrders([])
      setLoading(false)
      return
    }

    if (isFetching.current) {
      console.log('⏸️ [useWorkOrders] Fetch ya en progreso')
      return
    }

    try {
      isFetching.current = true
      setLoading(true)
      setError(null)

      // Construir query params con paginación
      const queryString = buildPaginationQueryString({
        page,
        pageSize,
        sortBy,
        sortOrder,
        search: search || undefined,
        filters: {
          ...filters,
          ...(statusFilter && { status: statusFilter })
        }
      })

      const url = `/api/work-orders?${queryString}`
      console.log('🔄 [useWorkOrders] Fetching:', url)

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url)
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity
        
        if (cached && cacheAge < 30000) {
          console.log('💾 [useWorkOrders] Usando cache')
          const responseData = cached.data.data || cached.data
          setWorkOrders(responseData.items || [])
          setPagination(responseData.pagination)
          setLoading(false)
          isFetching.current = false
          return
        }
      }

      // Fetch
      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al cargar órdenes')
      }

      // Extraer datos
      const responseData = result.data || result
      const items = responseData.items || []
      const paginationData = responseData.pagination

      // Actualizar state
      setWorkOrders(items)
      setPagination(paginationData)

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result,
          timestamp: Date.now()
        })
      }

      console.log('✅ [useWorkOrders] Órdenes cargadas:', {
        items: items.length,
        page: paginationData.page,
        total: paginationData.total
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al cargar órdenes', { description: errorMessage })
      console.error('❌ [useWorkOrders] Error:', err)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [organizationId, page, pageSize, search, filters, sortBy, sortOrder, enableCache])

  // ==========================================
  // NAVIGATION ACTIONS
  // ==========================================

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== page) {
      setPage(newPage)
    }
  }, [pagination.totalPages, page])

  const goToNextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setPage(p => p + 1)
    }
  }, [pagination.hasNextPage])

  const goToPreviousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      setPage(p => Math.max(1, p - 1))
    }
  }, [pagination.hasPreviousPage])

  const goToFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  const goToLastPage = useCallback(() => {
    setPage(pagination.totalPages)
  }, [pagination.totalPages])

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
    if (enableCache) cacheRef.current.clear()
  }, [enableCache])

  // ==========================================
  // FILTER ACTIONS
  // ==========================================

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch)
    setPage(1)
    if (enableCache) cacheRef.current.clear()
  }, [enableCache])

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters)
    setPage(1)
    if (enableCache) cacheRef.current.clear()
  }, [enableCache])

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortByState(newSortBy)
    setSortOrderState(newSortOrder)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setSearchState('')
    setFiltersState({})
    setPage(1)
    if (enableCache) cacheRef.current.clear()
  }, [enableCache])

  // ==========================================
  // CRUD OPERATIONS (mantener lógica existente)
  // ==========================================

  const fetchWorkOrderById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener orden')
      }

      setCurrentWorkOrder(data.data)
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al cargar orden', { description: errorMessage })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkOrder = useCallback(async (orderData: CreateWorkOrderData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al crear orden')
      }

      toast.success('Orden creada exitosamente')
      
      if (enableCache) cacheRef.current.clear()
      await fetchWorkOrders()

      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al crear orden', { description: errorMessage })
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchWorkOrders, enableCache])

  const updateWorkOrder = useCallback(async (id: string, orderData: UpdateWorkOrderData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar orden')
      }

      toast.success('Orden actualizada')
      
      if (enableCache) cacheRef.current.clear()
      await fetchWorkOrders()

      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al actualizar orden', { description: errorMessage })
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchWorkOrders, enableCache])

  const deleteWorkOrder = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al eliminar orden')
      }

      toast.success('Orden eliminada')
      
      if (enableCache) cacheRef.current.clear()
      await fetchWorkOrders()

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al eliminar orden', { description: errorMessage })
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchWorkOrders, enableCache])

  const updateWorkOrderStatus = useCallback(async (id: string, status: string) => {
    return await updateWorkOrder(id, { status }) !== null
  }, [updateWorkOrder])

  // ==========================================
  // ITEMS OPERATIONS (mantener existente)
  // ==========================================

  const addOrderItem = useCallback(async (workOrderId: string, itemData: CreateOrderItemData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Error al agregar item')
      toast.success('Item agregado')
      if (currentWorkOrder?.id === workOrderId) await fetchWorkOrderById(workOrderId)
      return data.data
    } catch (err) {
      toast.error('Error al agregar item')
      return null
    } finally {
      setLoading(false)
    }
  }, [currentWorkOrder, fetchWorkOrderById])

  const updateOrderItem = useCallback(async (workOrderId: string, itemId: string, itemData: UpdateOrderItemData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Item actualizado')
      if (currentWorkOrder?.id === workOrderId) await fetchWorkOrderById(workOrderId)
      return data.data
    } catch (err) {
      toast.error('Error al actualizar item')
      return null
    } finally {
      setLoading(false)
    }
  }, [currentWorkOrder, fetchWorkOrderById])

  const deleteOrderItem = useCallback(async (workOrderId: string, itemId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Item eliminado')
      if (currentWorkOrder?.id === workOrderId) await fetchWorkOrderById(workOrderId)
      return true
    } catch (err) {
      toast.error('Error al eliminar item')
      return false
    } finally {
      setLoading(false)
    }
  }, [currentWorkOrder, fetchWorkOrderById])

  // ==========================================
  // SPECIAL QUERIES
  // ==========================================

  const fetchWorkOrdersByCustomer = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`/api/work-orders/customer/${customerId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      return data.success ? data.data : []
    } catch (err) {
      toast.error('Error al cargar órdenes del cliente')
      return []
    }
  }, [])

  const fetchWorkOrdersByVehicle = useCallback(async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/work-orders/vehicle/${vehicleId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      return data.success ? data.data : []
    } catch (err) {
      toast.error('Error al cargar órdenes del vehículo')
      return []
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/work-orders?stats=true', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
        return data.data
      }
      return null
    } catch (err) {
      toast.error('Error al cargar estadísticas')
      return null
    }
  }, [])

  // ==========================================
  // KANBAN SUPPORT
  // ==========================================

  const loadData = useCallback(async () => {
    // ✅ Validar organizationId del contexto
    if (!organizationId) {
      console.error('❌ No organization ID available')
      setError('No se encontró la organización')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Cargando datos del Kanban...')
      
      // ✅ Usar API routes en lugar de queries directas desde el cliente
      const [ordersRes, customersRes, vehiclesRes] = await Promise.all([
        // Cargar órdenes desde API
        fetch('/api/work-orders', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // ✅ FIX: Incluir cookies para autenticación
          cache: 'no-store',
        }),
        // Cargar clientes desde API
        fetch('/api/customers', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // ✅ FIX: Incluir cookies para autenticación
          cache: 'no-store',
        }),
        // Cargar vehículos desde API
        fetch('/api/vehicles', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // ✅ FIX: Incluir cookies para autenticación
          cache: 'no-store',
        }),
      ])

      // Procesar respuesta de órdenes
      if (!ordersRes.ok) {
        const errorData = await ordersRes.json()
        throw new Error(errorData.error || 'Error al cargar órdenes')
      }
      const ordersResult = await ordersRes.json()
      // ✅ FIX: Manejar estructura paginada { data: { items, pagination } }
      const ordersData = ordersResult.success 
        ? (ordersResult.data?.items || ordersResult.data || [])
        : []

      // Procesar respuesta de clientes
      if (!customersRes.ok) {
        const errorData = await customersRes.json()
        throw new Error(errorData.error || 'Error al cargar clientes')
      }
      const customersResult = await customersRes.json()
      // ✅ FIX: Manejar estructura paginada { data: { items, pagination } }
      const customersData = customersResult.success 
        ? (customersResult.data?.items || customersResult.data || [])
        : []

      // Procesar respuesta de vehículos
      if (!vehiclesRes.ok) {
        const errorData = await vehiclesRes.json()
        throw new Error(errorData.error || 'Error al cargar vehículos')
      }
      const vehiclesResult = await vehiclesRes.json()
      // ✅ FIX: Manejar estructura paginada { data: { items, pagination } }
      const vehiclesData = vehiclesResult.success 
        ? (vehiclesResult.data?.items || vehiclesResult.data || [])
        : []

      console.log('✅ Órdenes cargadas:', ordersData?.length || 0)
      console.log('✅ Clientes cargados:', customersData?.length || 0)
      console.log('✅ Vehículos cargados:', vehiclesData?.length || 0)

      // Actualizar estados
      setWorkOrders(ordersData || [])
      setCustomers(customersData || [])
      setVehicles(vehiclesData || [])

      console.log('✅ Datos cargados exitosamente')

    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido'
      console.error('💥 Error en loadData:', errorMessage)
      setError(errorMessage)
      toast.error('Error al cargar datos', {
        description: errorMessage,
      })
      
      // IMPORTANTE: Setear arrays vacíos para que el Kanban no se quede cargando
      setWorkOrders([])
      setCustomers([])
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    // ✅ Validar organizationId del contexto
    if (!organizationId) {
      console.error('❌ No organization ID available')
      throw new Error('No se encontró la organización')
    }

    try {
      // ✅ Usar API route en lugar de query directa
      const response = await fetch(`/api/work-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar estado')
      }

      const result = await response.json()
      
      // Limpiar cache
      if (enableCache) cacheRef.current.clear()
      
      return { success: result.success }
    } catch (error: any) {
      console.error('Error updating order status:', error)
      throw error
    }
  }, [organizationId, enableCache])

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    if (autoLoad && organizationId) {
      fetchWorkOrders()
    }
  }, [autoLoad, organizationId, fetchWorkOrders])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Data
    workOrders,
    customers,
    vehicles,
    currentWorkOrder,
    stats,
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
    refresh: fetchWorkOrders,
    fetchWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    updateWorkOrderStatus,
    
    // Items
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,
    
    // Special
    fetchWorkOrdersByCustomer,
    fetchWorkOrdersByVehicle,
    fetchStats,
    
    // Kanban
    loadData,
    updateOrderStatus,
    
    // Utilities
    setCurrentWorkOrder
  }
}
