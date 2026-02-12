/**
 * Pagination Component
 * Eagles System - Componente de paginación completo y reutilizable
 */

'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  loading?: boolean
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showGoToButtons?: boolean
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showGoToButtons = true,
  className = ''
}: PaginationProps) {
  
  // ==========================================
  // HELPERS
  // ==========================================
  
  /**
   * Calcula el rango de items mostrados
   */
  const getDisplayRange = () => {
    if (total === 0) {
      return { start: 0, end: 0 }
    }
    const start = ((currentPage - 1) * pageSize) + 1
    const end = Math.min(currentPage * pageSize, total)
    return { start, end }
  }

  /**
   * Genera los números de página a mostrar
   * Muestra: [1] ... [n-1] [n] [n+1] ... [total]
   */
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Lógica avanzada con "..."
      pages.push(1) // Primera página siempre visible

      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      // Ajustar si estamos cerca del inicio
      if (currentPage <= 3) {
        end = 4
      }
      
      // Ajustar si estamos cerca del final
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3
      }

      // Agregar "..." si hay gap
      if (start > 2) {
        pages.push('...')
      }

      // Páginas del medio
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      // Agregar "..." si hay gap
      if (end < totalPages - 1) {
        pages.push('...')
      }

      // Última página siempre visible
      pages.push(totalPages)
    }

    return pages
  }

  const { start, end } = getDisplayRange()
  const pageNumbers = getPageNumbers()

  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && !loading) {
      onPageChange(page)
    }
  }

  const handlePageSizeChange = (value: string) => {
    if (!loading) {
      onPageSizeChange(Number(value))
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-bg-secondary border-t border-border ${className}`}>
      {/* Left side: Info + Page size selector */}
      <div className="flex items-center gap-4">
        {/* Results info */}
        <div className="text-sm text-muted-foreground">
          {total === 0 ? (
            <span>No hay resultados</span>
          ) : (
            <span>
              Mostrando{' '}
              <span className="font-medium text-text-primary">{start}</span>
              {' '}a{' '}
              <span className="font-medium text-text-primary">{end}</span>
              {' '}de{' '}
              <span className="font-medium text-text-primary">{total}</span>
              {' '}resultados
            </span>
          )}
        </div>

        {/* Page size selector */}
        {showPageSizeSelector && total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
              disabled={loading}
            >
              <SelectTrigger className="w-[110px] h-9 bg-bg-tertiary border-border text-text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-bg-secondary border-border">
                {pageSizeOptions.map(size => (
                  <SelectItem 
                    key={size} 
                    value={size.toString()}
                    className="text-text-primary hover:bg-bg-tertiary"
                  >
                    {size} / página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          {/* Go to first page */}
          {showGoToButtons && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || loading}
              className="h-9 w-9 border-border hover:bg-bg-tertiary"
              title="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="h-9 w-9 border-border hover:bg-bg-tertiary"
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span 
                    key={`ellipsis-${index}`} 
                    className="px-2 text-muted-foreground"
                  >
                    ...
                  </span>
                )
              }

              const pageNumber = page as number
              const isActive = currentPage === pageNumber

              return (
                <Button
                  key={pageNumber}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={loading}
                  className={
                    isActive
                      ? 'h-9 min-w-[36px]'
                      : 'h-9 min-w-[36px] border-border hover:bg-bg-tertiary'
                  }
                >
                  {pageNumber}
                </Button>
              )
            })}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="h-9 w-9 border-border hover:bg-bg-tertiary"
            title="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Go to last page */}
          {showGoToButtons && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="h-9 w-9 border-border hover:bg-bg-tertiary"
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Variante simple de paginación (solo prev/next)
 */
export function SimplePagination({
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  loading = false,
  className = ''
}: {
  hasNextPage: boolean
  hasPreviousPage: boolean
  onNextPage: () => void
  onPreviousPage: () => void
  loading?: boolean
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center gap-2 py-3 ${className}`}>
      <Button
        variant="outline"
        onClick={onPreviousPage}
        disabled={!hasPreviousPage || loading}
        className="border-border hover:bg-bg-tertiary"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Anterior
      </Button>
      
      <Button
        variant="outline"
        onClick={onNextPage}
        disabled={!hasNextPage || loading}
        className="border-border hover:bg-bg-tertiary"
      >
        Siguiente
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}

