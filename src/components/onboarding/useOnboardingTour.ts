/**
 * Hook para manejar el tour de onboarding
 * Detecta si es la primera vez que el usuario entra y muestra el tour
 * 
 * IMPORTANTE: Solo se muestra a usuarios NUEVOS (creados después del deploy del tour)
 * Las cuentas antiguas no verán el tour automáticamente
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/context/SessionContext'

const ONBOARDING_STORAGE_KEY = 'eagles_erp_onboarding_completed'
const ONBOARDING_VERSION = '1.0' // Incrementar si cambias los pasos del tour

// ✅ Fecha de deploy del tour - usuarios creados ANTES de esta fecha NO verán el tour automáticamente
const TOUR_DEPLOY_DATE = new Date('2025-01-27T00:00:00Z') // Ajustar a la fecha real del deploy

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
  const session = useSession()
  const user = session?.user
  const profile = session?.profile

  // Verificar si es la primera vez al montar
  useEffect(() => {
    if (typeof window === 'undefined') return

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    const version = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_version`)

    // Si ya completó el tour, no mostrar
    if (completed && version === ONBOARDING_VERSION) {
      setIsFirstTime(false)
      setIsTourActive(false)
      return
    }

    // ✅ Verificar si es cuenta antigua (creada antes del deploy del tour)
    // Si el usuario fue creado ANTES de TOUR_DEPLOY_DATE, no mostrar el tour automáticamente
    let isOldAccount = false
    
    if (profile?.created_at) {
      const userCreatedAt = new Date(profile.created_at)
      isOldAccount = userCreatedAt < TOUR_DEPLOY_DATE
    } else if (user?.created_at) {
      // Fallback: usar created_at del usuario de auth si profile no tiene
      const userCreatedAt = new Date(user.created_at)
      isOldAccount = userCreatedAt < TOUR_DEPLOY_DATE
    }

    // Si es cuenta antigua, marcar como completado automáticamente (sin mostrar el tour)
    if (isOldAccount) {
      console.log('[useOnboardingTour] ✅ Cuenta antigua detectada, no mostrar tour automáticamente')
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_version`, ONBOARDING_VERSION)
      setIsFirstTime(false)
      setIsTourActive(false)
      return
    }

    // Si es cuenta nueva y no ha completado el tour, es primera vez
    const isFirst = !completed || version !== ONBOARDING_VERSION
    setIsFirstTime(isFirst)

    // Si es primera vez (cuenta nueva), iniciar el tour automáticamente después de un delay
    if (isFirst) {
      console.log('[useOnboardingTour] 🎯 Cuenta nueva detectada, iniciando tour...')
      // Esperar 1 segundo para que la UI se cargue completamente
      const timer = setTimeout(() => {
        setIsTourActive(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [user, profile])

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
