/**
 * Hooks de Servicios
 * Proporciona hooks para usar los servicios de datos en componentes
 */

import { useState, useEffect, useCallback } from 'react'
import { useErrorHandler } from '@/lib/utils/error-handler'
import { BaseEntity, PaginationParams, SearchFilters, PaginatedResponse } from '@/types/base'
import { CollectionsService, CollectionsService as CollectionsServiceType } from '@/lib/services/CollectionsService'
import { CustomersService, CustomersService as CustomersServiceType } from '@/lib/services/CustomersService'
import { SuppliersService, SuppliersService as SuppliersServiceType } from '@/lib/services/SuppliersService'

/**
 * Hook base para servicios de datos
 */
export function useService<T extends BaseEntity>(
  service: any,
  initialData: T[] = []
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handleAsyncError } = useErrorHandler()

  const loadData = useCallback(async (filters?: SearchFilters) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getAll(filters)
      })
      
      if (result) {
        setData(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const create = useCallback(async (data: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.create(data)
      })
      
      if (result) {
        setData(prev => [result, ...prev])
      }
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const update = useCallback(async (id: string, data: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.update(id, data)
      })
      
      if (result) {
        setData(prev => prev.map(item => item.id === id ? result : item))
      }
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const remove = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await handleAsyncError(async () => {
        return await service.delete(id)
      })
      
      setData(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getById(id)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const search = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.search(term)
      })
      
      if (result) {
        setData(result)
      }
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const refresh = useCallback(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    loadData,
    create,
    update,
    remove,
    getById,
    search,
    refresh
  }
}

/**
 * Hook para servicios con paginación
 */
export function usePaginatedService<T extends BaseEntity>(
  service: any,
  initialParams: PaginationParams & SearchFilters = {}
) {
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState<PaginatedResponse<T>['pagination']>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handleAsyncError } = useErrorHandler()

  const loadData = useCallback(async (params: PaginationParams & SearchFilters = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getPaginated(params)
      })
      
      if (result) {
        setData(result.data)
        setPagination(result.pagination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      loadData({ ...initialParams, page: pagination.page + 1 })
    }
  }, [pagination, loadData, initialParams])

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      loadData({ ...initialParams, page: pagination.page - 1 })
    }
  }, [pagination, loadData, initialParams])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadData({ ...initialParams, page })
    }
  }, [pagination, loadData, initialParams])

  const refresh = useCallback(() => {
    loadData(initialParams)
  }, [loadData, initialParams])

  return {
    data,
    pagination,
    loading,
    error,
    loadData,
    nextPage,
    prevPage,
    goToPage,
    refresh
  }
}

/**
 * Hook específico para Collections
 */
export function useCollections() {
  const [service] = useState(() => new CollectionsService())
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handleAsyncError } = useErrorHandler()

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getStats()
      })
      
      if (result) {
        setStats(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getByClient = useCallback(async (clientId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getByClient(clientId)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getByInvoice = useCallback(async (invoiceId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getByInvoice(invoiceId)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getPending()
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getOverdue = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getOverdue()
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const markAsCompleted = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.markAsCompleted(id)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const markAsOverdue = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.markAsOverdue(id)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  return {
    service,
    stats,
    loading,
    error,
    loadStats,
    getByClient,
    getByInvoice,
    getPending,
    getOverdue,
    markAsCompleted,
    markAsOverdue
  }
}

/**
 * Hook específico para Customers
 */
export function useCustomers() {
  const [service] = useState(() => new CustomersService())
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handleAsyncError } = useErrorHandler()

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getStats()
      })
      
      if (result) {
        setStats(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getActive = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getActive()
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getVIP = useCallback(async (threshold: number = 10000) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getVIP(threshold)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getInactive = useCallback(async (months: number = 6) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getInactive(months)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const searchByNameOrEmail = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.searchByNameOrEmail(term)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  return {
    service,
    stats,
    loading,
    error,
    loadStats,
    getActive,
    getVIP,
    getInactive,
    searchByNameOrEmail
  }
}

/**
 * Hook específico para Suppliers
 */
export function useSuppliers() {
  const [service] = useState(() => new SuppliersService())
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handleAsyncError } = useErrorHandler()

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getStats()
      })
      
      if (result) {
        setStats(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getActive = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getActive()
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getTopSuppliers = useCallback(async (threshold: number = 5000) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getTopSuppliers(threshold)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const getInactive = useCallback(async (months: number = 6) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.getInactive(months)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  const searchByNameOrContact = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleAsyncError(async () => {
        return await service.searchByNameOrContact(term)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [service, handleAsyncError])

  return {
    service,
    stats,
    loading,
    error,
    loadStats,
    getActive,
    getTopSuppliers,
    getInactive,
    searchByNameOrContact
  }
}

/**
 * Hook para estadísticas generales
 */
export function useGeneralStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handleAsyncError } = useErrorHandler()

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [collectionsService, customersService, suppliersService] = [
        new CollectionsService(),
        new CustomersService(),
        new SuppliersService()
      ]
      
      const [collectionsStats, customersStats, suppliersStats] = await Promise.all([
        handleAsyncError(async () => await collectionsService.getStats()),
        handleAsyncError(async () => await customersService.getStats()),
        handleAsyncError(async () => await suppliersService.getStats())
      ])
      
      if (collectionsStats && customersStats && suppliersStats) {
        setStats({
          collections: collectionsStats,
          customers: customersStats,
          suppliers: suppliersStats
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [handleAsyncError])

  return {
    stats,
    loading,
    error,
    loadStats
  }
}
