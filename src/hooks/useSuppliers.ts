'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api'
import { useOrganization } from '@/lib/context/SessionContext'
import type { PaginatedResponse, SearchParams } from '@/types/pagination'
import { buildPaginationQueryString } from '@/lib/utils/pagination'

// ==========================================
// TYPES
// ==========================================

export interface Supplier {
  id: string
  organization_id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  tax_id?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface UseSuppliersOptions extends Partial<SearchParams> {
  autoLoad?: boolean
  enableCache?: boolean
}

interface UseSuppliersReturn {
  // Data
  suppliers: Supplier[]
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
  
  // Navigation
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  changePageSize: (size: number) => void
  
  // Filters
  setSearch: (search: string) => void
  setFilters: (filters: Record<string, any>) => void
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  clearFilters: () => void
  
  // CRUD
  refresh: () => Promise<void>
  createSupplier: (data: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Supplier>
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<Supplier>
  deleteSupplier: (id: string) => Promise<boolean>
}

// ==========================================
// HOOK
// ==========================================

export function useSuppliers(options: UseSuppliersOptions = {}): UseSuppliersReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 20,
    search: initialSearch = '',
    filters: initialFilters = {},
    sortBy: initialSortBy = 'name',
    sortOrder: initialSortOrder = 'asc',
    autoLoad = true,
    enableCache = false
  } = options

  const { organizationId } = useOrganization()
  
  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
  
  // Cache
  const cacheRef = useRef<Map<string, any>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)

  // ==========================================
  // FETCH FUNCTION
  // ==========================================
  
  const fetchSuppliers = useCallback(async () => {
    if (!organizationId) {
      console.log('⏳ [useSuppliers] Esperando organizationId...')
      return
    }

    // Cancelar request anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)

      // Construir query string
      const queryString = buildPaginationQueryString({
        page,
        pageSize,
        sortBy,
        sortOrder,
        search,
        filters
      })

      const cacheKey = `suppliers-${organizationId}-${queryString}`
      
      // Check cache
      if (enableCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)
        console.log('📦 [useSuppliers] Usando cache')
        setSuppliers(cached.items)
        setPagination(cached.pagination)
        setLoading(false)
        return
      }

      console.log('🔄 [useSuppliers] Fetching:', `/api/suppliers?${queryString}`)

      const result = await safeFetch<PaginatedResponse<Supplier>>(
        `/api/suppliers?${queryString}`,
        { signal: abortControllerRef.current.signal }
      )

      if (result.success && result.data) {
        // Estructura: { data: { items: [], pagination: {} } }
        const responseData = (result.data as any)?.data || result.data
        const items = Array.isArray((responseData as any)?.items) 
          ? (responseData as any).items 
          : (Array.isArray(responseData) ? responseData : [])
        
        const paginationData = (responseData as any)?.pagination || {
          page,
          pageSize,
          total: items.length,
          totalPages: Math.ceil(items.length / pageSize),
          hasNextPage: false,
          hasPreviousPage: false
        }

        setSuppliers(items)
        setPagination(paginationData)

        // Cache
        if (enableCache) {
          cacheRef.current.set(cacheKey, { items, pagination: paginationData })
        }

        console.log('✅ [useSuppliers] Loaded:', {
          items: items.length,
          page: paginationData.page,
          total: paginationData.total
        })
      } else {
        setError(result.error || 'Error al cargar proveedores')
        toast.error('Error al cargar proveedores')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('❌ [useSuppliers] Error:', err)
        setError(err.message)
        toast.error('Error al cargar proveedores')
      }
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, pageSize, search, filters, sortBy, sortOrder, enableCache])

  // Auto-load
  useEffect(() => {
    if (autoLoad) {
      fetchSuppliers()
    }
  }, [autoLoad, fetchSuppliers])

  // ==========================================
  // NAVIGATION FUNCTIONS
  // ==========================================

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage)
    }
  }, [pagination])

  const goToNextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setPage(prev => prev + 1)
    }
  }, [pagination])

  const goToPreviousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      setPage(prev => prev - 1)
    }
  }, [pagination])

  const goToFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  const goToLastPage = useCallback(() => {
    if (pagination.totalPages) {
      setPage(pagination.totalPages)
    }
  }, [pagination])

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }, [])

  // ==========================================
  // FILTER FUNCTIONS
  // ==========================================

  const setSearch = useCallback((newSearch: string) => {
    // Solo actualizar si el valor realmente cambió
    setSearchState(prev => {
      if (prev === newSearch) return prev
      return newSearch
    })
    setPage(1)
  }, [])

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters)
    setPage(1)
  }, [])

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortByState(newSortBy)
    setSortOrderState(newSortOrder)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setSearchState('')
    setFiltersState({})
    setPage(1)
  }, [])

  // ==========================================
  // CRUD FUNCTIONS
  // ==========================================

  const refresh = useCallback(async () => {
    cacheRef.current.clear()
    await fetchSuppliers()
  }, [fetchSuppliers])

  const createSupplier = useCallback(async (data: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await safePost<{ success: boolean; data: Supplier }>('/api/suppliers', data)
      
      if (result.success && result.data?.data) {
        toast.success('Proveedor creado exitosamente')
        await refresh()
        return result.data.data
      } else {
        throw new Error(result.error || 'Error al crear proveedor')
      }
    } catch (err: any) {
      toast.error('Error al crear proveedor')
      throw err
    }
  }, [refresh])

  const updateSupplier = useCallback(async (id: string, data: Partial<Supplier>) => {
    try {
      const result = await safePut<{ success: boolean; data: Supplier }>(`/api/suppliers/${id}`, data)
      
      if (result.success && result.data?.data) {
        toast.success('Proveedor actualizado')
        await refresh()
        return result.data.data
      } else {
        throw new Error(result.error || 'Error al actualizar')
      }
    } catch (err: any) {
      toast.error('Error al actualizar proveedor')
      throw err
    }
  }, [refresh])

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      const result = await safeDelete(`/api/suppliers/${id}`)
      
      if (result.success) {
        toast.success('Proveedor eliminado')
        await refresh()
        return true
      } else {
        throw new Error(result.error || 'Error al eliminar')
      }
    } catch (err: any) {
      toast.error('Error al eliminar proveedor')
      throw err
    }
  }, [refresh])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    suppliers: Array.isArray(suppliers) ? suppliers : [],
    loading,
    error,
    pagination,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    setSearch,
    setFilters,
    setSorting,
    clearFilters,
    refresh,
    createSupplier,
    updateSupplier,
    deleteSupplier
  }
}
