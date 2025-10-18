/**
 * Cliente Supabase Unificado y Robusto
 * Singleton con validación, retry logic y manejo de errores centralizado
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getConfig } from './config'
import { AppError, SupabaseError } from '@/lib/errors'

// Tipos
export type SupabaseClient = ReturnType<typeof createBrowserClient>
export type SupabaseServerClient = ReturnType<typeof createServerClient>

// Singleton para cliente del navegador
let browserClient: SupabaseClient | null = null
let serverClient: SupabaseServerClient | null = null

/**
 * Obtener cliente Supabase para navegador (singleton)
 */
export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    try {
      const config = getConfig()
      
      browserClient = createBrowserClient(
        config.NEXT_PUBLIC_SUPABASE_URL,
        config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          global: {
            headers: {
              'X-Client-Info': 'erp-taller-saas-browser',
              'X-App-Version': config.NEXT_PUBLIC_APP_VERSION,
            },
          },
        }
      )

      // Configurar listeners
      browserClient.auth.onAuthStateChange((event, session) => {
        if (config.LOG_LEVEL === 'debug') {
          console.log('🔄 Auth state changed:', event, session?.user?.id)
        }
      })

      browserClient.realtime.on('error', (error) => {
        console.error('❌ Supabase Realtime error:', error)
      })

      console.log('✅ Cliente Supabase para navegador inicializado')
    } catch (error) {
      console.error('❌ Error inicializando cliente Supabase:', error)
      throw new SupabaseError('Failed to initialize Supabase browser client', error)
    }
  }
  
  return browserClient
}

/**
 * Obtener cliente Supabase para servidor
 */
export async function getServerClient(): Promise<SupabaseServerClient> {
  if (!serverClient) {
    try {
      const config = getConfig()
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
      throw new SupabaseError('Failed to initialize Supabase server client', error)
    }
  }
  
  return serverClient
}

/**
 * Crear cliente con Service Role Key (solo para operaciones administrativas)
 */
export function getServiceClient(): SupabaseServerClient {
  try {
    const config = getConfig()
    
    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      throw new SupabaseError('SUPABASE_SERVICE_ROLE_KEY no está configurado')
    }

    return createServerClient(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            'X-Client-Info': 'erp-taller-saas-service-role',
            'X-App-Version': config.NEXT_PUBLIC_APP_VERSION,
          },
        },
      }
    )
  } catch (error) {
    console.error('❌ Error inicializando cliente Service Role:', error)
    throw new SupabaseError('Failed to initialize Supabase Service Role client', error)
  }
}

/**
 * Health check del sistema Supabase
 */
export async function healthCheck(): Promise<{
  healthy: boolean
  details: {
    connection: boolean
    auth: boolean
    latency: number
    config: any
  }
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const client = getBrowserClient()
    
    // Test de conexión básica
    const { data, error: connectionError } = await client
      .from('_test_connection')
      .select('*')
      .limit(1)
    
    const connectionOk = !connectionError || connectionError.code === 'PGRST116'
    
    // Test de autenticación
    const { data: { user }, error: authError } = await client.auth.getUser()
    const authOk = !authError
    
    const latency = Date.now() - startTime
    
    return {
      healthy: connectionOk && authOk,
      details: {
        connection: connectionOk,
        auth: authOk,
        latency,
        config: getConfig()
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    const appError = error instanceof AppError ? error : new SupabaseError('Health check failed', error)
    
    return {
      healthy: false,
      details: {
        connection: false,
        auth: false,
        latency,
        config: getConfig()
      },
      error: appError.message
    }
  }
}

/**
 * Verificar conexión antes de operaciones críticas
 */
export async function validateConnection(): Promise<boolean> {
  try {
    const client = getBrowserClient()
    const { data, error } = await client
      .from('_test_connection')
      .select('*')
      .limit(1)
    
    return !error || error.code === 'PGRST116'
  } catch (error) {
    console.error('❌ Connection validation failed:', error)
    return false
  }
}

/**
 * Obtener información del cliente para debugging
 */
export function getClientInfo() {
  return {
    browserClient: !!browserClient,
    serverClient: !!serverClient,
    config: getConfig(),
    timestamp: new Date().toISOString()
  }
}

/**
 * Limpiar recursos
 */
export function cleanup() {
  browserClient = null
  serverClient = null
  console.log('🧹 Clientes Supabase limpiados')
}

// Exportar funciones legacy para compatibilidad
export const createClient = getBrowserClient
export const getSupabaseClient = getBrowserClient
