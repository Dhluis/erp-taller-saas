/**
 * useQuotations Hook con Paginación
 * Eagles ERP - Hook para gestión de cotizaciones con paginación completa
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api'
import { useOrganization } from '@/lib/context/SessionContext'
import type { PaginatedResponse, SearchParams } from '@/types/pagination'
import { buildPaginationQueryString } from '@/lib/utils/pagination'

// ==========================================
// TYPES
// ==========================================

export interface QuotationItem {
  id: string
  quotation_id: string
  item_type: 'service' | 'part'
  item_name: string
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  vehicle_id?: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'expired' | 'converted'
  subtotal: number
  tax: number
  discount?: number
  total_amount: number
  valid_until: string | null
  description?: string
  notes?: string
  created_at: string
  updated_at: string
  organization_id: string
  customer?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  vehicle?: {
    id: string
    brand: string
    model: string
    license_plate: string
    year?: number
  }
  items?: QuotationItem[]
}

interface UseQuotationsOptions extends Partial<SearchParams> {
  autoLoad?: boolean
  enableCache?: boolean
}

interface UseQuotationsReturn {
  // Data
  quotations: Quotation[]
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
  createQuotation: (data: Partial<Quotation>) => Promise<Quotation>
  updateQuotation: (id: string, data: Partial<Quotation>) => Promise<Quotation>
  deleteQuotation: (id: string) => Promise<boolean>
  
  // Status actions
  approveQuotation: (id: string) => Promise<boolean>
  rejectQuotation: (id: string) => Promise<boolean>
  convertToInvoice: (id: string) => Promise<any>
}

// ==========================================
// HOOK
// ==========================================

export function useQuotations(options: UseQuotationsOptions = {}): UseQuotationsReturn {
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 10,
    search: initialSearch = '',
    filters: initialFilters = {},
    sortBy: initialSortBy = 'created_at',
    sortOrder: initialSortOrder = 'desc',
    autoLoad = true,
    enableCache = false
  } = options

  const { organizationId } = useOrganization()
  
  // State - FORZAR que siempre sea un array
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ Wrapper para setQuotations que SIEMPRE garantiza un array
  const setQuotationsSafe = useCallback((value: Quotation[] | (() => Quotation[])) => {
    try {
      if (typeof value === 'function') {
        const newValue = value()
        const safe = Array.isArray(newValue) ? newValue : []
        setQuotations(safe)
      } else {
        const safe = Array.isArray(value) ? value : []
        setQuotations(safe)
      }
    } catch (err) {
      console.error('❌ [useQuotations] Error en setQuotationsSafe:', err)
      setQuotations([])
    }
  }, [])
  
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
  
  // Cache
  const cacheRef = useRef<Map<string, any>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)

  // ==========================================
  // FETCH FUNCTION
  // ==========================================
  
  const fetchQuotations = useCallback(async () => {
    if (!organizationId) {
      console.log('⏳ [useQuotations] Esperando organizationId...')
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

      const cacheKey = `quotations-${organizationId}-${queryString}`
      
      // Check cache
      if (enableCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)
        console.log('📦 [useQuotations] Usando cache')
        // ✅ Validar que cached.items sea un array
        const cachedItems = Array.isArray(cached?.items) ? cached.items : []
        setQuotationsSafe(cachedItems)
        setPagination(cached?.pagination || {
          page: 1,
          pageSize: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        })
        setLoading(false)
        return
      }

      console.log('🔄 [useQuotations] Fetching:', `/api/quotations?${queryString}`)

      const result = await safeFetch<PaginatedResponse<Quotation>>(
        `/api/quotations?${queryString}`,
        { signal: abortControllerRef.current.signal }
      )

      if (result.success && result.data) {
        // ✅ FIX: Extraer items del objeto paginado
        const items = result.data?.items || result.data || []
        const paginationData = result.data?.pagination || {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }

        setQuotations(items)
        setPagination(paginationData)

        // Cache
        if (enableCache) {
          cacheRef.current.set(cacheKey, { items, pagination: paginationData })
        }

        console.log('✅ [useQuotations] Loaded:', {
          items: items.length,
          page: paginationData.page,
          total: paginationData.total
        })
      } else {
        setError(result.error || 'Error al cargar cotizaciones')
        toast.error('Error al cargar cotizaciones')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('❌ [useQuotations] Error:', err)
        setError(err.message)
        toast.error('Error al cargar cotizaciones')
        // ✅ Resetear a valores por defecto en caso de error
        setQuotationsSafe([])
        setPagination({
          page: 1,
          pageSize: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        })
      }
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, pageSize, search, filters, sortBy, sortOrder, enableCache])

  // Auto-load
  useEffect(() => {
    if (autoLoad) {
      fetchQuotations()
    }
  }, [autoLoad, fetchQuotations])

  // ==========================================
  // NAVIGATION FUNCTIONS
  // ==========================================

  const goToPage = useCallback((newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage)
    }
  }, [pagination])

  const goToNextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      setPage(prev => prev + 1)
    }
  }, [pagination])

  const goToPreviousPage = useCallback(() => {
    if (pagination?.hasPreviousPage) {
      setPage(prev => prev - 1)
    }
  }, [pagination])

  const goToFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  const goToLastPage = useCallback(() => {
    if (pagination?.totalPages) {
      setPage(pagination.totalPages)
    }
  }, [pagination])

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset a primera página
  }, [])

  // ==========================================
  // FILTER FUNCTIONS
  // ==========================================

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch)
    setPage(1) // Reset a primera página
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
    await fetchQuotations()
  }, [fetchQuotations])

  const createQuotation = useCallback(async (data: Partial<Quotation>) => {
    try {
      const result = await safePost<Quotation>('/api/quotations', data)
      
      if (result.success && result.data) {
        toast.success('Cotización creada exitosamente')
        await refresh()
        return result.data
      } else {
        throw new Error(result.error || 'Error al crear cotización')
      }
    } catch (err: any) {
      toast.error('Error al crear cotización')
      throw err
    }
  }, [refresh])

  const updateQuotation = useCallback(async (id: string, data: Partial<Quotation>) => {
    try {
      const result = await safePut<Quotation>(`/api/quotations/${id}`, data)
      
      if (result.success && result.data) {
        toast.success('Cotización actualizada')
        await refresh()
        return result.data
      } else {
        throw new Error(result.error || 'Error al actualizar')
      }
    } catch (err: any) {
      toast.error('Error al actualizar cotización')
      throw err
    }
  }, [refresh])

  const deleteQuotation = useCallback(async (id: string) => {
    try {
      const result = await safeDelete(`/api/quotations/${id}`)
      
      if (result.success) {
        toast.success('Cotización eliminada')
        await refresh()
        return true
      } else {
        throw new Error(result.error || 'Error al eliminar')
      }
    } catch (err: any) {
      toast.error('Error al eliminar cotización')
      throw err
    }
  }, [refresh])

  // ==========================================
  // STATUS ACTIONS
  // ==========================================

  const approveQuotation = useCallback(async (id: string) => {
    try {
      const result = await safePost(`/api/quotations/${id}/approve`, {})
      
      if (result.success) {
        toast.success('Cotización aprobada')
        await refresh()
        return true
      } else {
        throw new Error(result.error || 'Error al aprobar')
      }
    } catch (err: any) {
      toast.error('Error al aprobar cotización')
      return false
    }
  }, [refresh])

  const rejectQuotation = useCallback(async (id: string) => {
    try {
      const result = await safePost(`/api/quotations/${id}/reject`, {})
      
      if (result.success) {
        toast.success('Cotización rechazada')
        await refresh()
        return true
      } else {
        throw new Error(result.error || 'Error al rechazar')
      }
    } catch (err: any) {
      toast.error('Error al rechazar cotización')
      return false
    }
  }, [refresh])

  const convertToInvoice = useCallback(async (id: string) => {
    try {
      const result = await safePost(`/api/quotations/${id}/convert`, {})
      
      if (result.success && result.data) {
        toast.success('Cotización convertida a factura')
        await refresh()
        return result.data
      } else {
        throw new Error(result.error || 'Error al convertir')
      }
    } catch (err: any) {
      toast.error('Error al convertir a factura')
      throw err
    }
  }, [refresh])

  // ==========================================
  // RETURN
  // ==========================================

  // ✅ SOLUCIÓN DEFINITIVA: SIEMPRE retornar array, sin excepciones
  // Usar try-catch para garantizar que NUNCA falle
  let safeQuotations: Quotation[] = []
  try {
    if (Array.isArray(quotations)) {
      safeQuotations = quotations
    } else {
      safeQuotations = []
    }
  } catch (err) {
    console.error('❌ [useQuotations] Error en return, forzando []:', err)
    safeQuotations = []
  }

  return {
    quotations: safeQuotations, // SIEMPRE es un array, NUNCA falla
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
    createQuotation,
    updateQuotation,
    deleteQuotation,
    approveQuotation,
    rejectQuotation,
    convertToInvoice
  }
}
