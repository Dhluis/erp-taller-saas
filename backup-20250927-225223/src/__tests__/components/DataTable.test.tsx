/**
 * Tests de Componente DataTable
 */

import { render, screen, fireEvent, waitFor } from '@/lib/testing/test-utils'
import { DataTable } from '@/components/ui/DataTable'
import { mockData } from '@/lib/testing/test-utils'

describe('DataTable Component', () => {
  const mockData = [
    { id: 1, name: 'Juan Pérez', email: 'juan@email.com', phone: '5551234567', status: 'active' },
    { id: 2, name: 'María García', email: 'maria@email.com', phone: '5559876543', status: 'inactive' },
    { id: 3, name: 'Carlos López', email: 'carlos@email.com', phone: '5555555555', status: 'active' }
  ]

  const mockColumns = [
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Teléfono', sortable: true },
    { key: 'status', label: 'Estado', sortable: true }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar la tabla con datos', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
        filterable={true}
        sortable={true}
      />
    )

    // Verificar que los datos se muestran
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
    expect(screen.getByText('Carlos López')).toBeInTheDocument()
  })

  it('debe mostrar barra de búsqueda cuando searchable es true', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    )

    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
  })

  it('debe filtrar datos cuando se busca', async () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    )

    const searchInput = screen.getByPlaceholderText('Buscar...')
    fireEvent.change(searchInput, { target: { value: 'Juan' } })

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.queryByText('María García')).not.toBeInTheDocument()
    })
  })

  it('debe mostrar filtros cuando filterable es true', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        filterable={true}
      />
    )

    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('debe permitir ordenamiento cuando sortable es true', async () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        sortable={true}
      />
    )

    const nameHeader = screen.getByText('Nombre')
    fireEvent.click(nameHeader)

    // Verificar que se aplica el ordenamiento
    await waitFor(() => {
      expect(nameHeader).toHaveClass('cursor-pointer')
    })
  })

  it('debe mostrar acciones cuando se proporcionan', () => {
    const mockActions = {
      view: jest.fn(),
      edit: jest.fn(),
      delete: jest.fn()
    }

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        actions={mockActions}
      />
    )

    // Verificar que la columna de acciones se muestra
    expect(screen.getByText('Acciones')).toBeInTheDocument()
  })

  it('debe mostrar estado de carga', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    )

    expect(screen.getByText('Cargando datos...')).toBeInTheDocument()
  })

  it('debe mostrar error cuando se proporciona', () => {
    const mockError = 'Error al cargar los datos'
    
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        error={mockError}
      />
    )

    expect(screen.getByText('Error al cargar los datos')).toBeInTheDocument()
    expect(screen.getByText(mockError)).toBeInTheDocument()
  })

  it('debe mostrar mensaje cuando no hay datos', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No hay datos disponibles"
      />
    )

    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
  })

  it('debe mostrar paginación cuando se proporciona', () => {
    const mockPagination = {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    }

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
      />
    )

    expect(screen.getByText('Mostrando 1 a 10 de 25 resultados')).toBeInTheDocument()
    expect(screen.getByText('Siguiente')).toBeInTheDocument()
  })

  it('debe llamar onPageChange cuando se cambia de página', async () => {
    const mockOnPageChange = jest.fn()
    const mockPagination = {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    }

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
      />
    )

    const nextButton = screen.getByText('Siguiente')
    fireEvent.click(nextButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(2)
  })

  it('debe llamar onSearch cuando se busca', async () => {
    const mockOnSearch = jest.fn()

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
        onSearch={mockOnSearch}
      />
    )

    const searchInput = screen.getByPlaceholderText('Buscar...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test')
    })
  })

  it('debe llamar onSort cuando se ordena', async () => {
    const mockOnSort = jest.fn()

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        sortable={true}
        onSort={mockOnSort}
      />
    )

    const nameHeader = screen.getByText('Nombre')
    fireEvent.click(nameHeader)

    await waitFor(() => {
      expect(mockOnSort).toHaveBeenCalledWith('name', 'asc')
    })
  })

  it('debe renderizar columnas personalizadas', () => {
    const customColumns = [
      { 
        key: 'name', 
        label: 'Nombre', 
        render: (value: string) => <strong>{value}</strong>
      },
      { 
        key: 'status', 
        label: 'Estado', 
        render: (value: string) => (
          <span className={value === 'active' ? 'text-green-500' : 'text-red-500'}>
            {value}
          </span>
        )
      }
    ]

    render(
      <DataTable
        data={mockData}
        columns={customColumns}
      />
    )

    // Verificar que las columnas personalizadas se renderizan
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })
})
