/**
 * Hook para manejar el tour de onboarding
 * Detecta si es la primera vez que el usuario entra y muestra el tour
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

const ONBOARDING_STORAGE_KEY = 'eagles_erp_onboarding_completed'
const ONBOARDING_VERSION = '1.0' // Incrementar si cambias los pasos del tour

interface UseOnboardingTourReturn {
  isFirstTime: boolean
  isTourActive: boolean
  startTour: () => void
  stopTour: () => void
  skipTour: () => void
  resetTour: () => void
}

export function useOnboardingTour(): UseOnboardingTourReturn {
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)

  // Verificar si es la primera vez al montar
  useEffect(() => {
    if (typeof window === 'undefined') return

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    const version = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_version`)

    // Si no ha completado el tour o la versión cambió, es primera vez
    const isFirst = !completed || version !== ONBOARDING_VERSION

    setIsFirstTime(isFirst)

    // Si es primera vez, iniciar el tour automáticamente después de un delay
    if (isFirst) {
      // Esperar 1 segundo para que la UI se cargue completamente
      const timer = setTimeout(() => {
        setIsTourActive(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [])

  const startTour = useCallback(() => {
    setIsTourActive(true)
  }, [])

  const stopTour = useCallback(() => {
    setIsTourActive(false)
    // Marcar como completado
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_version`, ONBOARDING_VERSION)
    setIsFirstTime(false)
  }, [])

  const skipTour = useCallback(() => {
    setIsTourActive(false)
    // Marcar como completado sin ver el tour
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_version`, ONBOARDING_VERSION)
    setIsFirstTime(false)
  }, [])

  const resetTour = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    localStorage.removeItem(`${ONBOARDING_STORAGE_KEY}_version`)
    setIsFirstTime(true)
    setIsTourActive(true)
  }, [])

  return {
    isFirstTime,
    isTourActive,
    startTour,
    stopTour,
    skipTour,
    resetTour
  }
}
