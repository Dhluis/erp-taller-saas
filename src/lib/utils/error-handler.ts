/**
 * Hook para manejo de errores en componentes React
 */

import { useState } from 'react'

export interface ErrorState {
  hasError: boolean
  error: Error | null
  message: string
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState>({
    hasError: false,
    error: null,
    message: ''
  })

  const handleError = (error: Error | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message
    setError({
      hasError: true,
      error: typeof error === 'string' ? new Error(error) : error,
      message: errorMessage
    })
  }

  const clearError = () => {
    setError({
      hasError: false,
      error: null,
      message: ''
    })
  }

  return {
    error,
    handleError,
    clearError
  }
}

/**
 * Función para manejar errores de operaciones asíncronas
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    if (errorHandler) {
      errorHandler(err)
    } else {
      console.error('Operation failed:', err)
    }
    
    return null
  }
}

/**
 * Función para manejar errores de operaciones síncronas
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  errorHandler?: (error: Error) => void
): T | null {
  try {
    return operation()
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    if (errorHandler) {
      errorHandler(err)
    } else {
      console.error('Operation failed:', err)
    }
    
    return null
  }
}