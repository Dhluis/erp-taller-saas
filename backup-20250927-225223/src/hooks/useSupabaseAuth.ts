/**
 * Hooks de Autenticación para Supabase
 * Proporciona manejo de estado de autenticación, sesiones y usuarios
 */

import { useState, useEffect, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getBrowserClient, getCurrentUser, isAuthenticated } from '@/lib/supabase/client-robust'
import { useErrorHandler } from '@/lib/utils/error-handler'
import { AppError, ValidationError, SupabaseError } from '@/lib/errors'

// Tipos para el hook
export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>
  refreshSession: () => Promise<{ success: boolean; error?: string }>
  clearError: () => void
}

export interface UseAuthResult extends AuthState, AuthActions {}

/**
 * Hook principal de autenticación
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { handleAsyncError } = useErrorHandler()

  // Inicializar autenticación
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        const { user: currentUser, session: currentSession, error: authError } = await getCurrentUser()

        if (authError) {
          throw new SupabaseError('Error getting current user', authError)
        }

        if (mounted) {
          setUser(currentUser)
          setSession(currentSession)
        }
      } catch (err) {
        if (mounted) {
          const appError = handleError(err)
          setError(appError.message)
          console.error('❌ Error inicializando autenticación:', appError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Configurar listener de cambios de autenticación
    const supabase = getBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id)
        
        if (mounted) {
          setUser(session?.user ?? null)
          setSession(session)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [handleAsyncError])

  // Sign In
  const signIn = useCallback(async (email: string, password: string) => {
    return handleAsyncError(async () => {
      if (!email || !password) {
        throw new ValidationError('Email y contraseña son requeridos')
      }

      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw new SupabaseError('Error signing in', error)
      }

      if (!data.user) {
        throw new ValidationError('No se pudo autenticar el usuario')
      }

      return { success: true }
    }, { success: false, error: 'Error al iniciar sesión' })
  }, [handleAsyncError])

  // Sign Up
  const signUp = useCallback(async (email: string, password: string, userData?: any) => {
    return handleAsyncError(async () => {
      if (!email || !password) {
        throw new ValidationError('Email y contraseña son requeridos')
      }

      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) {
        throw new SupabaseError('Error signing up', error)
      }

      if (!data.user) {
        throw new ValidationError('No se pudo crear el usuario')
      }

      return { success: true }
    }, { success: false, error: 'Error al registrarse' })
  }, [handleAsyncError])

  // Sign Out
  const signOut = useCallback(async () => {
    return handleAsyncError(async () => {
      const supabase = getBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw new SupabaseError('Error signing out', error)
      }

      setUser(null)
      setSession(null)

      return { success: true }
    }, { success: false, error: 'Error al cerrar sesión' })
  }, [handleAsyncError])

  // Reset Password
  const resetPassword = useCallback(async (email: string) => {
    return handleAsyncError(async () => {
      if (!email) {
        throw new ValidationError('Email es requerido')
      }

      const supabase = getBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw new SupabaseError('Error resetting password', error)
      }

      return { success: true }
    }, { success: false, error: 'Error al resetear contraseña' })
  }, [handleAsyncError])

  // Update Password
  const updatePassword = useCallback(async (newPassword: string) => {
    return handleAsyncError(async () => {
      if (!newPassword) {
        throw new ValidationError('Nueva contraseña es requerida')
      }

      const supabase = getBrowserClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new SupabaseError('Error updating password', error)
      }

      return { success: true }
    }, { success: false, error: 'Error al actualizar contraseña' })
  }, [handleAsyncError])

  // Update Profile
  const updateProfile = useCallback(async (updates: any) => {
    return handleAsyncError(async () => {
      if (!updates) {
        throw new ValidationError('Updates son requeridos')
      }

      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) {
        throw new SupabaseError('Error updating profile', error)
      }

      if (data.user) {
        setUser(data.user)
      }

      return { success: true }
    }, { success: false, error: 'Error al actualizar perfil' })
  }, [handleAsyncError])

  // Refresh Session
  const refreshSession = useCallback(async () => {
    return handleAsyncError(async () => {
      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        throw new SupabaseError('Error refreshing session', error)
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }

      return { success: true }
    }, { success: false, error: 'Error al refrescar sesión' })
  }, [handleAsyncError])

  // Clear Error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
    clearError
  }
}

/**
 * Hook para verificar si el usuario está autenticado
 */
export function useIsAuthenticated(): boolean {
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated()
        setIsAuth(authenticated)
      } catch (error) {
        console.error('❌ Error verificando autenticación:', error)
        setIsAuth(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  return isAuth && !loading
}

/**
 * Hook para obtener el usuario actual
 */
export function useCurrentUser(): { user: User | null; loading: boolean; error: string | null } {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true)
        setError(null)

        const { user: currentUser, error: userError } = await getCurrentUser()

        if (userError) {
          throw new SupabaseError('Error getting current user', userError)
        }

        setUser(currentUser)
      } catch (err) {
        const appError = handleError(err)
        setError(appError.message)
        console.error('❌ Error obteniendo usuario actual:', appError.message)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  return { user, loading, error }
}

/**
 * Hook para manejar sesiones
 */
export function useSession(): { session: Session | null; loading: boolean; error: string | null } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = getBrowserClient()
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw new SupabaseError('Error getting session', sessionError)
        }

        setSession(currentSession)
      } catch (err) {
        const appError = handleError(err)
        setError(appError.message)
        console.error('❌ Error obteniendo sesión:', appError.message)
      } finally {
        setLoading(false)
      }
    }

    getSession()
  }, [])

  return { session, loading, error }
}

/**
 * Hook para verificar permisos de usuario
 */
export function useUserPermissions(): {
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  isAdmin: boolean
  isManager: boolean
  isEmployee: boolean
  isViewer: boolean
  loading: boolean
  error: string | null
} {
  const [permissions, setPermissions] = useState({
    role: null as string | null,
    loading: true,
    error: null as string | null
  })

  useEffect(() => {
    const getPermissions = async () => {
      try {
        setPermissions(prev => ({ ...prev, loading: true, error: null }))

        const supabase = getBrowserClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setPermissions(prev => ({ ...prev, loading: false, error: 'User not authenticated' }))
          return
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('system_users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          throw new SupabaseError('Error getting user profile', profileError)
        }

        setPermissions(prev => ({ ...prev, role: userProfile.role, loading: false }))
      } catch (err) {
        const appError = handleError(err)
        setPermissions(prev => ({ ...prev, loading: false, error: appError.message }))
      }
    }

    getPermissions()
  }, [])

  const hasRole = useCallback((role: string) => {
    return permissions.role === role
  }, [permissions.role])

  const hasAnyRole = useCallback((roles: string[]) => {
    return permissions.role ? roles.includes(permissions.role) : false
  }, [permissions.role])

  return {
    hasRole,
    hasAnyRole,
    isAdmin: permissions.role === 'admin',
    isManager: permissions.role === 'manager',
    isEmployee: permissions.role === 'employee',
    isViewer: permissions.role === 'viewer',
    loading: permissions.loading,
    error: permissions.error
  }
}
