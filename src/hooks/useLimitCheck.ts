'use client'

import { useState, useCallback } from 'react'
import type { LimitError } from '@/types/billing'

interface ApiErrorResponse {
  status?: number
  error?: string
  limit_reached?: boolean
  current?: number
  limit?: number
  upgrade_url?: string
  feature?: string
}

/**
 * Hook para manejar errores de límite de plan
 * 
 * @example
 * ```tsx
 * const { limitError, showUpgradeModal, handleApiError, closeUpgradeModal } = useLimitCheck()
 * 
 * const response = await fetch('/api/orders', { method: 'POST', ... })
 * if (!response.ok) {
 *   const error = await response.json()
 *   if (handleApiError({ status: response.status, ...error })) {
 *     return // Se mostró el modal de upgrade
 *   }
 * }
 * ```
 */
export function useLimitCheck() {
  const [limitError, setLimitError] = useState<LimitError | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  /**
   * Maneja errores de API y detecta si son errores de límite alcanzado
   * @param error - Error de la API (puede ser objeto o Response)
   * @returns true si fue un error de límite, false si fue otro tipo de error
   */
  const handleApiError = useCallback((error: ApiErrorResponse | Response | Error): boolean => {
    // Si es un Response, extraer datos
    if (error instanceof Response) {
      if (error.status === 403) {
        error.json().then((data: ApiErrorResponse) => {
          if (data.limit_reached || data.upgrade_url) {
            setLimitError({
              error: 'limit_reached',
              message: data.error || 'Has alcanzado el límite de tu plan',
              current: data.current || 0,
              limit: data.limit || 0,
              feature: data.feature || 'unknown',
              upgrade_url: data.upgrade_url || '/dashboard/billing',
              plan_required: 'premium'
            })
            setShowUpgradeModal(true)
          }
        })
        return true
      }
      return false
    }

    // Si es un Error estándar, no es de límite
    if (error instanceof Error) {
      return false
    }

    // Si es un objeto con status 403 o upgrade_url, es error de límite
    const apiError = error as ApiErrorResponse
    if (apiError.status === 403 || apiError.limit_reached || apiError.upgrade_url) {
      setLimitError({
        error: 'limit_reached',
        message: apiError.error || 'Has alcanzado el límite de tu plan',
        current: apiError.current || 0,
        limit: apiError.limit || 0,
        feature: apiError.feature || 'unknown',
        upgrade_url: apiError.upgrade_url || '/dashboard/billing',
        plan_required: 'premium'
      })
      setShowUpgradeModal(true)
      return true
    }

    return false
  }, [])

  /**
   * Cierra el modal de upgrade y limpia el error
   */
  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false)
    setLimitError(null)
  }, [])

  /**
   * Abre el modal de upgrade manualmente (útil para prevenir antes de intentar crear)
   */
  const showUpgrade = useCallback((error?: LimitError) => {
    if (error) {
      setLimitError(error)
    }
    setShowUpgradeModal(true)
  }, [])

  return {
    limitError,
    showUpgradeModal,
    handleApiError,
    closeUpgradeModal,
    showUpgrade,
  }
}
