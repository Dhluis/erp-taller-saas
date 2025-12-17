import { useState, useMemo, useCallback } from 'react'

interface UseImagePaginationOptions {
  itemsPerPage?: number
  initialPage?: number
}

interface UseImagePaginationReturn<T> {
  paginatedItems: T[]
  currentPage: number
  totalPages: number
  hasMore: boolean
  showing: number
  total: number
  loadMore: () => void
  reset: () => void
}

/**
 * Hook para paginación de imágenes
 * Muestra itemsPerPage inicialmente, permite cargar más con loadMore()
 */
export function useImagePagination<T>(
  items: T[],
  options: UseImagePaginationOptions = {}
): UseImagePaginationReturn<T> {
  const { itemsPerPage = 6, initialPage = 1 } = options
  const [currentPage, setCurrentPage] = useState(initialPage)

  const paginatedItems = useMemo(() => {
    const endIndex = currentPage * itemsPerPage
    return items.slice(0, endIndex)
  }, [items, currentPage, itemsPerPage])

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const hasMore = currentPage < totalPages
  const showing = paginatedItems.length
  const total = items.length

  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasMore])

  const reset = useCallback(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  return {
    paginatedItems,
    currentPage,
    totalPages,
    hasMore,
    showing,
    total,
    loadMore,
    reset
  }
}

