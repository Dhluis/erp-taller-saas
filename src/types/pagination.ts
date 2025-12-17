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
 * Helper function to calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize)
  
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
 * Helper function to calculate offset from page and pageSize
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
  success: boolean = true,
  error?: string
): PaginatedResponse<T> {
  return {
    success,
    data: {
      items,
      pagination: calculatePaginationMeta(page, pageSize, total)
    },
    error
  }
}

