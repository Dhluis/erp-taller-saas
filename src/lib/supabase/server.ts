import { createServerClient as createSupabaseSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import type { NextRequest } from 'next/server'
import { getConfig } from '../core/config'
import { ConfigurationError, logError } from '../core/errors'
import { Database } from '@/types/supabase-simple'

export type SupabaseServerClient = SupabaseClient<Database, 'public'>

let serverClient: SupabaseServerClient | null = null

/**
 * Obtener cliente Supabase para servidor (singleton)
 */
export async function getSupabaseServerClient(): Promise<SupabaseServerClient> {
  if (serverClient) {
    return serverClient
  }

  // 🚨 FIX PARA BUILD: Si estamos en fase de compilación, devolver un Proxy seguro
  // Esto evita errores de cookies() y de configuración faltante que rompen el build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('⚠️ Returning safe recursive proxy for Supabase server client during build phase.')
    
    const createProxy = (): any => {
      const fn = () => Promise.resolve({ data: null, error: null, session: null, user: null });
      return new Proxy(fn, {
        get: (target, prop) => {
          if (prop === 'then') return undefined; // No tratar como promesa si no se ha llamado
          return createProxy();
        }
      });
    };
    
    return createProxy();
  }

  try {
    const config = getConfig()
    const cookieStore = await cookies()
    
    serverClient = createSupabaseSSRClient<Database>(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options?: any) {
            cookieStore.set({ name, value, ...(options ?? {}) })
          },
          remove(name: string, options?: any) {
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
export function getSupabaseServiceClient(): SupabaseServerClient | null {
  const config = getConfig()
  
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase] ⚠️ SUPABASE_SERVICE_ROLE_KEY no definida. Se usará cliente estándar (RLS activo).');
    }
    return null;
  }

  return createSupabaseSSRClient<Database>(
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

/**
 * ✅ FIX CRÍTICO: Crear cliente Supabase desde un NextRequest (para API routes)
 * Lee las cookies del header 'cookie' directamente para evitar cache
 */
export function createClientFromRequest(request: NextRequest): SupabaseServerClient {
  const config = getConfig()
  
  // ✅ FIX: Parsear cookies del header directamente
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieMap = new Map<string, string>()
  
  // Parsear cookies manualmente del header
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=')
      if (name && valueParts.length > 0) {
        cookieMap.set(name.trim(), valueParts.join('=').trim())
      }
    })
  }
  
  return createSupabaseSSRClient<Database>(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieMap.get(name)
        },
        set(name: string, value: string, options?: any) {
          // No podemos setear cookies en API routes desde aquí
        },
        remove(name: string, options?: any) {
          // No podemos remover cookies en API routes desde aquí
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
}

// Exportar cliente por defecto para compatibilidad
export const createClient = getSupabaseServerClient
export { getSupabaseServerClient as createServerClient }
export default getSupabaseServerClient