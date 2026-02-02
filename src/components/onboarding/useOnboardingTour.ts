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
// IMPORTANTE: Si quieres que TODOS los usuarios vean el tour (incluso antiguos), cambia esta fecha a una muy futura
// Por defecto: mostrar tour a TODOS (fecha muy futura)
const TOUR_DEPLOY_DATE = new Date('2099-12-31T00:00:00Z') // Todos los usuarios verán el tour por defecto

// Para filtrar solo usuarios nuevos, descomenta y ajusta:
// const TOUR_DEPLOY_DATE = new Date('2025-01-27T00:00:00Z') // Solo usuarios creados después de esta fecha

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
    if (typeof window === 'undefined') {
      console.log('[useOnboardingTour] ⏸️ SSR, no ejecutar')
      return
    }

    console.log('[useOnboardingTour] 🔍 Iniciando verificación...', {
      hasUser: !!user,
      hasProfile: !!profile,
      userEmail: user?.email,
      profileId: profile?.id
    })

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    const version = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_version`)

    console.log('[useOnboardingTour] 📋 Estado localStorage:', {
      completed,
      version,
      expectedVersion: ONBOARDING_VERSION
    })

    // ✅ LÓGICA SIMPLIFICADA: Solo verificar si ya completó el tour
    // Si ya completó el tour (tiene flag y versión correcta), no mostrar
    if (completed && version === ONBOARDING_VERSION) {
      console.log('[useOnboardingTour] ✅ Tour ya completado, no mostrar')
      setIsFirstTime(false)
      setIsTourActive(false)
      return
    }

    // Si NO ha completado el tour, es primera vez (sin importar fecha de creación)
    const isFirst = !completed || version !== ONBOARDING_VERSION
    console.log('[useOnboardingTour] 🎯 Es primera vez?', isFirst)
    setIsFirstTime(isFirst)

    // Si es primera vez, iniciar el tour automáticamente después de un delay
    if (isFirst) {
      console.log('[useOnboardingTour] 🎯 Iniciando tour en 2 segundos...')
      // Esperar 2 segundos para que la UI se cargue completamente
      const timer = setTimeout(() => {
        console.log('[useOnboardingTour] ✅ Activando tour ahora...')
        setIsTourActive(true)
      }, 2000)

      return () => {
        console.log('[useOnboardingTour] 🧹 Limpiando timer')
        clearTimeout(timer)
      }
    } else {
      console.log('[useOnboardingTour] ⏸️ No es primera vez, no iniciar tour')
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
