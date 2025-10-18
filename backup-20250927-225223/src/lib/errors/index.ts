/**
 * Sistema de Manejo de Errores Centralizado
 * Proporciona clases de error específicas y manejo consistente
 */

/**
 * Error base de la aplicación
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly timestamp: string
  public readonly context?: any

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.timestamp = new Date().toISOString()
    this.context = context

    // Mantener el stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * Convierte el error a un objeto serializable
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context
    }
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends AppError {
  constructor(message: string, public readonly originalError?: any) {
    super(message, 'DATABASE_ERROR', 500, { originalError })
    this.name = 'DatabaseError'
  }
}

/**
 * Error de validación
 */
export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field })
    this.name = 'ValidationError'
  }
}

/**
 * Error de autenticación
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Error de autorización
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`
    super(message, 'NOT_FOUND_ERROR', 404, { resource, id })
    this.name = 'NotFoundError'
  }
}

/**
 * Error de configuración
 */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500)
    this.name = 'ConfigurationError'
  }
}

/**
 * Error de red/conexión
 */
export class NetworkError extends AppError {
  constructor(message: string, public readonly originalError?: any) {
    super(message, 'NETWORK_ERROR', 503, { originalError })
    this.name = 'NetworkError'
  }
}

/**
 * Error de Supabase específico
 */
export class SupabaseError extends DatabaseError {
  constructor(message: string, public readonly supabaseError?: any) {
    super(message, supabaseError)
    this.name = 'SupabaseError'
    this.code = 'SUPABASE_ERROR'
  }
}

/**
 * Función para manejar errores de manera consistente
 */
export function handleError(error: unknown): AppError {
  // Si ya es un AppError, devolverlo
  if (error instanceof AppError) {
    return error
  }

  // Si es un error de Supabase
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as any
    if (supabaseError.code || supabaseError.hint) {
      return new SupabaseError(
        supabaseError.message || 'Supabase error occurred',
        supabaseError
      )
    }
  }

  // Si es un Error estándar
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      { originalError: error }
    )
  }

  // Error desconocido
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: error }
  )
}

/**
 * Función para logging de errores
 */
export function logError(error: AppError, context?: any): void {
  const errorInfo = {
    ...error.toJSON(),
    context,
    stack: error.stack
  }

  // En desarrollo, log completo
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error:', errorInfo)
  } else {
    // En producción, log estructurado
    console.error(JSON.stringify(errorInfo))
  }
}

/**
 * Función para crear errores de validación con múltiples campos
 */
export function createValidationErrors(errors: Record<string, string>): ValidationError[] {
  return Object.entries(errors).map(([field, message]) => 
    new ValidationError(message, field)
  )
}

/**
 * Función para verificar si un error es recuperable
 */
export function isRecoverableError(error: AppError): boolean {
  const recoverableCodes = [
    'NETWORK_ERROR',
    'DATABASE_ERROR',
    'SUPABASE_ERROR'
  ]
  
  return recoverableCodes.includes(error.code)
}

/**
 * Función para obtener mensaje de error amigable para el usuario
 */
export function getUserFriendlyMessage(error: AppError): string {
  const userMessages: Record<string, string> = {
    'VALIDATION_ERROR': 'Por favor, verifica los datos ingresados',
    'AUTHENTICATION_ERROR': 'Debes iniciar sesión para continuar',
    'AUTHORIZATION_ERROR': 'No tienes permisos para realizar esta acción',
    'NOT_FOUND_ERROR': 'El recurso solicitado no existe',
    'DATABASE_ERROR': 'Error de conexión con la base de datos',
    'SUPABASE_ERROR': 'Error de conexión con la base de datos',
    'NETWORK_ERROR': 'Error de conexión. Verifica tu internet',
    'CONFIGURATION_ERROR': 'Error de configuración del sistema',
    'UNKNOWN_ERROR': 'Ha ocurrido un error inesperado'
  }

  return userMessages[error.code] || 'Ha ocurrido un error inesperado'
}
