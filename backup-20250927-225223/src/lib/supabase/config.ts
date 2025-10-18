/**
 * Configuración Centralizada de Supabase
 * Maneja configuración, validación y inicialización robusta
 */

import { createBrowserClient } from '@supabase/ssr'
import { AppError, ConfigurationError, SupabaseError } from '@/lib/errors'

// Tipos de configuración
export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  options: {
    auth: {
      persistSession: boolean
      autoRefreshToken: boolean
      detectSessionInUrl: boolean
    }
    global: {
      headers: Record<string, string>
    }
    db: {
      schema: string
    }
  }
}

// Singleton para configuración
let configInstance: SupabaseConfig | null = null

/**
 * Validar variables de entorno
 */
function validateEnvironment(): void {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Variables de entorno faltantes: ${missingVars.join(', ')}`,
      { missingVars, availableVars: Object.keys(process.env) }
    )
  }

  // Validar formato de URL
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  } catch {
    throw new ConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL no es una URL válida',
      { url: process.env.NEXT_PUBLIC_SUPABASE_URL }
    )
  }

  // Validar formato de clave
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.startsWith('eyJ')) {
    throw new ConfigurationError(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY no tiene formato válido de JWT',
      { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' }
    )
  }
}

/**
 * Obtener configuración de Supabase
 */
export function getSupabaseConfig(): SupabaseConfig {
  if (configInstance) {
    return configInstance
  }

  try {
    // Validar entorno
    validateEnvironment()

    configInstance = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      options: {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'X-Client-Info': 'erp-taller-saas',
            'X-App-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          },
        },
        db: {
          schema: 'public',
        },
      },
    }

    console.log('✅ Configuración de Supabase validada y cargada')
    return configInstance
  } catch (error) {
    console.error('❌ Error en configuración de Supabase:', error)
    throw error
  }
}

/**
 * Crear cliente Supabase con configuración robusta
 */
export function createSupabaseClient() {
  try {
    const config = getSupabaseConfig()
    
    const client = createBrowserClient(
      config.url,
      config.anonKey,
      config.options
    )

    // Configurar listeners de autenticación
    client.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id)
    })

    // Configurar listener de errores globales
    client.realtime.on('error', (error) => {
      console.error('❌ Supabase Realtime error:', error)
    })

    console.log('✅ Cliente Supabase inicializado correctamente')
    return client
  } catch (error) {
    console.error('❌ Error creando cliente Supabase:', error)
    throw new SupabaseError('Failed to create Supabase client', error)
  }
}

/**
 * Verificar conexión a Supabase
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean
  latency: number
  error?: string
  details?: any
}> {
  const startTime = Date.now()
  
  try {
    const client = createSupabaseClient()
    
    // Test 1: Verificar conexión básica
    const { data, error } = await client
      .from('_test_connection')
      .select('*')
      .limit(1)
    
    const latency = Date.now() - startTime
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseError('Connection test failed', error)
    }
    
    // Test 2: Verificar autenticación
    const { data: { user }, error: authError } = await client.auth.getUser()
    
    return {
      success: true,
      latency,
      details: {
        connection: 'OK',
        auth: authError ? 'Error' : 'OK',
        user: user?.id || 'Not authenticated'
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    const appError = error instanceof AppError ? error : new SupabaseError('Connection test failed', error)
    
    return {
      success: false,
      latency,
      error: appError.message,
      details: {
        originalError: appError.originalError,
        stack: appError.stack
      }
    }
  }
}

/**
 * Obtener información de configuración para debugging
 */
export function getConfigInfo() {
  const config = getSupabaseConfig()
  
  return {
    url: config.url,
    hasAnonKey: !!config.anonKey,
    hasServiceRoleKey: !!config.serviceRoleKey,
    isConfigured: !!(config.url && config.anonKey),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  }
}
