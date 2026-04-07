/**
 * Cliente Supabase para Navegador
 * Solo para uso en componentes del cliente
 * Versión robusta con manejo de errores y retry
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient as OriginalSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase-simple'

export type SupabaseClient = OriginalSupabaseClient<Database, 'public'>

let browserClient: SupabaseClient | null = null

/**
 * Obtener cliente Supabase para navegador (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient
  }

  // 🚨 FIX CRÍTICO PARA BUILD: Si estamos en fase de compilación, devolver un Proxy seguro INMEDIATAMENTE
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    const createProxy = (): any => {
      const fn = () => Promise.resolve({ data: null, error: null, session: null, user: null });
      return new Proxy(fn, {
        get: (target, prop) => {
          if (prop === 'then') return undefined; // No tratar como promesa si no se llama
          return createProxy();
        }
      });
    };
    return createProxy();
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !anonKey) {
      // Durante el build de Next.js (static generation), process.env puede no tener todas las variables.
      // No queremos romper el build si este cliente se importa en una ruta que el build intenta evaluar.
      const isBuildStep = process.env.NODE_ENV === 'production' && !process.env.NEXT_RUNTIME;
      
      const errorMsg = `
❌ SUPABASE CONFIGURATION ERROR:
   Missing required environment variables:
   - NEXT_PUBLIC_SUPABASE_URL: ${url ? '✅' : '❌'}
   - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✅' : '❌'}
   
   Context: ${isBuildStep ? 'Next.js Build Step' : 'Runtime'}
   Please check your .env.local file and ensure these variables are set.
      `
      console.warn(errorMsg)
      
      // En lugar de lanzar un error que rompa el build, retornamos un proxy recursivo seguro
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️ Returning safe recursive proxy for Supabase client during build phase.')
        
        const createProxy = (): any => {
          const fn = () => Promise.resolve({ data: null, error: null, session: null, user: null });
          return new Proxy(fn, {
            get: (target, prop) => {
              if (prop === 'then') return undefined; // Evitar que parezca una promesa si no se llama
              return createProxy();
            }
          });
        };
        
        return createProxy();
      }
      
      throw new Error('Supabase configuration missing. Check your .env.local file.')
    }

    // Validar que la URL sea correcta
    if (!url.includes('supabase.co')) {
      console.warn('⚠️ Supabase URL does not contain "supabase.co". Verify it is correct.')
    }
    
    browserClient = createBrowserClient<Database>(url, anonKey, {
      global: {
        headers: {
          'X-Client-Info': 'erp-taller-saas-browser',
          'X-App-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
        fetch: async (url, options: RequestInit = {}) => {
          const controller = new AbortController()
          // Auth (refresh token, etc.) puede tardar más: red lenta o proyecto Supabase en pausa
          const isAuthRequest = typeof url === 'string' && url.includes('/auth/')
          const timeoutMs = isAuthRequest ? 25000 : 10000
          const timeoutId = setTimeout(() => {
            controller.abort()
          }, timeoutMs)

          try {
            const response = await fetch(url, {
              ...options,
              signal: options.signal || controller.signal,
            })
            clearTimeout(timeoutId)
            return response
          } catch (error: any) {
            clearTimeout(timeoutId)
            
            // Manejar errores de conexión específicos
            if (error.name === 'AbortError') {
              console.error(`❌ Supabase request timeout after ${timeoutMs / 1000}s:`, url)
              const hint = isAuthRequest
                ? ' Revisa tu conexión. Si usas Supabase gratis, el proyecto puede estar en pausa: reactívalo en el dashboard.'
                : ''
              throw new Error('Tiempo de conexión agotado. Revisa tu conexión a internet e intenta de nuevo.' + hint)
            }
            
            if (error.message?.includes('ERR_CONNECTION_CLOSED') || 
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('NetworkError')) {
              console.error('❌ Supabase connection error:', error.message)
              throw new Error('No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.')
            }
            
            throw error
          }
        },
      },
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })

    console.log('✅ Supabase browser client initialized')
    console.log('📍 Supabase URL:', url.substring(0, 30) + '...')
    return browserClient
  } catch (error: any) {
    console.error('❌ Failed to initialize Supabase browser client:', error)
    throw error
  }
}

/**
 * Probar conexión a Supabase con retry
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getSupabaseClient()
      
      // Probar conexión con timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de conexión agotado')), 5000)
      })

      const queryPromise = client.from('organizations').select('id').limit(1)
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        lastError = error
        
        // Si es error de red, reintentar
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('ERR_CONNECTION_CLOSED') ||
            error.message?.includes('NetworkError')) {
          if (attempt < maxRetries) {
            console.warn(`⚠️ Connection attempt ${attempt}/${maxRetries} failed, retrying...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            continue
          }
        }
        
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
      lastError = error
      
      if (error.message?.includes('timeout') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('ERR_CONNECTION_CLOSED')) {
        if (attempt < maxRetries) {
          console.warn(`⚠️ Connection attempt ${attempt}/${maxRetries} timed out, retrying...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
      }
      
      console.error(`❌ Supabase connection test exception (attempt ${attempt}/${maxRetries}):`, error)
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          message: `Connection test failed after ${maxRetries} attempts: ${error.message || error}` 
        }
      }
    }
  }

  return { 
    success: false, 
    message: `Connection test failed: ${lastError?.message || 'Unknown error'}` 
  }
}

/**
 * Obtener información de configuración (SOLO variables públicas)
 * ⚠️ Esta función solo debe acceder a variables NEXT_PUBLIC_*
 * ⚠️ NO acceder a variables privadas como SUPABASE_SERVICE_ROLE_KEY aquí
 */
export function getSupabaseInfo() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    return {
      url: url,
      urlPreview: url !== 'Not configured' ? `${url.substring(0, 30)}...` : 'Not configured',
      hasAnonKey: !!anonKey,
      anonKeyPreview: anonKey ? `${anonKey.substring(0, 20)}...` : 'Not configured',
      // ⚠️ hasServiceRoleKey siempre será false en el cliente porque SUPABASE_SERVICE_ROLE_KEY
      // no está disponible en el navegador (solo variables NEXT_PUBLIC_* están disponibles)
      hasServiceRoleKey: false, // No verificar en cliente por seguridad
      isConfigured: !!(url && anonKey && url !== 'Not configured'),
      // Validar formato de URL
      urlIsValid: url.includes('supabase.co') || url.includes('localhost'),
      // Validar formato de keys (JWT tokens)
      anonKeyIsValid: anonKey ? anonKey.startsWith('eyJ') : false,
    }
  } catch (error) {
    return {
      url: 'Not configured',
      urlPreview: 'Not configured',
      hasAnonKey: false,
      anonKeyPreview: 'Not configured',
      hasServiceRoleKey: false,
      isConfigured: false,
      urlIsValid: false,
      anonKeyIsValid: false,
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