/**
 * Cliente Supabase para Servidor
 * Separado para evitar problemas con next/headers en el cliente
 */

import { createServerClient } from '@supabase/ssr'
import { getConfig } from './config'

// Tipos
export type SupabaseServerClient = ReturnType<typeof createServerClient>

// Singleton para cliente del servidor
let serverClient: SupabaseServerClient | null = null

/**
 * Obtener cliente Supabase para servidor
 */
export async function getServerClient(): Promise<SupabaseServerClient> {
  if (!serverClient) {
    try {
      const config = getConfig()
      
      // Importar cookies dinámicamente solo en el servidor
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()

      serverClient = createServerClient(
        config.NEXT_PUBLIC_SUPABASE_URL,
        config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch (error) {
                // Server Component no puede setear cookies directamente
                if (config.LOG_LEVEL === 'debug') {
                  console.warn('⚠️ Intento de setear cookies en Server Component ignorado:', error)
                }
              }
            },
          },
          global: {
            headers: {
              'X-Client-Info': 'erp-taller-saas-server',
              'X-App-Version': config.NEXT_PUBLIC_APP_VERSION,
            },
          },
        }
      )

      console.log('✅ Cliente Supabase para servidor inicializado')
    } catch (error) {
      console.error('❌ Error inicializando cliente Supabase para servidor:', error)
      throw new Error('Failed to initialize Supabase server client')
    }
  }
  
  return serverClient
}

/**
 * Crear cliente con Service Role Key (solo para operaciones administrativas)
 */
export function getServiceClient(): SupabaseServerClient {
  const config = getConfig()
  
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Service client cannot be initialized.')
  }

  return createServerClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: {
        headers: {
          'X-Client-Info': 'erp-taller-saas-service',
          'X-App-Version': config.NEXT_PUBLIC_APP_VERSION,
        },
      },
    }
  )
}







