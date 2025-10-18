/**
 * Sistema de Manejo de Errores Robusto para Supabase
 * Proporciona logging detallado, retry logic y manejo de errores específicos
 */

import { PostgrestError } from '@supabase/supabase-js'
import { AppError, DatabaseError, SupabaseError, ValidationError } from '@/lib/errors'

// Tipos de errores específicos de Supabase
export interface SupabaseErrorDetails {
  code: string
  message: string
  details: string | null
  hint: string | null
  query?: string
  table?: string
  column?: string
  constraint?: string
}

// Configuración de retry
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
}

/**
 * Analizar error de Supabase y extraer detalles
 */
export function analyzeSupabaseError(error: any): SupabaseErrorDetails {
  if (error?.code) {
    return {
      code: error.code,
      message: error.message || 'Unknown error',
      details: error.details || null,
      hint: error.hint || null,
      query: error.query || undefined,
      table: error.table || undefined,
      column: error.column || undefined,
      constraint: error.constraint || undefined
    }
  }

  return {
    code: 'UNKNOWN',
    message: error?.message || 'Unknown error',
    details: null,
    hint: null
  }
}

/**
 * Determinar si un error es recuperable
 */
export function isRecoverableError(error: any): boolean {
  const details = analyzeSupabaseError(error)
  
  // Errores de red y conexión son recuperables
  const recoverableCodes = [
    'PGRST301', // Connection timeout
    'PGRST302', // Connection refused
    'PGRST303', // Network error
    'PGRST304', // DNS resolution failed
    'PGRST305', // SSL error
    'PGRST306', // Connection pool exhausted
  ]

  // Errores de base de datos temporales
  const temporaryCodes = [
    'PGRST001', // Database unavailable
    'PGRST002', // Database overloaded
    'PGRST003', // Database maintenance
  ]

  return recoverableCodes.includes(details.code) || 
         temporaryCodes.includes(details.code) ||
         details.message.includes('timeout') ||
         details.message.includes('connection') ||
         details.message.includes('network')
}

/**
 * Determinar si un error es de autenticación
 */
export function isAuthError(error: any): boolean {
  const details = analyzeSupabaseError(error)
  
  const authCodes = [
    'PGRST301', // Unauthorized
    'PGRST302', // Forbidden
    'PGRST303', // Token expired
    'PGRST304', // Invalid token
  ]

  return authCodes.includes(details.code) ||
         details.message.includes('auth') ||
         details.message.includes('token') ||
         details.message.includes('unauthorized')
}

/**
 * Determinar si un error es de validación
 */
export function isValidationError(error: any): boolean {
  const details = analyzeSupabaseError(error)
  
  const validationCodes = [
    'PGRST001', // Invalid input
    'PGRST002', // Constraint violation
    'PGRST003', // Data type mismatch
  ]

  return validationCodes.includes(details.code) ||
         details.message.includes('constraint') ||
         details.message.includes('validation') ||
         details.message.includes('invalid')
}

/**
 * Logging detallado de errores
 */
export function logSupabaseError(
  error: any,
  context: {
    operation: string
    table?: string
    query?: string
    userId?: string
    timestamp?: string
  }
): void {
  const details = analyzeSupabaseError(error)
  const timestamp = context.timestamp || new Date().toISOString()
  
  const logData = {
    timestamp,
    operation: context.operation,
    table: context.table,
    query: context.query,
    userId: context.userId,
    error: {
      code: details.code,
      message: details.message,
      details: details.details,
      hint: details.hint,
      table: details.table,
      column: details.column,
      constraint: details.constraint
    },
    stack: error?.stack,
    isRecoverable: isRecoverableError(error),
    isAuthError: isAuthError(error),
    isValidationError: isValidationError(error)
  }

  // Log según el tipo de error
  if (isAuthError(error)) {
    console.warn('🔐 Supabase Auth Error:', logData)
  } else if (isValidationError(error)) {
    console.warn('⚠️ Supabase Validation Error:', logData)
  } else if (isRecoverableError(error)) {
    console.warn('🔄 Supabase Recoverable Error:', logData)
  } else {
    console.error('❌ Supabase Error:', logData)
  }
}

/**
 * Retry logic con backoff exponencial
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Si no es recuperable, no reintentar
      if (!isRecoverableError(error)) {
        throw error
      }

      // Si es el último intento, lanzar error
      if (attempt === retryConfig.maxRetries) {
        throw error
      }

      // Calcular delay con backoff exponencial
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      )

      console.warn(`🔄 Retry attempt ${attempt + 1}/${retryConfig.maxRetries} in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Wrapper para operaciones de Supabase con manejo robusto de errores
 */
export async function executeSupabaseOperation<T>(
  operation: () => Promise<T>,
  context: {
    operation: string
    table?: string
    query?: string
    userId?: string
  }
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await withRetry(operation)
    const duration = Date.now() - startTime
    
    console.log(`✅ ${context.operation} completed in ${duration}ms`)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Log del error
    logSupabaseError(error, {
      ...context,
      timestamp: new Date().toISOString()
    })

    // Convertir a AppError apropiado
    if (isAuthError(error)) {
      throw new AppError(
        'Authentication error',
        'AUTH_ERROR',
        401,
        { originalError: error, duration }
      )
    } else if (isValidationError(error)) {
      throw new ValidationError(
        'Validation error',
        { originalError: error, duration }
      )
    } else {
      throw new SupabaseError(
        'Database operation failed',
        { originalError: error, duration }
      )
    }
  }
}

/**
 * Validar conexión antes de operaciones críticas
 */
export async function validateConnection(): Promise<boolean> {
  try {
    const { createSupabaseClient } = await import('./client')
    const client = createSupabaseClient()
    
    const { data, error } = await client
      .from('_test_connection')
      .select('*')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseError('Connection validation failed', error)
    }
    
    return true
  } catch (error) {
    console.error('❌ Connection validation failed:', error)
    return false
  }
}
