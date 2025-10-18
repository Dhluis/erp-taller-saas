/**
 * Utilidades para manejo de errores en componentes React
 */

import { useState } from 'react'
import { AppError, handleError, logError, getUserFriendlyMessage } from '@/lib/errors'

/**
 * Hook para manejo de errores en componentes
 */
export interface UseErrorHandlerReturn {
  error: string | null
  setError: (error: unknown) => void
  clearError: () => void
  handleAsyncError: <T>(asyncFn: () => Promise<T>) => Promise<T | null>
}

/**
 * Hook para manejo de errores
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<string | null>(null)

  const setError = (error: unknown) => {
    const appError = handleError(error)
    logError(appError)
    setErrorState(getUserFriendlyMessage(appError))
  }

  const clearError = () => {
    setErrorState(null)
  }

  const handleAsyncError = async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      clearError()
      return await asyncFn()
    } catch (error) {
      setError(error)
      return null
    }
  }

  return {
    error,
    setError,
    clearError,
    handleAsyncError
  }
}

/**
 * Función para mostrar errores en UI
 */
export function displayError(error: unknown): string {
  const appError = handleError(error)
  return getUserFriendlyMessage(appError)
}

/**
 * Función para logging de errores en componentes
 */
export function logComponentError(error: unknown, componentName: string, context?: any): void {
  const appError = handleError(error)
  logError(appError, { component: componentName, ...context })
}

/**
 * Función para manejo de errores de formularios
 */
export function handleFormError(error: unknown, setFieldError?: (field: string, message: string) => void): void {
  const appError = handleError(error)
  
  if (appError.code === 'VALIDATION_ERROR' && appError.context?.field && setFieldError) {
    setFieldError(appError.context.field, appError.message)
  } else {
    // Error general del formulario
    console.error('Form error:', appError)
  }
}

/**
 * Función para manejo de errores de API
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = 'Error de conexión'
  
  try {
    const errorData = await response.json()
    errorMessage = errorData.message || errorMessage
  } catch {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`
  }
  
  const error = new AppError(
    errorMessage,
    'API_ERROR',
    response.status
  )
  
  throw error
}

/**
 * Función para retry automático en errores recuperables
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const appError = handleError(error)
      
      // Si no es recuperable, no reintentar
      if (!isRecoverableError(appError)) {
        throw error
      }
      
      // Si es el último intento, lanzar error
      if (attempt === maxRetries) {
        throw error
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError
}

/**
 * Función para verificar si un error es recuperable
 */
function isRecoverableError(error: AppError): boolean {
  const recoverableCodes = [
    'NETWORK_ERROR',
    'DATABASE_ERROR',
    'SUPABASE_ERROR'
  ]
  
  return recoverableCodes.includes(error.code)
}
