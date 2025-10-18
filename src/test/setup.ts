/**
 * Configuración de Testing
 * Setup para Vitest y React Testing Library
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de Supabase
vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn()
    },
    realtime: {
      on: vi.fn()
    }
  })),
  getServerClient: vi.fn(() => Promise.resolve({})),
  getServiceClient: vi.fn(() => ({}))
}))

// Mock de configuración
vi.mock('../lib/core/config', () => ({
  getConfig: vi.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    ENABLE_DETAILED_LOGGING: false
  })),
  validateConfig: vi.fn(() => ({
    valid: true,
    errors: []
  }))
}))

// Mock de Next.js
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/')
}))

// Mock de Next.js headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn()
  }))
}))

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Limpiar mocks después de cada test
afterEach(() => {
  vi.clearAllMocks()
})
