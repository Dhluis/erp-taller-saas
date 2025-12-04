'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface SessionState {
  // Auth
  user: User | null
  // Organization
  organizationId: string | null
  workshopId: string | null
  // Profile
  profile: any | null
  workshop: any | null
  // Status
  isLoading: boolean
  isReady: boolean
  error: string | null
}

interface SessionContextType extends SessionState {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: null,
    organizationId: null,
    workshopId: null,
    profile: null,
    workshop: null,
    isLoading: true,
    isReady: false,
    error: null
  })
  
  const isInitializing = useRef(false)
  const supabase = createClient()

  // UNA SOLA función que carga TODO en orden
  const loadSession = useCallback(async () => {
    // Prevenir múltiples llamadas simultáneas
    if (isInitializing.current) {
      console.log('⏸️ [Session] Ya hay una carga en progreso, ignorando...')
      return
    }
    
    isInitializing.current = true

    try {
      console.log('🔄 [Session] Iniciando carga de sesión...')
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // 1. Obtener usuario autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.log('❌ [Session] Usuario no autenticado')
        setState({
          user: null,
          organizationId: null,
          workshopId: null,
          profile: null,
          workshop: null,
          isLoading: false,
          isReady: true, // Ready pero sin usuario
          error: null
        })
        return
      }

      console.log('✅ [Session] Usuario autenticado:', user.id)

      // 2. Obtener perfil de la tabla users (con organization_id)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('❌ [Session] Error obteniendo perfil:', profileError)
        setState(prev => ({
          ...prev,
          user,
          isLoading: false,
          isReady: true,
          error: 'Perfil no encontrado'
        }))
        return
      }

      console.log('✅ [Session] Perfil cargado:', {
        id: profile.id,
        organization_id: profile.organization_id,
        workshop_id: profile.workshop_id
      })

      const organizationId = profile.organization_id
      const workshopId = profile.workshop_id || organizationId

      // 3. Obtener workshop si es necesario (UNA sola query)
      let workshop = null
      if (workshopId) {
        const { data, error: workshopError } = await supabase
          .from('workshops')
          .select('*')
          .eq('id', workshopId)
          .single()
        
        if (workshopError) {
          console.error('⚠️ [Session] Error obteniendo workshop:', workshopError)
        } else {
          workshop = data
          console.log('✅ [Session] Workshop cargado:', workshop?.name)
        }
      }

      // 4. Establecer estado final - UNA sola actualización
      setState({
        user,
        organizationId,
        workshopId,
        profile,
        workshop,
        isLoading: false,
        isReady: true,
        error: null
      })

      console.log('✅✅✅ [Session] Sesión completamente cargada')
      console.log('📊 [Session] Estado final:', {
        userId: user.id,
        organizationId,
        workshopId,
        profileId: profile.id,
        workshopName: workshop?.name
      })

    } catch (error: any) {
      console.error('❌ [Session] Error cargando sesión:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        isReady: true,
        error: error.message
      }))
    } finally {
      isInitializing.current = false
    }
  }, [supabase])

  // Cargar sesión al montar
  useEffect(() => {
    console.log('🚀 [Session] SessionProvider montado')
    loadSession()

    // Escuchar cambios de auth (solo SIGNED_IN y SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔔 [Session] Auth event: ${event}`)
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log(`🔄 [Session] Recargando sesión por: ${event}`)
        loadSession()
      } else {
        console.log(`⏭️ [Session] Ignorando evento: ${event}`)
      }
    })

    return () => {
      console.log('🧹 [Session] Limpiando suscripción')
      subscription.unsubscribe()
    }
  }, [loadSession, supabase.auth])

  const refresh = useCallback(async () => {
    console.log('🔄 [Session] Refresh manual solicitado')
    isInitializing.current = false // Permitir refresh manual
    await loadSession()
  }, [loadSession])

  const signOut = useCallback(async () => {
    console.log('👋 [Session] Cerrando sesión...')
    await supabase.auth.signOut()
    setState({
      user: null,
      organizationId: null,
      workshopId: null,
      profile: null,
      workshop: null,
      isLoading: false,
      isReady: true,
      error: null
    })
    console.log('✅ [Session] Sesión cerrada')
  }, [supabase.auth])

  return (
    <SessionContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}

// ============================================
// 🔄 HOOKS DE COMPATIBILIDAD
// ============================================
// Permiten migración gradual sin romper código existente

export function useOrganization() {
  const { organizationId, workshopId, isReady, isLoading } = useSession()
  
  return {
    organizationId,
    workshopId,
    ready: isReady,
    isReady,
    loading: isLoading,
    // Compatibilidad con código que espera `organization` object
    organization: organizationId ? { id: organizationId, organization_id: organizationId } : null
  }
}

export function useAuth() {
  const { user, profile, workshop, isLoading, signOut, refresh } = useSession()
  
  return {
    user,
    profile,
    workshop,
    organization: workshop,
    loading: isLoading,
    signOut,
    refreshProfile: refresh
  }
}

