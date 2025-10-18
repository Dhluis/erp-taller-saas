/**
 * Componente DataTable Reutilizable
 * Tabla de datos con paginación, búsqueda y filtros
 */

"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'

export interface DataTableColumn<T = any> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  error?: string | null
  searchable?: boolean
  filterable?: boolean
  sortable?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  onPageChange?: (page: number) => void
  onSearch?: (term: string) => void
  onFilter?: (filters: Record<string, any>) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onRefresh?: () => void
  onExport?: () => void
  actions?: {
    view?: (row: T) => void
    edit?: (row: T) => void
    delete?: (row: T) => void
  }
  emptyMessage?: string
  className?: string
}

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  error = null,
  searchable = true,
  filterable = true,
  sortable = true,
  pagination,
  onPageChange,
  onSearch,
  onFilter,
  onSort,
  onRefresh,
  onExport,
  actions,
  emptyMessage = 'No hay datos disponibles',
  className = ''
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filteredData = useMemo(() => {
    let result = [...data]

    // Aplicar búsqueda
    if (searchTerm) {
      result = result.filter(row => {
        return columns.some(column => {
          const value = (row as any)[column.key]
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        })
      })
    }

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row => {
          const rowValue = (row as any)[key]
          return rowValue && rowValue.toString().toLowerCase().includes(value.toLowerCase())
        })
      }
    })

    // Aplicar ordenamiento
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortColumn]
        const bValue = (b as any)[sortColumn]
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchTerm, filters, sortColumn, sortDirection, columns])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    onSearch?.(term)
  }

  const handleSort = (column: string) => {
    if (!sortable) return
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(column)
    setSortDirection(newDirection)
    onSort?.(column, newDirection)
  }

  const handleFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilter?.(newFilters)
  }

  const handlePageChange = (page: number) => {
    onPageChange?.(page)
  }

  const renderCell = (column: DataTableColumn<T>, row: T) => {
    const value = (row as any)[column.key]
    
    if (column.render) {
      return column.render(value, row)
    }
    
    return value?.toString() || '-'
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-2">Error al cargar los datos</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Datos</CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button onClick={onExport} variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Barra de búsqueda y filtros */}
        <div className="flex items-center gap-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {filterable && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={(value) => handleFilter('status', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando datos...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead 
                        key={column.key}
                        className={column.sortable ? 'cursor-pointer hover:bg-muted' : ''}
                        onClick={() => column.sortable && handleSort(column.key)}
                        style={{ width: column.width }}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {column.sortable && sortColumn === column.key && (
                            <span className="text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {actions && (
                      <TableHead className="w-24">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {renderCell(column, row)}
                        </TableCell>
                      ))}
                      {actions && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {actions.view && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => actions.view!(row)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {actions.edit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => actions.edit!(row)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {actions.delete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => actions.delete!(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Paginación */}
            {pagination && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={pagination.page === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
