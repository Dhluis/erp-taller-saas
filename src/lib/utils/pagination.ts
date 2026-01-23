/**
 * Pagination Utilities
 * Eagles ERP - Funciones helper para paginación
 */

import { PaginationParams, PaginationMeta } from '@/types/pagination'

/**
 * Calcula el offset para queries SQL basado en página y tamaño
 * @example calculateOffset(2, 20) // returns 20 (página 2, 20 items por página)
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Calcula el total de páginas
 * @example calculateTotalPages(95, 20) // returns 5
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  if (total === 0) return 0
  return Math.ceil(total / pageSize)
}

/**
 * Genera metadata de paginación completa
 */
export function generatePaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = calculateTotalPages(total, pageSize)
  
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}

/**
 * Valida y normaliza parámetros de paginación
 * Asegura que los valores estén en rangos seguros
 */
export function validatePaginationParams(
  page?: string | number,
  pageSize?: string | number
): PaginationParams {
  // Parse page
  let parsedPage = 1
  if (typeof page === 'string') {
    parsedPage = parseInt(page, 10)
  } else if (typeof page === 'number') {
    parsedPage = page
  }
  
  // Parse pageSize
  let parsedPageSize = 20
  if (typeof pageSize === 'string') {
    parsedPageSize = parseInt(pageSize, 10)
  } else if (typeof pageSize === 'number') {
    parsedPageSize = pageSize
  }
  
  return {
    page: Math.max(1, isNaN(parsedPage) ? 1 : parsedPage),
    pageSize: Math.min(100, Math.max(1, isNaN(parsedPageSize) ? 20 : parsedPageSize))
  }
}

/**
 * Extrae parámetros de paginación de una URL
 */
export function extractPaginationFromURL(url: URL): PaginationParams & { sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  const searchParams = url.searchParams
  
  const params = validatePaginationParams(
    searchParams.get('page') || undefined,
    searchParams.get('pageSize') || undefined
  )
  
  const sortBy = searchParams.get('sortBy') || undefined
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined
  
  return {
    ...params,
    sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined
  }
}

/**
 * Construye query string de paginación
 */
export function buildPaginationQueryString(params: Partial<PaginationParams & { search?: string; filters?: Record<string, any> }>): string {
  const searchParams = new URLSearchParams()
  
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  if (params.search) searchParams.set('search', params.search)
  
  // Agregar filtros
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // ✅ FIX: Agregar filtros comunes directamente sin prefijo filter_
        // Esto mantiene compatibilidad con APIs que esperan parámetros directos
        if (key === 'status' || key === 'customer_id' || key === 'vehicle_id') {
          searchParams.set(key, value.toString())
        } else {
          searchParams.set(`filter_${key}`, value.toString())
        }
      }
    })
  }
  
  return searchParams.toString()
}

/**
 * Obtiene el rango de items mostrados
 * @example getDisplayRange(2, 20, 95) // returns "21 a 40 de 95"
 */
export function getDisplayRange(page: number, pageSize: number, total: number): {
  start: number
  end: number
  total: number
  text: string
} {
  if (total === 0) {
    return {
      start: 0,
      end: 0,
      total: 0,
      text: 'No hay resultados'
    }
  }
  
  const start = ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, total)
  
  return {
    start,
    end,
    total,
    text: `${start} a ${end} de ${total}`
  }
}

