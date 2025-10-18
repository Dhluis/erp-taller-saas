/**
 * Cliente Supabase para Navegador (Browser)
 * Solo para uso en componentes del cliente
 */

import { createBrowserClient } from '@supabase/ssr'
import { config, validateConfig } from '@/lib/config'
import { ConfigurationError, SupabaseError, handleError } from '@/lib/errors'

// Tipos para el cliente
export type SupabaseClient = ReturnType<typeof createBrowserClient>

// Singleton para cliente del navegador
let browserClient: SupabaseClient | null = null

/**
 * Configuración de Supabase con validación
 */
interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  options?: {
    auth?: {
      persistSession?: boolean
      autoRefreshToken?: boolean
      detectSessionInUrl?: boolean
    }
    global?: {
      headers?: Record<string, string>
    }
  }
}

/**
 * Obtiene la configuración de Supabase con validación
 */
function getSupabaseConfig(): SupabaseConfig {
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
            'X-Client-Info': 'erp-taller-saas'
          }
        }
      }
    }
  } catch (error) {
    throw new ConfigurationError('Invalid Supabase configuration', error)
  }
}

/**
 * Cliente del navegador (singleton)
 */
export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    try {
      const supabaseConfig = getSupabaseConfig()
      
      browserClient = createBrowserClient(
        supabaseConfig.url,
        supabaseConfig.anonKey,
        supabaseConfig.options
      )
      
      // Configurar listeners de autenticación
      browserClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
      })
      
      console.log('✅ Cliente Supabase del navegador inicializado')
    } catch (error) {
      const appError = handleError(error)
      console.error('❌ Error inicializando cliente del navegador:', appError.message)
      throw new ConfigurationError(`Failed to initialize browser client: ${appError.message}`)
    }
  }
  
  return browserClient
}


/**
 * Verificar conexión a Supabase
 */
export async function testConnection(): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  const startTime = Date.now()
  
  try {
    const client = getBrowserClient()
    
    // Test simple de conexión
    const { data, error } = await client
      .from('_test_connection')
      .select('*')
      .limit(1)
    
    const latency = Date.now() - startTime
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseError('Connection test failed', error)
    }
    
    return {
      success: true,
      latency
    }
  } catch (error) {
    const appError = handleError(error)
    return {
      success: false,
      error: appError.message,
      latency: Date.now() - startTime
    }
  }
}

/**
 * Obtener información del usuario autenticado
 */
export async function getCurrentUser(): Promise<{
  user: any | null
  session: any | null
  error?: string
}> {
  try {
    const client = getBrowserClient()
    const { data: { user }, error: userError } = await client.auth.getUser()
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    
    if (userError) {
      throw new SupabaseError('Error getting user', userError)
    }
    
    if (sessionError) {
      throw new SupabaseError('Error getting session', sessionError)
    }
    
    return { user, session }
  } catch (error) {
    const appError = handleError(error)
    return {
      user: null,
      session: null,
      error: appError.message
    }
  }
}

/**
 * Verificar si el usuario está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { user, error } = await getCurrentUser()
    return !error && !!user
  } catch {
    return false
  }
}

/**
 * Limpiar recursos
 */
export function cleanup(): void {
  browserClient = null
  console.log('🧹 Recursos de Supabase limpiados')
}

/**
 * Obtener información de configuración
 */
export function getSupabaseInfo(): {
  url: string
  hasAnonKey: boolean
  hasServiceRoleKey: boolean
  isConfigured: boolean
} {
  return {
    url: config.supabase.url,
    hasAnonKey: !!config.supabase.anonKey,
    hasServiceRoleKey: !!config.supabase.serviceRoleKey,
    isConfigured: !!(config.supabase.url && config.supabase.anonKey)
  }
}

// Exportar funciones legacy para compatibilidad
export const createClient = getBrowserClient
export const getSupabaseClient = getBrowserClient
