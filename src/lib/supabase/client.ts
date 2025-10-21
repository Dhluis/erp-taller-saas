/**
 * Cliente Supabase para Navegador
 * Solo para uso en componentes del cliente
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase-simple'

export type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let browserClient: SupabaseClient | null = null

/**
 * Obtener cliente Supabase para navegador (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !anonKey) {
      throw new Error('Supabase configuration missing. Check your .env.local file.')
    }
    
    browserClient = createBrowserClient<Database>(url, anonKey, {
      global: {
        headers: {
          'X-Client-Info': 'erp-taller-saas-browser',
          'X-App-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            // Timeout de 60 segundos para uploads de imágenes
            signal: AbortSignal.timeout(60000),
          })
        },
      },
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })

    console.log('✅ Supabase browser client initialized')
    return browserClient
  } catch (error: any) {
    console.error('❌ Failed to initialize Supabase browser client:', error)
    throw error
  }
}

/**
 * Probar conexión a Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.from('organizations').select('id').limit(1)

    if (error) {
      console.error('❌ Supabase connection test failed:', error)
      return { 
        success: false, 
        message: `Connection failed: ${error.message}` 
      }
    }

    console.log('✅ Supabase connection test successful')
    return { 
      success: true, 
      message: 'Connection successful to Supabase' 
    }
  } catch (error: any) {
    console.error('❌ Supabase connection test exception:', error)
    return { 
      success: false, 
      message: `Connection test failed: ${error}` 
    }
  }
}

/**
 * Obtener información de configuración
 */
export function getSupabaseInfo() {
  try {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      isConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    }
  } catch (error) {
    return {
      url: 'Not configured',
      hasAnonKey: false,
      hasServiceRoleKey: false,
      isConfigured: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Limpiar cache (para testing)
 */
export function clearSupabaseCache() {
  browserClient = null
}

// Exportar cliente por defecto para compatibilidad
export const supabase = getSupabaseClient()
export const createClient = getSupabaseClient
export default getSupabaseClient