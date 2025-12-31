'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface SessionState {
  // Auth
  user: User | null
  // Organization
  organizationId: string | null
  workshopId: string | null // ✅ Workshop ID dinámico (calculado inteligentemente)
  // Profile
  profile: any | null
  workshop: any | null
  // Status
  isLoading: boolean
  isReady: boolean
  error: string | null
  // Multi-workshop support
  hasMultipleWorkshops: boolean // ✅ Indicador si la org tiene múltiples workshops
}

interface SessionContextType extends SessionState {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // 🔥 DEPLOYMENT TRACKER: v4.0.0 - 2025-12-09-04:00 - FORCE REBUILD
  // ✅ Usar console.debug para logs de versión (reducir ruido en consola)
  console.debug('🚀 [Session] VERSION 4.0.0 - TODOS LOS BUGS CORREGIDOS')
  console.debug('📦 [Session] Deployment timestamp: 2025-12-09T04:00:00Z')
  
  const initialState: SessionState = {
    user: null,
    organizationId: null,
    workshopId: null,
    profile: null,
    workshop: null,
    isLoading: true,
    isReady: false,
    error: null,
    hasMultipleWorkshops: false
  }
  
  const [state, setState] = useState<SessionState>(initialState)
  
  // ✅ Listener para recargar sesión cuando se dispara el evento
  useEffect(() => {
    const handleSessionReload = () => {
      console.log('🔄 [Session] Evento session:reload recibido, recargando sesión...')
      loadSession(true) // Forzar recarga
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('session:reload', handleSessionReload)
      return () => {
        window.removeEventListener('session:reload', handleSessionReload)
      }
    }
  }, [loadSession])
  
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
            error: null, // No es un error, es estado normal
            hasMultipleWorkshops: false
          }
          currentStateRef.current = noUserState
          setState(noUserState)
          return
        }
        
        // Es un error real (red, servidor, etc.)
        // ✅ FIX: No bloquear la aplicación por errores de autenticación
        console.warn('⚠️ [Session] Error obteniendo usuario (continuando sin bloquear):', errorMessage)
        
        lastUserId.current = null
        const noUserState = {
          user: null,
          organizationId: null,
          workshopId: null,
          profile: null,
          workshop: null,
          isLoading: false,
          isReady: true,
          error: null, // No mostrar error para permitir acceso
          hasMultipleWorkshops: false
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
          error: null,
          hasMultipleWorkshops: false
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
      // Usar endpoint API para evitar problemas de RLS
      console.log('🔍 [Session] Paso 2: Buscando perfil en tabla users...')
      console.log('🔍 [Session] Buscando perfil para auth_user_id:', user.id)
      
      let profile: any = null
      let profileError: any = null
      
      try {
        // Usar endpoint API que usa Service Role (bypass RLS)
        const response = await fetch('/api/users/me', {
          credentials: 'include',
          cache: 'no-store'
        })
        
        if (response.ok) {
          const data = await response.json()
          profile = data.profile
          console.log('✅ [Session] Perfil obtenido desde API')
        } else {
          const errorData = await response.json()
          profileError = {
            code: response.status.toString(),
            message: errorData.error || 'Error al obtener perfil',
            details: null,
            hint: null
          }
          console.error('❌ [Session] Error obteniendo perfil desde API:', profileError)
        }
      } catch (fetchError: any) {
        profileError = {
          code: 'FETCH_ERROR',
          message: fetchError.message || 'Error al obtener perfil',
          details: null,
          hint: null
        }
        console.error('❌ [Session] Error en fetch a /api/users/me:', fetchError)
      }

      if (profileError) {
        console.error('❌ [Session] Error obteniendo perfil:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        // Si el error es que no existe el perfil (404), el endpoint /api/users/me lo creará automáticamente
        // Intentar recargar el perfil después de un breve delay para dar tiempo a la creación
        if (profileError.code === '404' || profileError.code === 'PGRST116') {
          console.warn('⚠️ [Session] PERFIL NO ENCONTRADO - El endpoint lo creará automáticamente')
          console.log('🔄 [Session] Esperando creación automática del perfil...')
          
          // Esperar un momento y recargar (el endpoint /api/users/me creará el perfil automáticamente)
          setTimeout(async () => {
            if (!isMounted.current) return
            
            try {
              const retryResponse = await fetch('/api/users/me', {
                credentials: 'include',
                cache: 'no-store'
              })
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                if (retryData.profile) {
                  console.log('✅ [Session] Perfil creado automáticamente, recargando sesión...')
                  // Recargar la sesión completa
                  await loadSession(true)
                  return
                }
              }
            } catch (retryErr) {
              console.error('❌ [Session] Error al recargar perfil:', retryErr)
            }
            
            // Si después del retry aún no hay perfil, continuar sin él
            const errorState = {
              ...currentStateRef.current,
              user,
              organizationId: null,
              workshopId: null,
              profile: null,
              isLoading: false,
              isReady: true,
              error: null,
              hasMultipleWorkshops: false
            }
            currentStateRef.current = errorState
            setState(errorState)
          }, 1000) // Esperar 1 segundo para dar tiempo a la creación
          
          // Mientras tanto, establecer estado de carga
          const loadingState = {
            ...currentStateRef.current,
            user,
            isLoading: true,
            isReady: false
          }
          currentStateRef.current = loadingState
          setState(loadingState)
          return
        } else {
          // Otro tipo de error (permisos, conexión, etc.)
          const errorState = {
            ...currentStateRef.current,
            user,
            isLoading: false,
            isReady: true,
            error: `Error obteniendo perfil: ${profileError.message}`,
            hasMultipleWorkshops: false
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
          error: 'Perfil no encontrado (null)',
          hasMultipleWorkshops: false
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
      const userWorkshopId = profile.workshop_id || null
      
      console.log('📊 [Session] IDs extraídos del perfil:', {
        organizationId,
        userWorkshopId,
        hasOrganization: !!organizationId,
        hasUserWorkshop: !!userWorkshopId
      })

      // 3. Obtener workshop_id dinámicamente (inteligente)
      let workshopId: string | null = null
      let workshop = null
      let workshopsCount = 0
      
      if (organizationId) {
        // Si el usuario tiene workshop_id asignado, usarlo
        if (userWorkshopId) {
          workshopId = userWorkshopId
          console.log('✅ [Session] Usando workshop_id del perfil:', workshopId)
        } else {
          // Si no, buscar workshops de la organización
          console.log('🔍 [Session] Buscando workshops de la organización...')
          const { data: workshops, error: workshopsError } = await supabase
            .from('workshops')
            .select('id')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true })
          
          if (workshopsError) {
            console.error('⚠️ [Session] Error obteniendo workshops:', workshopsError)
          } else {
            workshopsCount = workshops?.length || 0
            console.log(`📊 [Session] Workshops encontrados: ${workshopsCount}`)
            
            // Si solo hay 1 workshop, usar ese automáticamente
            if (workshops && workshops.length === 1) {
              workshopId = workshops[0].id
              console.log('✅ [Session] Un solo workshop encontrado, usando automáticamente:', workshopId)
            } else if (workshops && workshops.length > 1) {
              console.log('⚠️ [Session] Múltiples workshops encontrados, workshop_id será null (usuario debe elegir)')
              // workshopId permanece null - el usuario debe tener uno asignado o elegir
            }
          }
        }
        
        // Obtener datos completos del workshop si tenemos workshopId
        if (workshopId) {
          const { data: workshopData, error: workshopError } = await supabase
            .from('workshops')
            .select('*')
            .eq('id', workshopId)
            .single()
          
          if (workshopError) {
            console.error('⚠️ [Session] Error obteniendo workshop:', workshopError)
          } else {
            workshop = workshopData
            console.log('✅ [Session] Workshop cargado:', workshop?.name)
          }
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
        error: null,
        hasMultipleWorkshops: workshopsCount > 1
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
        hasWorkshop: !!workshopId,
        hasMultipleWorkshops: workshopsCount > 1,
        workshopsCount
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
      // ✅ FIX: No bloquear la aplicación por errores de sesión
      // Permitir que la aplicación cargue aunque haya errores
      console.warn('⚠️ [Session] Error cargando sesión (continuando sin bloquear):', error)
      const errorState = {
        ...currentStateRef.current,
        isLoading: false,
        isReady: true,
        error: null, // No mostrar error para permitir acceso
        hasMultipleWorkshops: false
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
        }, 800) // ✅ FIX: Debounce aumentado a 800ms para OAuth (dar tiempo a que cookies se sincronicen)
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

    // ⚠️ ONBOARDING DESACTIVADO: El registro ya crea la organización
    // Si un usuario no tiene organizationId después del registro, es un error que debe corregirse
    // No redirigir automáticamente a onboarding
    if (!state.isLoading && state.user && state.profile && !state.organizationId) {
      console.warn('[Session] ⚠️ Usuario autenticado sin organization_id - esto no debería pasar si el registro fue correcto')
      // No redirigir - dejar que el usuario acceda normalmente
      // Si necesita organización, debería ver un error o mensaje apropiado
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

