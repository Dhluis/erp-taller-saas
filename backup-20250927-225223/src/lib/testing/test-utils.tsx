/**
 * Utilidades de Testing
 * Herramientas para testing de componentes y servicios
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

// Mock de Supabase
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
        order: jest.fn(() => ({ data: [], error: null })),
        range: jest.fn(() => ({ data: [], error: null, count: 0 }))
      })),
      order: jest.fn(() => ({ data: [], error: null })),
      range: jest.fn(() => ({ data: [], error: null, count: 0 }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({ data: null, error: null }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({ data: null, error: null }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({ error: null }))
    }))
  }))
}

// Mock de configuración
jest.mock('@/lib/config', () => ({
  config: {
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-key'
    }
  },
  validateConfig: jest.fn(() => true)
}))

// Mock de cliente Supabase
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient),
  testSupabaseConnection: jest.fn(() => Promise.resolve(true))
}))

// Mock de errores
jest.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AppError'
    }
  },
  ConfigurationError: class ConfigurationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ConfigurationError'
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  }
}))

// Wrapper personalizado para testing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Datos de prueba
export const mockData = {
  customers: [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@email.com',
      phone: '5551234567',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      organization_id: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria@email.com',
      phone: '5559876543',
      status: 'inactive',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      organization_id: '00000000-0000-0000-0000-000000000000'
    }
  ],
  collections: [
    {
      id: '1',
      client_id: 'C001',
      invoice_id: 'F001',
      amount: 1000,
      collection_date: '2024-01-01',
      payment_method: 'transfer',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      organization_id: '00000000-0000-0000-0000-000000000000'
    }
  ],
  suppliers: [
    {
      id: '1',
      name: 'Proveedor ABC',
      contact_person: 'Carlos López',
      email: 'carlos@proveedor.com',
      phone: '5551111111',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      organization_id: '00000000-0000-0000-0000-000000000000'
    }
  ]
}

// Utilidades de testing
export const testUtils = {
  // Simular delay
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generar datos de prueba
  generateMockData: (count: number, type: string) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}`,
      name: `${type} ${i + 1}`,
      email: `${type.toLowerCase()}${i + 1}@email.com`,
      phone: `555${String(i + 1).padStart(7, '0')}`,
      status: i % 2 === 0 ? 'active' : 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: '00000000-0000-0000-0000-000000000000'
    }))
  },
  
  // Simular error de API
  simulateApiError: (error: string) => {
    mockSupabaseClient.from().select().eq().single.mockReturnValue({
      data: null,
      error: { message: error }
    })
  },
  
  // Simular respuesta exitosa
  simulateApiSuccess: (data: any) => {
    mockSupabaseClient.from().select().eq().single.mockReturnValue({
      data,
      error: null
    })
  },
  
  // Limpiar mocks
  clearMocks: () => {
    jest.clearAllMocks()
  }
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
