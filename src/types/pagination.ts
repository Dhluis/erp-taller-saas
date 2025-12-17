/**
 * Types for Pagination System
 * Eagles ERP - Sistema de paginación completo
 */

export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    items: T[]
    pagination: PaginationMeta
  }
  error?: string
}

export interface SearchParams extends PaginationParams {
  search?: string
  filters?: Record<string, any>
}

// Helper type for API responses
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
  statusText?: string
}

/**
 * Helper function to create paginated response
 * Nota: Las funciones de cálculo están en @/lib/utils/pagination
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
  success: boolean = true,
  error?: string
): PaginatedResponse<T> {
  const { generatePaginationMeta } = require('@/lib/utils/pagination')
  
  return {
    success,
    data: {
      items,
      pagination: generatePaginationMeta(page, pageSize, total)
    },
    error
  }
}

