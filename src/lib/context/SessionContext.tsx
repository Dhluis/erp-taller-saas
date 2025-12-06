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
  const initialState: SessionState = {
    user: null,
    organizationId: null,
    workshopId: null,
    profile: null,
    workshop: null,
    isLoading: true,
    isReady: false,
    error: null
  }
  
  const [state, setState] = useState<SessionState>(initialState)
  
  const isInitializing = useRef(false)
  const lastLoadTimestamp = useRef<number>(0)
  const lastUserId = useRef<string | null>(null)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const currentStateRef = useRef<SessionState>(initialState)
  const supabase = createClient()

  // UNA SOLA función que carga TODO en orden
  const loadSession = useCallback(async (force = false) => {
    // Prevenir múltiples llamadas simultáneas
    if (isInitializing.current) {
      console.log('⏸️ [Session] Ya hay una carga en progreso, ignorando...')
      return
    }

    // Prevenir recargas muy frecuentes (debounce de 500ms)
    const now = Date.now()
    const timeSinceLastLoad = now - lastLoadTimestamp.current
    
    if (!force && timeSinceLastLoad < 500) {
      console.log(`⏸️ [Session] Recarga muy reciente (${timeSinceLastLoad}ms), ignorando...`)
      return
    }
    
    isInitializing.current = true
    lastLoadTimestamp.current = now

    try {
      console.log('🔄 [Session] Iniciando carga de sesión...')
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // 1. Obtener usuario autenticado
      console.log('🔍 [Session] Paso 1: Obteniendo usuario autenticado...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('❌ [Session] Error obteniendo usuario:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        })
        lastUserId.current = null
        const noUserState = {
          user: null,
          organizationId: null,
          workshopId: null,
          profile: null,
          workshop: null,
          isLoading: false,
          isReady: true,
          error: authError.message
        }
        currentStateRef.current = noUserState
        setState(noUserState)
        return
      }

      if (!user) {
        console.log('❌ [Session] Usuario no autenticado (no user object)')
        lastUserId.current = null
        const noUserState = {
          user: null,
          organizationId: null,
          workshopId: null,
          profile: null,
          workshop: null,
          isLoading: false,
          isReady: true,
          error: null
        }
        currentStateRef.current = noUserState
        setState(noUserState)
        return
      }

      console.log('✅ [Session] Usuario autenticado encontrado:', {
        id: user.id,
        email: user.email,
        email_confirmed: user.email_confirmed_at ? 'Sí' : 'No'
      })

      // Verificar si el usuario es el mismo y ya tenemos los datos cargados
      const currentState = currentStateRef.current
      if (!force && lastUserId.current === user.id && currentState.user?.id === user.id && currentState.isReady) {
        console.log('⏭️ [Session] Usuario ya cargado, evitando recarga innecesaria')
        isInitializing.current = false
        return
      }

      lastUserId.current = user.id

      // 2. Obtener perfil de la tabla users (con organization_id)
      console.log('🔍 [Session] Paso 2: Buscando perfil en tabla users...')
      console.log('🔍 [Session] Buscando perfil para auth_user_id:', user.id)
      
      // Intentar primero con auth_user_id
      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      // Si falla, intentar con email como fallback
      if (profileError && (profileError.code === 'PGRST116' || profileError.code === '42703')) {
        console.warn('⚠️ [Session] Perfil no encontrado con auth_user_id, intentando con email...')
        console.log('🔍 [Session] Buscando perfil para email:', user.email)
        
        const { data: profileByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single()
        
        if (!emailError && profileByEmail) {
          console.log('✅ [Session] Perfil encontrado por email')
          profile = profileByEmail
          profileError = null
        } else {
          console.error('❌ [Session] Error obteniendo perfil por email:', emailError)
          profileError = emailError || profileError
        }
      }

      if (profileError) {
        console.error('❌ [Session] Error obteniendo perfil:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        // Si el error es que no existe el perfil, es un problema diferente
        if (profileError.code === 'PGRST116') {
          console.error('❌ [Session] PERFIL NO ENCONTRADO - El usuario no tiene registro en public.users')
          console.error('🔍 [Session] Verificar que existe un registro en public.users con:')
          console.error('   - auth_user_id =', user.id)
          console.error('   - email =', user.email)
        }
        
        const errorState = {
          ...currentStateRef.current,
          user,
          isLoading: false,
          isReady: true,
          error: `Perfil no encontrado: ${profileError.message}`
        }
        currentStateRef.current = errorState
        setState(errorState)
        return
      }

      if (!profile) {
        console.error('❌ [Session] Perfil es null o undefined')
        const errorState = {
          ...currentStateRef.current,
          user,
          isLoading: false,
          isReady: true,
          error: 'Perfil no encontrado (null)'
        }
        currentStateRef.current = errorState
        setState(errorState)
        return
      }

      console.log('✅ [Session] Perfil encontrado:', {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        email: profile.email,
        organization_id: profile.organization_id,
        workshop_id: profile.workshop_id,
        role: profile.role,
        full_name: profile.full_name || profile.name
      })
      
      console.log('📋 [Session] Organization ID del perfil:', profile.organization_id)

      const organizationId = profile.organization_id || null
      const workshopId = profile.workshop_id || null
      
      console.log('📊 [Session] IDs extraídos del perfil:', {
        organizationId,
        workshopId,
        hasOrganization: !!organizationId,
        hasWorkshop: !!workshopId
      })

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
      const newState = {
        user,
        organizationId,
        workshopId,
        profile,
        workshop,
        isLoading: false,
        isReady: true,
        error: null
      }
      
      currentStateRef.current = newState
      setState(newState)

      console.log('✅✅✅ [Session] Sesión completamente cargada')
      console.log('📊 [Session] Estado final:', {
        userId: user.id,
        userEmail: user.email,
        organizationId,
        workshopId,
        profileId: profile.id,
        profileEmail: profile.email,
        profileRole: profile.role,
        workshopName: workshop?.name,
        hasOrganization: !!organizationId,
        hasWorkshop: !!workshopId
      })
      
      // Verificar que tenemos los datos mínimos necesarios
      if (!organizationId) {
        console.warn('⚠️ [Session] Usuario sin organization_id - será redirigido a onboarding')
      }

    } catch (error: any) {
      console.error('❌ [Session] Error cargando sesión:', error)
      const errorState = {
        ...currentStateRef.current,
        isLoading: false,
        isReady: true,
        error: error.message
      }
      currentStateRef.current = errorState
      setState(errorState)
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
      
      if (event === 'SIGNED_OUT') {
        console.log(`🔄 [Session] Recargando sesión por: ${event}`)
        lastUserId.current = null
        loadSession(true) // Forzar recarga en logout
      } else if (event === 'SIGNED_IN') {
        // Debounce para eventos SIGNED_IN múltiples
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current)
        }
        
        debounceTimeout.current = setTimeout(() => {
          // Verificar si el usuario cambió antes de recargar
          const currentUserId = session?.user?.id
          const currentState = currentStateRef.current
          if (currentUserId && lastUserId.current === currentUserId && currentState.isReady) {
            console.log('⏭️ [Session] SIGNED_IN duplicado ignorado (mismo usuario ya cargado)')
            return
          }
          
          console.log(`🔄 [Session] Recargando sesión por: ${event}`)
          loadSession()
        }, 300) // Debounce de 300ms para eventos SIGNED_IN
      } else {
        console.log(`⏭️ [Session] Ignorando evento: ${event}`)
      }
    })

    return () => {
      console.log('🧹 [Session] Limpiando suscripción')
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
      subscription.unsubscribe()
    }
  }, [loadSession, supabase.auth])

  const refresh = useCallback(async () => {
    console.log('🔄 [Session] Refresh manual solicitado')
    isInitializing.current = false // Permitir refresh manual
    await loadSession(true) // Forzar recarga en refresh manual
  }, [loadSession])

  const signOut = useCallback(async () => {
    console.log('👋 [Session] Cerrando sesión...')
    await supabase.auth.signOut()
    lastUserId.current = null
    const clearedState = {
      user: null,
      organizationId: null,
      workshopId: null,
      profile: null,
      workshop: null,
      isLoading: false,
      isReady: true,
      error: null
    }
    currentStateRef.current = clearedState
    setState(clearedState)
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

