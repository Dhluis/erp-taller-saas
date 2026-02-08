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
  const handleApiError = useCallback(async (error: ApiErrorResponse | Response | Error): Promise<boolean> => {
    // Si es un Response, extraer datos
    if (error instanceof Response) {
      if (error.status === 403) {
        try {
          const data: ApiErrorResponse = await error.json()
          if (data.limit_reached || data.upgrade_url) {
            setLimitError({
              type: 'limit_exceeded',
              resource: 'work_order', // Se puede inferir del contexto o pasar como parámetro
              message: data.error || 'Has alcanzado el límite de tu plan',
              current: data.current,
              limit: data.limit,
              feature: data.feature || 'max_orders_per_month',
              upgrade_url: data.upgrade_url || '/dashboard/billing',
              plan_required: 'premium'
            })
            setShowUpgradeModal(true)
            return true
          }
        } catch (e) {
          console.error('[useLimitCheck] Error parsing response:', e)
        }
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
      // Determinar el tipo de recurso basado en el feature
      let resource: LimitError['resource'] = 'work_order'
      if (apiError.feature?.includes('users')) resource = 'user'
      else if (apiError.feature?.includes('customers')) resource = 'customer'
      else if (apiError.feature?.includes('inventory')) resource = 'inventory_item'
      else if (apiError.feature?.includes('whatsapp')) resource = 'whatsapp_conversation'
      
      setLimitError({
        type: 'limit_exceeded',
        resource,
        message: apiError.error || 'Has alcanzado el límite de tu plan',
        current: apiError.current,
        limit: apiError.limit,
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
