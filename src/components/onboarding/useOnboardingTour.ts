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
const TOUR_DEPLOY_DATE = new Date('2025-01-27T00:00:00Z') // Ajustar a la fecha real del deploy

// ✅ OPCIÓN: Si no quieres filtrar por fecha, descomenta esta línea y comenta la de arriba
// const TOUR_DEPLOY_DATE = new Date('2099-12-31T00:00:00Z') // Todos los usuarios verán el tour

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

    console.log('[useOnboardingTour] 🔍 Iniciando verificación...', {
      hasUser: !!user,
      hasProfile: !!profile,
      userCreatedAt: user?.created_at,
      profileCreatedAt: profile?.created_at
    })

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    const version = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_version`)

    console.log('[useOnboardingTour] 📋 Estado localStorage:', {
      completed,
      version,
      expectedVersion: ONBOARDING_VERSION
    })

    // Si ya completó el tour, no mostrar
    if (completed && version === ONBOARDING_VERSION) {
      console.log('[useOnboardingTour] ✅ Tour ya completado, no mostrar')
      setIsFirstTime(false)
      setIsTourActive(false)
      return
    }

    // ✅ Verificar si es cuenta antigua (creada antes del deploy del tour)
    // Si el usuario fue creado ANTES de TOUR_DEPLOY_DATE, no mostrar el tour automáticamente
    let isOldAccount = false
    
    if (profile?.created_at) {
      try {
        const userCreatedAt = new Date(profile.created_at)
        isOldAccount = userCreatedAt < TOUR_DEPLOY_DATE
        console.log('[useOnboardingTour] 📅 Verificando profile.created_at:', {
          userCreatedAt: userCreatedAt.toISOString(),
          tourDeployDate: TOUR_DEPLOY_DATE.toISOString(),
          isOldAccount
        })
      } catch (e) {
        console.warn('[useOnboardingTour] ⚠️ Error parseando profile.created_at:', e)
      }
    } else if (user?.created_at) {
      try {
        // Fallback: usar created_at del usuario de auth si profile no tiene
        const userCreatedAt = new Date(user.created_at)
        isOldAccount = userCreatedAt < TOUR_DEPLOY_DATE
        console.log('[useOnboardingTour] 📅 Verificando user.created_at:', {
          userCreatedAt: userCreatedAt.toISOString(),
          tourDeployDate: TOUR_DEPLOY_DATE.toISOString(),
          isOldAccount
        })
      } catch (e) {
        console.warn('[useOnboardingTour] ⚠️ Error parseando user.created_at:', e)
      }
    } else {
      // Si no hay created_at disponible, asumir que es cuenta nueva (mostrar tour)
      // Esto es más seguro que asumir que es antigua
      console.log('[useOnboardingTour] ⚠️ No se encontró created_at, asumiendo cuenta nueva')
      isOldAccount = false
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
    console.log('[useOnboardingTour] 🎯 Es primera vez?', isFirst)
    setIsFirstTime(isFirst)

    // Si es primera vez (cuenta nueva), iniciar el tour automáticamente después de un delay
    if (isFirst) {
      console.log('[useOnboardingTour] 🎯 Cuenta nueva detectada, iniciando tour en 1 segundo...')
      // Esperar 1 segundo para que la UI se cargue completamente
      const timer = setTimeout(() => {
        console.log('[useOnboardingTour] ✅ Activando tour ahora...')
        setIsTourActive(true)
      }, 1000)

      return () => clearTimeout(timer)
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
