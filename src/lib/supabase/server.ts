/**
 * Cliente Supabase para Servidor
 * Solo para uso en Server Components y API routes
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { getConfig } from '../core/config'
import { ConfigurationError, logError } from '../core/errors'
import { Database } from '@/types/supabase-simple'

export type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>

let serverClient: SupabaseServerClient | null = null

/**
 * Obtener cliente Supabase para servidor (singleton)
 */
export async function getSupabaseServerClient(): Promise<SupabaseServerClient> {
  if (serverClient) {
    return serverClient
  }

  try {
    const config = getConfig()
    const cookieStore = await cookies()
    
        serverClient = createServerClient<Database>(
          config.NEXT_PUBLIC_SUPABASE_URL,
          config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options?: ResponseCookie['options']) {
            cookieStore.set({ name, value, ...(options ?? {}) })
          },
          remove(name: string, options?: ResponseCookie['options']) {
            cookieStore.set({ name, value: '', ...(options ?? {}) })
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

    console.log('✅ Supabase server client initialized')
    return serverClient
  } catch (error: unknown) {
    logError(new ConfigurationError('Failed to initialize Supabase server client', { originalError: error }))
    throw new ConfigurationError('Failed to initialize Supabase server client')
  }
}

/**
 * Obtener cliente con service role (para operaciones administrativas)
 */
export function getSupabaseServiceClient(): SupabaseServerClient {
  const config = getConfig()
  
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ConfigurationError(`
❌ SUPABASE SERVICE ROLE ERROR:
   SUPABASE_SERVICE_ROLE_KEY is not defined
   
   Please add to your .env.local:
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    `)
  }

    return createServerClient<Database>(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          get() {
            return ''
          },
          set() {
            // Service role no necesita cookies
          },
          remove() {
            // Service role no necesita cookies
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'erp-taller-saas-service',
            'X-App-Version': config.NEXT_PUBLIC_APP_VERSION,
          },
        },
      }
    )
}

/**
 * Limpiar cache (para testing)
 */
export function clearSupabaseServerCache() {
  serverClient = null
}

// Exportar cliente por defecto para compatibilidad
export const createClient = getSupabaseServerClient
export { getSupabaseServerClient as createServerClient }
export default getSupabaseServerClient