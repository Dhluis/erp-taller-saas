/**
 * Utilidades de Testing para la Aplicación
 * Proporciona helpers para tests unitarios e integración
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { useAppStore } from '@/lib/store/app-store'

// Mock de Supabase
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        })),
        range: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      order: jest.fn(() => ({
        range: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    }))
  })),
  auth: {
    getUser: jest.fn(() => ({
      data: { user: null },
      error: null
    })),
    onAuthStateChange: jest.fn()
  },
  realtime: {
    on: jest.fn()
  }
}

// Mock de configuración
export const mockConfig = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
  NODE_ENV: 'test',
  LOG_LEVEL: 'error'
}

// Datos de prueba
export const mockCollections = [
  {
    id: '1',
    organization_id: '00000000-0000-0000-0000-000000000000',
    client_id: 'C001',
    invoice_id: 'F001',
    amount: 2500.00,
    collection_date: '2024-01-15',
    payment_method: 'transfer',
    reference: 'REF-001',
    status: 'completed',
    notes: 'Cobro completado',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    organization_id: '00000000-0000-0000-0000-000000000000',
    client_id: 'C002',
    invoice_id: 'F002',
    amount: 1800.00,
    collection_date: '2024-01-16',
    payment_method: 'cash',
    reference: 'REF-002',
    status: 'pending',
    notes: 'Cobro pendiente',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z'
  }
]

export const mockSuppliers = [
  {
    id: '1',
    organization_id: '00000000-0000-0000-0000-000000000000',
    name: 'Proveedor ABC',
    contact_person: 'Juan Pérez',
    email: 'juan@abc.com',
    phone: '555-0001',
    address: 'Calle Principal 123',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
]

// Helper para renderizar con providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Helper para resetear el store
export const resetStore = () => {
  useAppStore.getState().reset()
}

// Helper para mockear datos en el store
export const mockStoreData = (data: {
  collections?: any[]
  suppliers?: any[]
  invoices?: any[]
  stats?: any
}) => {
  const store = useAppStore.getState()
  
  if (data.collections) {
    store.setCollections(data.collections)
  }
  
  if (data.suppliers) {
    store.setSuppliers(data.suppliers)
  }
  
  if (data.invoices) {
    store.setInvoices(data.invoices)
  }
  
  if (data.stats) {
    store.setCollectionsStats(data.stats)
  }
}

// Helper para simular errores
export const mockError = (message: string = 'Test error') => {
  return {
    message,
    code: 'TEST_ERROR',
    details: 'Test error details',
    hint: 'Test error hint'
  }
}

// Helper para simular respuestas de Supabase
export const mockSupabaseResponse = (data: any = null, error: any = null) => ({
  data,
  error,
  count: data ? data.length : 0
})

// Helper para simular delays
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper para simular operaciones async
export const mockAsyncOperation = async <T>(
  data: T,
  delay: number = 100,
  shouldError: boolean = false
): Promise<T> => {
  await new Promise(resolve => setTimeout(resolve, delay))
  
  if (shouldError) {
    throw new Error('Mock error')
  }
  
  return data
}

// Helper para validar esquemas
export const validateSchema = (schema: any, data: any) => {
  try {
    const result = schema.safeParse(data)
    return {
      valid: result.success,
      errors: result.success ? [] : result.error.errors
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error]
    }
  }
}

// Helper para simular autenticación
export const mockAuth = (user: any = null) => {
  const store = useAppStore.getState()
  store.setUser(user)
  store.setAuthLoading(false)
}

// Helper para simular estados de carga
export const mockLoading = (loading: boolean = true) => {
  const store = useAppStore.getState()
  store.setLoading(loading)
}

// Helper para simular notificaciones
export const mockNotification = (type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  const store = useAppStore.getState()
  store.addNotification({
    type,
    title: `Test ${type}`,
    message: `Test ${type} message`,
    autoClose: true
  })
}

// Helper para limpiar mocks
export const clearMocks = () => {
  jest.clearAllMocks()
  resetStore()
}

// Helper para setup de tests
export const setupTest = () => {
  // Limpiar mocks
  clearMocks()
  
  // Mockear configuración
  Object.assign(process.env, mockConfig)
  
  // Mockear Supabase
  jest.mock('@/lib/core/supabase', () => ({
    getBrowserClient: () => mockSupabaseClient,
    getServerClient: () => mockSupabaseClient
  }))
}

// Helper para teardown de tests
export const teardownTest = () => {
  clearMocks()
  jest.restoreAllMocks()
}

// Exportar render personalizado
export * from '@testing-library/react'
export { customRender as render }
