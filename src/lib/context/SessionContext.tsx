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
  // 🔥 DEPLOYMENT TRACKER: v3.0.0 - 2025-12-09-01:15 - FORCE COMMIT
  console.log('🚀 [Session] VERSION 3.0.0 - CÓDIGO ACTUALIZADO')
  console.log('📦 [Session] Deployment timestamp: 2025-12-09T01:15:00Z')
  
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
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)
  const currentStateRef = useRef<SessionState>(initialState)
  const isSigningOut = useRef(false) // 🛡️ Prevenir re-renders durante signOut
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
      
      let user: User | null = null
      let authError: any = null
      
      try {
        const result = await supabase.auth.getUser()
        user = result.data?.user ?? null
        authError = result.error ?? null
      } catch (error: any) {
        console.error('❌ [Session] Excepción al obtener usuario:', error)
        authError = error
      }
      
      if (authError) {
        // Log detallado del error
        const errorMessage = authError?.message || authError?.toString() || 'Error desconocido al obtener usuario'
        const errorCode = authError?.code || 'NO_CODE'
        const errorStatus = authError?.status || 'NO_STATUS'
        const errorName = authError?.name || ''
        
        // Verificar si es un error de "sesión faltante" o "token inválido" (estado normal, no autenticado)
        // Solo verificar indicadores específicos de sesión faltante, NO usar valores por defecto
        const isSessionMissingError = 
          // Verificar nombre del error (AuthSessionMissingError es el nombre real del error de Supabase)
          errorName?.includes('SessionMissing') ||
          errorName?.includes('AuthSessionMissing') ||
          // Verificar mensaje de error específico de sesión faltante
          (errorMessage?.toLowerCase().includes('session missing') && 
           errorMessage?.toLowerCase().includes('auth')) ||
          // Verificar status 400 con mensaje de sesión (combinación específica)
          (errorStatus === 400 && 
           errorMessage?.toLowerCase().includes('session') &&
           errorMessage?.toLowerCase().includes('missing')) ||
          // Verificar error de token de refresh inválido (también es estado normal - token expirado/corrupto)
          (errorMessage?.toLowerCase().includes('refresh token') && 
           (errorMessage?.toLowerCase().includes('not found') || 
            errorMessage?.toLowerCase().includes('invalid')))
        
        if (isSessionMissingError) {
          // No es un error real, solo significa que no hay sesión activa
          console.log('ℹ️ [Session] No hay sesión activa (usuario no autenticado)')
          lastUserId.current = null
          const noUserState = {
            user: null,
            organizationId: null,
            workshopId: null,
            profile: null,
            workshop: null,
            isLoading: false,
            isReady: true,
            error: null // No es un error, es estado normal
          }
          currentStateRef.current = noUserState
          setState(noUserState)
          return
        }
        
        // Es un error real (red, servidor, etc.)
        console.error('❌ [Session] ===== ERROR OBTENIENDO USUARIO =====')
        console.error('❌ [Session] Mensaje:', errorMessage)
        console.error('❌ [Session] Código:', errorCode)
        console.error('❌ [Session] Status:', errorStatus)
        console.error('❌ [Session] Tipo de error:', typeof authError)
        console.error('❌ [Session] Error completo:', authError)
        console.error('❌ [Session] =====================================')
        
        lastUserId.current = null
        const noUserState = {
          user: null,
          organizationId: null,
          workshopId: null,
          profile: null,
          workshop: null,
          isLoading: false,
          isReady: true,
          error: errorMessage
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
        
        // Si el error es que no existe el perfil, intentar crearlo automáticamente
        if (profileError.code === 'PGRST116') {
          console.warn('⚠️ [Session] PERFIL NO ENCONTRADO - Intentando crear perfil automáticamente...')
          console.log('🔍 [Session] Creando registro en public.users con:')
          console.log('   - id =', user.id)
          console.log('   - auth_user_id =', user.id)
          console.log('   - email =', user.email)
          
          // Intentar crear el perfil básico
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id, // El id debe coincidir con auth.users.id según el schema
              auth_user_id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              organization_id: user.user_metadata?.organization_id || null,
              workshop_id: null, // Se asignará en onboarding
              role: 'ASESOR', // Rol por defecto
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (!createError && newProfile) {
            console.log('✅ [Session] Perfil creado automáticamente')
            profile = newProfile
            profileError = null
          } else {
            console.error('❌ [Session] Error al crear perfil automáticamente:', createError)
            console.error('🔍 [Session] Verificar que existe un registro en public.users con:')
            console.error('   - auth_user_id =', user.id)
            console.error('   - email =', user.email)
            
            // Si no se pudo crear, continuar sin perfil pero permitir onboarding
            const errorState = {
              ...currentStateRef.current,
              user,
              organizationId: null,
              workshopId: null,
              profile: null,
              isLoading: false,
              isReady: true,
              error: null // No es un error fatal, el usuario puede completar onboarding
            }
            currentStateRef.current = errorState
            setState(errorState)
            console.warn('⚠️ [Session] Usuario sin perfil - será redirigido a onboarding')
            return
          }
        } else {
          // Otro tipo de error (permisos, conexión, etc.)
          const errorState = {
            ...currentStateRef.current,
            user,
            isLoading: false,
            isReady: true,
            error: `Error obteniendo perfil: ${profileError.message}`
          }
          currentStateRef.current = errorState
          setState(errorState)
          return
        }
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
        console.warn('📋 [Session] Detalles del perfil:', {
          profileId: profile.id,
          profileEmail: profile.email,
          profileOrganizationId: profile.organization_id,
          profileWorkshopId: profile.workshop_id,
          hasAuthUserId: !!profile.auth_user_id,
          authUserId: profile.auth_user_id
        })
      } else {
        console.log('✅ [Session] Usuario con organización válida:', organizationId)
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
        // 🛡️ Verificar TANTO el ref COMO sessionStorage (persiste entre page reloads)
        const isManualSignOut = sessionStorage.getItem('isSigningOut') === 'true'
        console.log(`🔍 [Session] SIGNED_OUT detectado - isSigningOut (ref): ${isSigningOut.current}, (sessionStorage): ${isManualSignOut}`)
        
        if (isManualSignOut || isSigningOut.current) {
          console.log('⏭️ [Session] SIGNED_OUT causado por signOut manual, ignorando...')
          // Limpiar el flag
          sessionStorage.removeItem('isSigningOut')
          isSigningOut.current = false
          return
        }
        
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
    // Resetear el estado para forzar recarga completa
    lastUserId.current = null
    lastLoadTimestamp.current = 0
    isInitializing.current = false // Permitir refresh manual
    await loadSession(true) // Forzar recarga en refresh manual
  }, [loadSession])

  const signOut = useCallback(async () => {
    console.log('👋 [Session] Cerrando sesión...')
    console.log('🔒 [Session] Marcando flag de signOut en sessionStorage')
    
    // 🛡️ SOLUCIÓN DEFINITIVA: Usar sessionStorage para persistir el flag entre page reloads
    sessionStorage.setItem('isSigningOut', 'true')
    isSigningOut.current = true
    
    // Ejecutar signOut en paralelo con redirección inmediata
    console.log('📤 [Session] Llamando a supabase.auth.signOut()')
    supabase.auth.signOut().catch(err => console.error('Error signOut:', err))
    
    // Redirigir INMEDIATAMENTE (no esperar a que signOut termine)
    console.log('🚀 [Session] Ejecutando redirección a /auth/login')
    window.location.replace('/auth/login')
  }, [supabase.auth])

  // useEffect separado para manejar redirección a onboarding
  // Evita error React #300 al separar la redirección del flujo de carga
  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current)
      redirectTimeout.current = null
    }

    // Solo ejecutar si ya terminó de cargar y hay usuario pero no organización
    if (!state.isLoading && state.user && state.profile && !state.organizationId) {
      const currentPath = window.location.pathname
      
      // Evitar loop - no redirigir si ya estamos en onboarding o auth
      if (!currentPath.startsWith('/onboarding') && !currentPath.startsWith('/auth')) {
        console.log('[Session] 🚀 Ejecutando redirección a onboarding...')
        
        // Capturar el estado actual y el pathname para verificar en el callback
        const userId = state.user.id
        const profileId = state.profile?.id
        const initialPath = currentPath
        
        // Usar setTimeout para evitar conflicto con el renderizado
        redirectTimeout.current = setTimeout(() => {
          // Verificar múltiples condiciones antes de redirigir:
          // 1. Componente aún montado
          // 2. Usuario aún autenticado (mismo ID)
          // 3. Perfil aún existe (mismo ID)
          // 4. Aún no tiene organizationId
          // 5. Pathname no haya cambiado a onboarding o auth
          const currentState = currentStateRef.current
          const currentPathNow = window.location.pathname
          
          const shouldRedirect = 
            isMounted.current &&
            currentState.user?.id === userId &&
            currentState.profile?.id === profileId &&
            !currentState.organizationId &&
            !currentState.isLoading &&
            !currentPathNow.startsWith('/onboarding') &&
            !currentPathNow.startsWith('/auth')
          
          if (shouldRedirect) {
            console.log('[Session] ✅ Condiciones verificadas, redirigiendo a onboarding...')
            window.location.href = '/onboarding'
          } else {
            console.log('[Session] ⏸️ Condiciones cambiaron, cancelando redirección:', {
              isMounted: isMounted.current,
              sameUser: currentState.user?.id === userId,
              sameProfile: currentState.profile?.id === profileId,
              hasOrganization: !!currentState.organizationId,
              isLoading: currentState.isLoading,
              currentPath: currentPathNow
            })
          }
        }, 100)
      }
    }

    // Cleanup: limpiar timeout si el componente se desmonta o cambian las dependencias
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }
    }
  }, [state.isLoading, state.user, state.profile, state.organizationId])

  // Cleanup al desmontar el componente
  useEffect(() => {
    isMounted.current = true
    
    return () => {
      isMounted.current = false
      // Limpiar todos los timeouts al desmontar
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
        debounceTimeout.current = null
      }
    }
  }, [])

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

