/**
 * useCustomers Hook con Paginación
 * Eagles ERP - Hook para gestión de clientes con paginación completa
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api'
import { useOrganization } from '@/lib/context/SessionContext'
import type { Customer } from '@/lib/database/queries/customers'
import type { PaginatedResponse, SearchParams } from '@/types/pagination'
import { buildPaginationQueryString } from '@/lib/utils/pagination'

// ==========================================
// TYPES
// ==========================================

interface UseCustomersOptions extends Partial<SearchParams> {
  autoLoad?: boolean // Si debe cargar automáticamente al montar
  enableCache?: boolean // Habilitar cache simple
}

interface UseCustomersReturn {
  // Data
  customers: Customer[]
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
  createCustomer: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer>
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>
  deleteCustomer: (id: string) => Promise<boolean>
}

// ==========================================
// HOOK
// ==========================================

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 20,
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
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
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
  const { organizationId, ready } = useOrganization()
  
  // Refs
  const isFetching = useRef(false)
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())

  // ==========================================
  // FETCH FUNCTION
  // ==========================================
  
  const fetchCustomers = useCallback(async () => {
    // Guard: No fetch si no está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useCustomers] Esperando organizationId...')
      setCustomers([])
      setLoading(false)
      return
    }

    // Guard: Prevenir fetch múltiples simultáneos
    if (isFetching.current) {
      console.log('⏸️ [useCustomers] Fetch ya en progreso, ignorando...')
      return
    }

    try {
      isFetching.current = true
      setLoading(true)
      setError(null)

      // Construir query params
      const queryString = buildPaginationQueryString({
        page,
        pageSize,
        sortBy,
        sortOrder,
        search: search || undefined,
        filters
      })

      const url = `/api/customers?${queryString}`
      console.log('🔄 [useCustomers] Fetching:', url)

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url)
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity
        
        // Cache válido por 30 segundos
        if (cached && cacheAge < 30000) {
          console.log('💾 [useCustomers] Usando cache')
          const responseData = cached.data.data || cached.data
          setCustomers(responseData.items || [])
          setPagination(responseData.pagination)
          setLoading(false)
          isFetching.current = false
          return
        }
      }

      // Fetch
      const result = await safeFetch<PaginatedResponse<Customer>>(url, { 
        timeout: 30000,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al cargar clientes')
      }

      // Extraer datos
      const responseData = result.data.data || result.data
      const items = responseData.items || []
      const paginationData = responseData.pagination

      // Actualizar state
      setCustomers(items)
      setPagination(paginationData)

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result.data,
          timestamp: Date.now()
        })
      }

      console.log('✅ [useCustomers] Clientes cargados:', {
        items: items.length,
        page: paginationData.page,
        total: paginationData.total
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al cargar clientes', { description: errorMessage })
      console.error('❌ [useCustomers] Error:', err)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [organizationId, ready, page, pageSize, search, filters, sortBy, sortOrder, enableCache])

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
    setPage(1) // Reset to first page when changing page size
    
    // Limpiar cache al cambiar pageSize
    if (enableCache) {
      cacheRef.current.clear()
    }
  }, [enableCache])

  // ==========================================
  // FILTER ACTIONS
  // ==========================================

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch)
    setPage(1) // Reset to first page when searching
    
    // Limpiar cache al buscar
    if (enableCache) {
      cacheRef.current.clear()
    }
  }, [enableCache])

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters)
    setPage(1) // Reset to first page when filtering
    
    // Limpiar cache al filtrar
    if (enableCache) {
      cacheRef.current.clear()
    }
  }, [enableCache])

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortByState(newSortBy)
    setSortOrderState(newSortOrder)
    setPage(1) // Reset to first page when sorting
  }, [])

  const clearFilters = useCallback(() => {
    setSearchState('')
    setFiltersState({})
    setPage(1)
    
    // Limpiar cache
    if (enableCache) {
      cacheRef.current.clear()
    }
  }, [enableCache])

  // ==========================================
  // CRUD ACTIONS
  // ==========================================

  const createCustomer = useCallback(async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await safePost<{ success: boolean; data: Customer }>(
        '/api/customers',
        data,
        { timeout: 30000 }
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al crear cliente')
      }

      toast.success('Cliente creado correctamente')
      
      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear()
      }
      
      // Refresh list
      await fetchCustomers()

      return result.data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('Error al crear cliente', { description: errorMessage })
      throw err
    }
  }, [fetchCustomers, enableCache])

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      // Optimistic update
      setCustomers(prev =>
        prev.map(c => c.id === id ? { ...c, ...data } : c)
      )

      const result = await safePut<{ success: boolean; data: Customer }>(
        `/api/customers/${id}`,
        data,
        { timeout: 30000 }
      )

      if (!result.success || !result.data) {
        // Revert on error
        await fetchCustomers()
        throw new Error(result.error || 'Error al actualizar cliente')
      }

      toast.success('Cliente actualizado correctamente')
      
      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear()
      }

      return result.data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('Error al actualizar cliente', { description: errorMessage })
      throw err
    }
  }, [fetchCustomers, enableCache])

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const result = await safeDelete(`/api/customers/${id}`, {
        timeout: 30000
      })

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar cliente')
      }

      toast.success('Cliente eliminado correctamente')
      
      // Limpiar cache
      if (enableCache) {
        cacheRef.current.clear()
      }
      
      // Refresh list
      await fetchCustomers()
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('Error al eliminar cliente', { description: errorMessage })
      throw err
    }
  }, [fetchCustomers, enableCache])

  // ==========================================
  // EFFECTS
  // ==========================================

  // Auto-load on mount and when params change
  useEffect(() => {
    if (autoLoad && ready && organizationId) {
      fetchCustomers()
    }
  }, [autoLoad, ready, organizationId, fetchCustomers])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Data
    customers,
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
    refresh: fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
  }
}
