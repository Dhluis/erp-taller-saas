/**
 * Sistema de Manejo de Errores Robusto y Centralizado
 * Proporciona clasificación, logging y manejo consistente de errores
 */

import { PostgrestError } from '@supabase/supabase-js'
import { getConfig } from './config'

// Tipos de errores de la aplicación
export enum ErrorCode {
  // Errores de configuración
  CONFIG_ERROR = 'CONFIG_ERROR',
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
  
  // Errores de Supabase
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  SUPABASE_CONNECTION = 'SUPABASE_CONNECTION',
  SUPABASE_AUTH = 'SUPABASE_AUTH',
  SUPABASE_QUERY = 'SUPABASE_QUERY',
  SUPABASE_RLS = 'SUPABASE_RLS',
  
  // Errores de base de datos
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  DATABASE_QUERY = 'DATABASE_QUERY',
  DATABASE_CONSTRAINT = 'DATABASE_CONSTRAINT',
  
  // Errores de validación
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT = 'VALIDATION_FORMAT',
  VALIDATION_RANGE = 'VALIDATION_RANGE',
  
  // Errores de autenticación
  AUTH_ERROR = 'AUTH_ERROR',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  
  // Errores de red
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION = 'NETWORK_CONNECTION',
  
  // Errores de negocio
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  BUSINESS_CONSTRAINT = 'BUSINESS_CONSTRAINT',
  
  // Errores de sistema
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_OUT_OF_MEMORY = 'SYSTEM_OUT_OF_MEMORY',
  SYSTEM_TIMEOUT = 'SYSTEM_TIMEOUT',
  
  // Errores desconocidos
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Clase base para errores de la aplicación
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly originalError?: any
  public readonly context?: Record<string, any>
  public readonly timestamp: string
  public readonly stack?: string

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.context = context
    this.timestamp = new Date().toISOString()
    this.stack = this.stack

    // Mantener stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

// Clases específicas de errores
export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.CONFIG_ERROR, 500, context)
    this.name = 'ConfigurationError'
  }
}

export class SupabaseError extends AppError {
  constructor(message: string, originalError?: any, context?: Record<string, any>) {
    super(message, ErrorCode.SUPABASE_ERROR, 500, { originalError, ...context })
    this.name = 'SupabaseError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any, context?: Record<string, any>) {
    super(message, ErrorCode.DATABASE_ERROR, 500, { originalError, ...context })
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, context)
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(message: string, statusCode: number = 401, context?: Record<string, any>) {
    super(message, ErrorCode.AUTH_ERROR, statusCode, context)
    this.name = 'AuthError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.NETWORK_ERROR, 503, context)
    this.name = 'NetworkError'
  }
}

export class BusinessError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.BUSINESS_ERROR, 400, context)
    this.name = 'BusinessError'
  }
}

// Configuración de logging
interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  enableDetailedLogging: boolean
  enableQueryDebugging: boolean
}

/**
 * Obtener configuración de logging
 */
function getLogConfig(): LogConfig {
  try {
    const config = getConfig()
    return {
      level: config.LOG_LEVEL,
      enableDetailedLogging: config.ENABLE_DETAILED_LOGGING,
      enableQueryDebugging: config.DEBUG_QUERIES
    }
  } catch {
    return {
      level: 'info',
      enableDetailedLogging: false,
      enableQueryDebugging: false
    }
  }
}

/**
 * Analizar error de Supabase
 */
export function analyzeSupabaseError(error: any): {
  code: string
  message: string
  details: string | null
  hint: string | null
  query?: string
  table?: string
  column?: string
  constraint?: string
} {
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
         details.message.includes('network') ||
         error instanceof NetworkError
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
         details.message.includes('unauthorized') ||
         error instanceof AuthError
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
         details.message.includes('invalid') ||
         error instanceof ValidationError
}

/**
 * Logging estructurado de errores
 */
export function logError(
  error: any,
  context?: {
    operation?: string
    table?: string
    query?: string
    userId?: string
    component?: string
    additionalContext?: Record<string, any>
  }
): void {
  const logConfig = getLogConfig()
  
  if (!logConfig.enableDetailedLogging && logConfig.level === 'error') {
    // Solo loggear errores críticos
    if (!(error instanceof AppError) || error.statusCode >= 500) {
      console.error('❌ Critical Error:', error.message)
    }
    return
  }

  const timestamp = new Date().toISOString()
  const errorDetails = error instanceof AppError ? {
    name: error.name,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    context: error.context,
    timestamp: error.timestamp,
    stack: error.stack
  } : {
    name: error?.name || 'Unknown',
    message: error?.message || 'Unknown error',
    stack: error?.stack
  }

  const logData = {
    timestamp,
    level: 'error',
    error: errorDetails,
    context: {
      operation: context?.operation,
      table: context?.table,
      query: context?.query,
      userId: context?.userId,
      component: context?.component,
      ...context?.additionalContext
    },
    isRecoverable: isRecoverableError(error),
    isAuthError: isAuthError(error),
    isValidationError: isValidationError(error)
  }

  // Log según el tipo de error
  if (isAuthError(error)) {
    console.warn('🔐 Auth Error:', logData)
  } else if (isValidationError(error)) {
    console.warn('⚠️ Validation Error:', logData)
  } else if (isRecoverableError(error)) {
    console.warn('🔄 Recoverable Error:', logData)
  } else {
    console.error('❌ Critical Error:', logData)
  }
}

/**
 * Manejo centralizado de errores
 */
export function handleError(error: any): AppError {
  // Si ya es un AppError, solo loggear
  if (error instanceof AppError) {
    logError(error)
    return error
  }

  // Analizar error de Supabase
  if (error?.code && typeof error.code === 'string') {
    const supabaseError = new SupabaseError(
      error.message || 'Supabase operation failed',
      error
    )
    logError(supabaseError)
    return supabaseError
  }

  // Analizar error de red
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    const networkError = new NetworkError(
      error.message || 'Network error occurred',
      { originalError: error }
    )
    logError(networkError)
    return networkError
  }

  // Error genérico
  const appError = new AppError(
    error?.message || 'An unexpected error occurred',
    ErrorCode.UNKNOWN_ERROR,
    500,
    { originalError: error }
  )
  logError(appError)
  return appError
}

/**
 * Obtener mensaje amigable para el usuario
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case ErrorCode.CONFIG_ERROR:
    case ErrorCode.CONFIG_MISSING:
    case ErrorCode.CONFIG_INVALID:
      return 'Error de configuración del sistema'
    
    case ErrorCode.SUPABASE_CONNECTION:
    case ErrorCode.DATABASE_CONNECTION:
      return 'Error de conexión con la base de datos'
    
    case ErrorCode.SUPABASE_AUTH:
    case ErrorCode.AUTH_UNAUTHORIZED:
    case ErrorCode.AUTH_FORBIDDEN:
      return 'Error de autenticación'
    
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.VALIDATION_REQUIRED:
    case ErrorCode.VALIDATION_FORMAT:
      return 'Error de validación de datos'
    
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.NETWORK_TIMEOUT:
      return 'Error de conexión'
    
    case ErrorCode.BUSINESS_ERROR:
      return 'Error de lógica de negocio'
    
    default:
      return 'Ha ocurrido un error inesperado'
  }
}

/**
 * Retry logic con backoff exponencial
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Si no es recuperable, no reintentar
      if (!isRecoverableError(error)) {
        throw error
      }

      // Si es el último intento, lanzar error
      if (attempt === maxRetries) {
        throw error
      }

      // Calcular delay con backoff exponencial
      const delay = baseDelay * Math.pow(2, attempt)
      const logConfig = getLogConfig()
      
      if (logConfig.enableDetailedLogging) {
        console.warn(`🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`)
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Wrapper para operaciones con manejo robusto de errores
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operation: string
    table?: string
    query?: string
    userId?: string
    component?: string
  }
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await withRetry(operation)
    const duration = Date.now() - startTime
    
    const logConfig = getLogConfig()
    if (logConfig.enableDetailedLogging) {
      console.log(`✅ ${context.operation} completed in ${duration}ms`)
    }
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Log del error
    logError(error, {
      ...context,
      additionalContext: { duration }
    })

    // Convertir a AppError apropiado
    if (isAuthError(error)) {
      throw new AuthError(
        'Authentication error',
        401,
        { originalError: error, duration }
      )
    } else if (isValidationError(error)) {
      throw new ValidationError(
        'Validation error',
        { originalError: error, duration }
      )
    } else {
      throw handleError(error)
    }
  }
}
