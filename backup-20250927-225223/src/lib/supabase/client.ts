/**
 * Cliente Supabase Robusto y Centralizado
 * Implementación con manejo de errores, retry logic y logging detallado
 */

import { createSupabaseClient, testSupabaseConnection, getConfigInfo } from './config'
import { executeSupabaseOperation, validateConnection } from './error-handler'
import { AppError, SupabaseError } from '@/lib/errors'

// Singleton para el cliente
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

/**
 * Obtener cliente Supabase (singleton)
 */
export function getClient() {
  if (!clientInstance) {
    try {
      clientInstance = createSupabaseClient()
    } catch (error) {
      console.error('❌ Error inicializando cliente Supabase:', error)
      throw new SupabaseError('Failed to initialize Supabase client', error)
    }
  }
  
  return clientInstance
}

/**
 * Verificar conexión y salud del sistema
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
    // Test de conexión
    const connectionTest = await testSupabaseConnection()
    
    if (!connectionTest.success) {
      return {
        healthy: false,
        details: {
          connection: false,
          auth: false,
          latency: connectionTest.latency,
          config: getConfigInfo()
        },
        error: connectionTest.error
      }
    }

    // Test de autenticación
    const client = getClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    
    const latency = Date.now() - startTime
    
    return {
      healthy: true,
      details: {
        connection: true,
        auth: !authError,
        latency,
        config: getConfigInfo()
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
        config: getConfigInfo()
      },
      error: appError.message
    }
  }
}

/**
 * Operación segura con validación previa
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
  context: {
    operation: string
    table?: string
    query?: string
    userId?: string
  }
): Promise<T> {
  // Validar conexión antes de la operación
  const isConnected = await validateConnection()
  if (!isConnected) {
    throw new SupabaseError('Database connection not available', {
      operation: context.operation,
      table: context.table
    })
  }

  // Ejecutar operación con manejo robusto de errores
  return executeSupabaseOperation(operation, context)
}

/**
 * Obtener información del cliente para debugging
 */
export function getClientInfo() {
  return {
    config: getConfigInfo(),
    isInitialized: !!clientInstance,
    timestamp: new Date().toISOString()
  }
}

/**
 * Limpiar recursos
 */
export function cleanup() {
  clientInstance = null
  console.log('🧹 Cliente Supabase limpiado')
}

// Exportar funciones legacy para compatibilidad
export const createClient = getClient
export const getSupabaseClient = getClient