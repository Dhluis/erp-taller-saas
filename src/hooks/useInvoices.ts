/**
 * useInvoices Hook con Paginación
 * Eagles ERP - Hook para gestión de notas de venta (invoices) con paginación completa
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { safeFetch } from '@/lib/api'
import { useOrganization } from '@/lib/context/SessionContext'
import type { PaginatedResponse } from '@/types/pagination'
import type { SalesInvoice } from '@/lib/supabase/quotations-invoices'

// ==========================================
// TYPES
// ==========================================

interface UseInvoicesOptions {
  page?: number
  pageSize?: number
  status?: string // 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | undefined
  autoLoad?: boolean // Si debe cargar automáticamente al montar
  enableCache?: boolean // Habilitar cache simple
}

interface UseInvoicesReturn {
  // Data
  invoices: SalesInvoice[]
  isLoading: boolean
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
  
  // Actions
  refresh: () => Promise<void>
  mutate: () => Promise<void> // Alias de refresh para compatibilidad con SWR
}

// ==========================================
// HOOK
// ==========================================

export function useInvoices(
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  options: Omit<UseInvoicesOptions, 'page' | 'pageSize' | 'status'> = {}
): UseInvoicesReturn {
  const {
    autoLoad = true,
    enableCache = false
  } = options

  // ==========================================
  // STATE
  // ==========================================
  
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  
  // Context
  const { organizationId, ready } = useOrganization()
  
  // Refs
  const isFetching = useRef(false)
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())

  // ==========================================
  // FETCH FUNCTION
  // ==========================================
  
  const fetchInvoices = useCallback(async () => {
    // Guard: No fetch si no está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useInvoices] Esperando organizationId...')
      setInvoices([])
      setIsLoading(false)
      return
    }

    // Guard: Prevenir fetch múltiples simultáneos
    if (isFetching.current) {
      console.log('⏸️ [useInvoices] Fetch ya en progreso, ignorando...')
      return
    }

    try {
      isFetching.current = true
      setIsLoading(true)
      setError(null)

      // Construir query params (usar parámetros directos)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      if (status) {
        params.set('status', status)
      }

      const url = `/api/invoices?${params.toString()}`
      console.log('🔄 [useInvoices] Fetching:', url)

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url)
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity
        
        // Cache válido por 30 segundos
        if (cached && cacheAge < 30000) {
          console.log('💾 [useInvoices] Usando cache')
          const responseData = cached.data.data || cached.data
          setInvoices(responseData.items || [])
          setPagination(responseData.pagination)
          setIsLoading(false)
          isFetching.current = false
          return
        }
      }

      // Fetch
      const result = await safeFetch<PaginatedResponse<SalesInvoice>>(url, { 
        timeout: 30000,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al cargar notas de venta')
      }

      // Extraer datos de la estructura PaginatedResponse
      const responseData = result.data.data || result.data
      const items = responseData.items || []
      const paginationData = responseData.pagination

      // Actualizar state
      setInvoices(items)
      setPagination(paginationData)

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result.data,
          timestamp: Date.now()
        })
      }

      console.log('✅ [useInvoices] Notas de venta cargadas:', {
        items: items.length,
        page: paginationData.page,
        total: paginationData.total
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al cargar notas de venta', { description: errorMessage })
      console.error('❌ [useInvoices] Error:', err)
    } finally {
      setIsLoading(false)
      isFetching.current = false
    }
  }, [organizationId, ready, page, pageSize, status, enableCache])

  // ==========================================
  // EFFECTS
  // ==========================================

  // Auto-load on mount and when params change
  useEffect(() => {
    if (autoLoad && ready && organizationId) {
      fetchInvoices()
    }
  }, [autoLoad, ready, organizationId, fetchInvoices])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Data
    invoices,
    isLoading,
    error,
    
    // Pagination
    pagination,
    
    // Actions
    refresh: fetchInvoices,
    mutate: fetchInvoices // Alias para compatibilidad con SWR
  }
}

