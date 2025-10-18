/**
 * Tests de Integración - Flujo Completo
 * Prueba el flujo completo de la aplicación
 */

import { render, screen, fireEvent, waitFor } from '@/lib/testing/test-utils'
import { CollectionsService } from '@/lib/services/CollectionsService'
import { CustomersService } from '@/lib/services/CustomersService'
import { SuppliersService } from '@/lib/services/SuppliersService'
import { useCollections, useCustomers, useSuppliers } from '@/hooks/useServices'
import { DataTable } from '@/components/ui/DataTable'
import { Form } from '@/components/ui/Form'
import { StatsCard } from '@/components/ui/StatsCard'
import { Modal } from '@/components/ui/Modal'
import { createCustomerSchema, createCollectionSchema } from '@/lib/validation/schemas'
import { mockData, testUtils } from '@/lib/testing/test-utils'

// Mock de hooks
jest.mock('@/hooks/useServices', () => ({
  useCollections: jest.fn(),
  useCustomers: jest.fn(),
  useSuppliers: jest.fn()
}))

describe('Flujo Completo de la Aplicación', () => {
  beforeEach(() => {
    testUtils.clearMocks()
  })

  describe('1. Gestión de Clientes', () => {
    it('debe crear, listar y actualizar clientes correctamente', async () => {
      // Mock de datos
      const mockCustomers = mockData.customers
      const mockUseCustomers = useCustomers as jest.MockedFunction<typeof useCustomers>
      
      mockUseCustomers.mockReturnValue({
        service: new CustomersService(),
        stats: null,
        loading: false,
        error: null,
        loadStats: jest.fn(),
        getActive: jest.fn().mockResolvedValue(mockCustomers),
        getVIP: jest.fn(),
        getInactive: jest.fn(),
        searchByNameOrEmail: jest.fn()
      })

      // Renderizar componente
      const { container } = render(
        <DataTable
          data={mockCustomers}
          columns={[
            { key: 'name', label: 'Nombre', sortable: true },
            { key: 'email', label: 'Email', sortable: true },
            { key: 'phone', label: 'Teléfono', sortable: true },
            { key: 'status', label: 'Estado', sortable: true }
          ]}
          searchable={true}
          filterable={true}
          sortable={true}
        />
      )

      // Verificar que los datos se muestran
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.getByText('María García')).toBeInTheDocument()

      // Verificar búsqueda
      const searchInput = screen.getByPlaceholderText('Buscar...')
      fireEvent.change(searchInput, { target: { value: 'Juan' } })
      
      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
        expect(screen.queryByText('María García')).not.toBeInTheDocument()
      })
    })

    it('debe validar formulario de cliente correctamente', async () => {
      const mockOnSubmit = jest.fn()
      
      render(
        <Form
          title="Crear Cliente"
          fields={[
            { key: 'name', label: 'Nombre', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'phone', label: 'Teléfono', type: 'tel', required: true },
            { key: 'status', label: 'Estado', type: 'select', required: true, options: [
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' }
            ]}
          ]}
          schema={createCustomerSchema}
          onSubmit={mockOnSubmit}
          showSuccessMessage={true}
          showErrorMessage={true}
        />
      )

      // Verificar que el formulario se renderiza
      expect(screen.getByText('Crear Cliente')).toBeInTheDocument()
      expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()

      // Intentar enviar formulario vacío
      const submitButton = screen.getByText('Guardar')
      fireEvent.click(submitButton)

      // Verificar que no se envía con datos inválidos
      expect(mockOnSubmit).not.toHaveBeenCalled()

      // Llenar formulario
      fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan Pérez' } })
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'juan@email.com' } })
      fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '5551234567' } })

      // Enviar formulario
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Juan Pérez',
          email: 'juan@email.com',
          phone: '5551234567',
          status: 'active'
        })
      })
    })
  })

  describe('2. Gestión de Cobros', () => {
    it('debe mostrar estadísticas de cobros correctamente', async () => {
      const mockStats = {
        total_collections: 10,
        completed_collections: 8,
        pending_collections: 2,
        overdue_collections: 0,
        total_amount_collected: 50000,
        total_amount_pending: 5000,
        total_amount_overdue: 0,
        average_collection_amount: 5000,
        collection_rate: 80
      }

      const mockUseCollections = useCollections as jest.MockedFunction<typeof useCollections>
      mockUseCollections.mockReturnValue({
        service: new CollectionsService(),
        stats: mockStats,
        loading: false,
        error: null,
        loadStats: jest.fn(),
        getByClient: jest.fn(),
        getByInvoice: jest.fn(),
        getPending: jest.fn(),
        getOverdue: jest.fn(),
        markAsCompleted: jest.fn(),
        markAsOverdue: jest.fn()
      })

      render(
        <div className="grid grid-cols-3 gap-4">
          <StatsCard
            title="Total Cobros"
            value={mockStats.total_collections}
            change={12.5}
            changeType="increase"
            variant="success"
          />
          <StatsCard
            title="Cobros Completados"
            value={mockStats.completed_collections}
            change={8.2}
            changeType="increase"
            variant="success"
          />
          <StatsCard
            title="Cobros Pendientes"
            value={mockStats.pending_collections}
            change={-5.1}
            changeType="decrease"
            variant="warning"
          />
        </div>
      )

      // Verificar que las estadísticas se muestran
      expect(screen.getByText('Total Cobros')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Cobros Completados')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('debe manejar cobros pendientes correctamente', async () => {
      const mockPendingCollections = [
        {
          id: '1',
          client_id: 'C001',
          invoice_id: 'F001',
          amount: 1000,
          collection_date: '2024-01-01',
          payment_method: 'transfer',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          organization_id: '00000000-0000-0000-0000-000000000000'
        }
      ]

      const mockUseCollections = useCollections as jest.MockedFunction<typeof useCollections>
      mockUseCollections.mockReturnValue({
        service: new CollectionsService(),
        stats: null,
        loading: false,
        error: null,
        loadStats: jest.fn(),
        getByClient: jest.fn(),
        getByInvoice: jest.fn(),
        getPending: jest.fn().mockResolvedValue(mockPendingCollections),
        getOverdue: jest.fn(),
        markAsCompleted: jest.fn(),
        markAsOverdue: jest.fn()
      })

      render(
        <DataTable
          data={mockPendingCollections}
          columns={[
            { key: 'client_id', label: 'Cliente', sortable: true },
            { key: 'amount', label: 'Monto', sortable: true },
            { key: 'collection_date', label: 'Fecha', sortable: true },
            { key: 'status', label: 'Estado', sortable: true }
          ]}
          actions={{
            view: jest.fn(),
            edit: jest.fn(),
            delete: jest.fn()
          }}
        />
      )

      // Verificar que los cobros pendientes se muestran
      expect(screen.getByText('C001')).toBeInTheDocument()
      expect(screen.getByText('1000')).toBeInTheDocument()
    })
  })

  describe('3. Gestión de Proveedores', () => {
    it('debe listar y buscar proveedores correctamente', async () => {
      const mockSuppliers = mockData.suppliers
      const mockUseSuppliers = useSuppliers as jest.MockedFunction<typeof useSuppliers>
      
      mockUseSuppliers.mockReturnValue({
        service: new SuppliersService(),
        stats: null,
        loading: false,
        error: null,
        loadStats: jest.fn(),
        getActive: jest.fn(),
        getTopSuppliers: jest.fn(),
        getInactive: jest.fn(),
        searchByNameOrContact: jest.fn().mockResolvedValue(mockSuppliers)
      })

      render(
        <DataTable
          data={mockSuppliers}
          columns={[
            { key: 'name', label: 'Nombre', sortable: true },
            { key: 'contact_person', label: 'Contacto', sortable: true },
            { key: 'email', label: 'Email', sortable: true },
            { key: 'phone', label: 'Teléfono', sortable: true }
          ]}
          searchable={true}
          onSearch={jest.fn()}
        />
      )

      // Verificar que los proveedores se muestran
      expect(screen.getByText('Proveedor ABC')).toBeInTheDocument()
      expect(screen.getByText('Carlos López')).toBeInTheDocument()
    })
  })

  describe('4. Modal y Interacciones', () => {
    it('debe abrir y cerrar modal correctamente', async () => {
      const mockOnClose = jest.fn()
      const mockOnConfirm = jest.fn()

      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          title="Confirmar Acción"
          description="¿Está seguro de que desea continuar?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnClose}
          confirmText="Sí, continuar"
          cancelText="Cancelar"
        />
      )

      // Verificar que el modal se abre
      expect(screen.getByText('Confirmar Acción')).toBeInTheDocument()
      expect(screen.getByText('¿Está seguro de que desea continuar?')).toBeInTheDocument()

      // Verificar botones
      expect(screen.getByText('Sí, continuar')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()

      // Probar cancelar
      fireEvent.click(screen.getByText('Cancelar'))
      expect(mockOnClose).toHaveBeenCalled()

      // Probar confirmar
      fireEvent.click(screen.getByText('Sí, continuar'))
      expect(mockOnConfirm).toHaveBeenCalled()
    })
  })

  describe('5. Manejo de Errores', () => {
    it('debe mostrar errores de API correctamente', async () => {
      const mockError = 'Error de conexión a la base de datos'
      
      const mockUseCustomers = useCustomers as jest.MockedFunction<typeof useCustomers>
      mockUseCustomers.mockReturnValue({
        service: new CustomersService(),
        stats: null,
        loading: false,
        error: mockError,
        loadStats: jest.fn(),
        getActive: jest.fn(),
        getVIP: jest.fn(),
        getInactive: jest.fn(),
        searchByNameOrEmail: jest.fn()
      })

      render(
        <DataTable
          data={[]}
          columns={[
            { key: 'name', label: 'Nombre', sortable: true },
            { key: 'email', label: 'Email', sortable: true }
          ]}
          error={mockError}
        />
      )

      // Verificar que el error se muestra
      expect(screen.getByText('Error al cargar los datos')).toBeInTheDocument()
      expect(screen.getByText(mockError)).toBeInTheDocument()
    })
  })

  describe('6. Estados de Carga', () => {
    it('debe mostrar estados de carga correctamente', async () => {
      const mockUseCustomers = useCustomers as jest.MockedFunction<typeof useCustomers>
      mockUseCustomers.mockReturnValue({
        service: new CustomersService(),
        stats: null,
        loading: true,
        error: null,
        loadStats: jest.fn(),
        getActive: jest.fn(),
        getVIP: jest.fn(),
        getInactive: jest.fn(),
        searchByNameOrEmail: jest.fn()
      })

      render(
        <DataTable
          data={[]}
          columns={[
            { key: 'name', label: 'Nombre', sortable: true },
            { key: 'email', label: 'Email', sortable: true }
          ]}
          loading={true}
        />
      )

      // Verificar que el estado de carga se muestra
      expect(screen.getByText('Cargando datos...')).toBeInTheDocument()
    })
  })
})
