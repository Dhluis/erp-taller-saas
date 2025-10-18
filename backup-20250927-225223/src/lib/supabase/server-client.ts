/**
 * Cliente Supabase para Server Components
 * Solo para uso en Server Components y API routes
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { config, validateConfig } from '@/lib/config'
import { ConfigurationError, SupabaseError, handleError } from '@/lib/errors'

// Tipos para el cliente del servidor
export type SupabaseServerClient = ReturnType<typeof createServerClient>

// Cache para clientes del servidor (por request)
const serverClients = new Map<string, SupabaseServerClient>()

/**
 * Obtener configuración de Supabase
 */
function getSupabaseConfig() {
  try {
    validateConfig()
    
    return {
      url: config.supabase.url,
      anonKey: config.supabase.anonKey,
      serviceRoleKey: config.supabase.serviceRoleKey,
      options: {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'X-Client-Info': 'erp-taller-saas-server'
          }
        }
      }
    }
  } catch (error) {
    throw new ConfigurationError('Invalid Supabase configuration', error)
  }
}

/**
 * Cliente del servidor (por request)
 */
export async function getServerClient(): Promise<SupabaseServerClient> {
  try {
    const cookieStore = await cookies()
    const requestId = cookieStore.toString() // Usar cookies como ID único
    
    // Verificar si ya existe un cliente para esta request
    if (serverClients.has(requestId)) {
      return serverClients.get(requestId)!
    }
    
    const supabaseConfig = getSupabaseConfig()
    
    const serverClient = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
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
              // Server Component no puede setear cookies en algunos casos
              console.warn('No se pudieron establecer cookies:', error)
            }
          },
        },
        global: supabaseConfig.options?.global
      }
    )
    
    // Cachear el cliente para esta request
    serverClients.set(requestId, serverClient)
    
    // Limpiar cache después de 5 minutos
    setTimeout(() => {
      serverClients.delete(requestId)
    }, 5 * 60 * 1000)
    
    console.log('✅ Cliente Supabase del servidor inicializado')
    return serverClient
  } catch (error) {
    const appError = handleError(error)
    console.error('❌ Error inicializando cliente del servidor:', appError.message)
    throw new ConfigurationError(`Failed to initialize server client: ${appError.message}`)
  }
}

/**
 * Cliente para middleware
 */
export function getMiddlewareClient(request: NextRequest) {
  try {
    const supabaseConfig = getSupabaseConfig()
    
    return createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // En middleware, las cookies se manejan en el response
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
        global: supabaseConfig.options?.global
      }
    )
  } catch (error) {
    const appError = handleError(error)
    console.error('❌ Error inicializando cliente de middleware:', appError.message)
    throw new ConfigurationError(`Failed to initialize middleware client: ${appError.message}`)
  }
}

/**
 * Cliente con Service Role (para operaciones administrativas)
 */
export function getServiceClient(): SupabaseServerClient {
  try {
    const supabaseConfig = getSupabaseConfig()
    
    if (!supabaseConfig.serviceRoleKey) {
      throw new ConfigurationError('Service role key not configured')
    }
    
    return createServerClient(
      supabaseConfig.url,
      supabaseConfig.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: supabaseConfig.options?.global
      }
    )
  } catch (error) {
    const appError = handleError(error)
    console.error('❌ Error inicializando cliente de servicio:', appError.message)
    throw new ConfigurationError(`Failed to initialize service client: ${appError.message}`)
  }
}

/**
 * Limpiar recursos
 */
export function cleanup(): void {
  serverClients.clear()
  console.log('🧹 Recursos de Supabase del servidor limpiados')
}
