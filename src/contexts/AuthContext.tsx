'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Tipo para el perfil del usuario (tabla 'users')
interface Profile {
  id: string
  workshop_id: string
  role: string
  full_name: string
  email: string
  phone?: string
  is_active: boolean
  auth_user_id: string
}

// Tipo para el workshop
interface Workshop {
  id: string
  name: string
  organization_id: string  // ✅ Agregado
  email?: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

// Tipo del contexto
interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  organization: Workshop | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Cargar perfil y workshop del usuario
  const loadUserData = async (userId: string) => {
    try {
      console.log('🔍 [AuthContext] Loading user data for userId:', userId)
      
      let currentProfile: Profile | null = null
      
      // Obtener información del usuario de auth primero
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        console.error('❌ [AuthContext] No auth user found')
        return
      }
      
      // Intentar cargar perfil usando auth_user_id primero, luego email como fallback
      let { data: profileData, error: profileError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      // Si falla con auth_user_id (columna no existe), usar email
      if (profileError && (profileError.code === '42703' || profileError.message?.includes('auth_user_id does not exist'))) {
        console.log('🔧 [AuthContext] auth_user_id column not found, using email fallback')
        const { data: profileDataFallback, error: profileErrorFallback } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single()
        
        profileData = profileDataFallback
        profileError = profileErrorFallback
      }

      if (profileError) {
        console.error('❌ [AuthContext] Error loading profile:', JSON.stringify(profileError, null, 2))
        
        // Si el error es que no se encontró el perfil, intentar crear uno básico
        if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows found')) {
          console.log('🔧 [AuthContext] Profile not found, attempting to create basic profile...')
          
          if (authUser) {
            // Crear un perfil básico
            const profileData = {
              email: authUser.email!,
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
              workshop_id: authUser.user_metadata?.workshop_id || authUser.user_metadata?.organization_id || null,
              role: 'admin', // Por defecto admin para usuarios nuevos
              is_active: true
            }

            // Intentar agregar auth_user_id si es posible
            try {
              // Verificar si la columna existe intentando insertar con auth_user_id
              const { data: newProfile, error: createError } = await (supabase as any)
                .from('users')
                .insert({
                  ...profileData,
                  auth_user_id: userId
                })
                .select()
                .single()

              if (createError) {
                console.log('🔧 [AuthContext] auth_user_id not available, creating without it')
                // Si falla, crear sin auth_user_id
                const { data: newProfileFallback, error: createErrorFallback } = await (supabase as any)
                  .from('users')
                  .insert(profileData)
                  .select()
                  .single()
                
                if (createErrorFallback) {
                  console.error('❌ [AuthContext] Error creating profile:', createErrorFallback)
                  return
                }
                
                console.log('✅ [AuthContext] Profile created successfully (without auth_user_id):', newProfileFallback)
                currentProfile = newProfileFallback
                setProfile(newProfileFallback)
              } else {
                console.log('✅ [AuthContext] Profile created successfully (with auth_user_id):', newProfile)
                currentProfile = newProfile
                setProfile(newProfile)
              }
            } catch (err) {
              console.error('❌ [AuthContext] Error creating profile:', err)
              return
            }
          }
        } else {
          console.log('❌ [AuthContext] Unexpected error, user may need to complete registration')
          return
        }
      } else {
        console.log('✅ [AuthContext] Profile loaded successfully:', profileData)
        currentProfile = profileData
        setProfile(profileData)
      }

      // Cargar workshop si el perfil tiene workshop_id
      if (currentProfile?.workshop_id) {
        console.log('🔍 [AuthContext] Loading workshop:', currentProfile.workshop_id)
        
        const { data: workshopData, error: workshopError } = await (supabase as any)
          .from('workshops')
          .select('*')
          .eq('id', currentProfile.workshop_id)
          .single()

        if (workshopError) {
          console.error('❌ [AuthContext] Error loading workshop:', workshopError)
          return
        }

        console.log('✅ [AuthContext] Workshop loaded successfully:', workshopData)
        setOrganization(workshopData)
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error loading user data:', error)
    }
  }

  // Efecto para manejar cambios de autenticación
  useEffect(() => {
    // CRITICAL: No cargar perfil si estamos en reset-password
    const isResetPassword = window.location.pathname === '/auth/reset-password'
    
    if (isResetPassword) {
      console.log('⚠️ [AuthContext] Reset password flow detected, skipping profile load')
      setLoading(false)
      return
    }

    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setSession(session)
      if (session?.user) {
        loadUserData(session.user.id)
      }
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [AuthContext] Auth state changed:', event)
      
      // Si estamos en reset password, ignorar cambios de auth
      if (window.location.pathname === '/auth/reset-password') {
        console.log('⚠️ [AuthContext] Ignoring auth change during reset password')
        return
      }
      
      setUser(session?.user ?? null)
      setSession(session)
      
      if (session?.user) {
        await loadUserData(session.user.id)
      } else {
        setProfile(null)
        setOrganization(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Cerrar sesión
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
      setOrganization(null)
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Refrescar perfil (útil después de actualizaciones)
  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id)
    }
  }

  const value = {
    user,
    session,
    profile,
    organization,
    loading,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// Hook para verificar permisos de rol
export function useRole(allowedRoles: ('admin' | 'manager' | 'mechanic' | 'receptionist')[]) {
  const { profile } = useAuth()
  
  if (!profile) return false
  
  return allowedRoles.includes(profile.role as any)
}

// Hook para verificar si es admin
export function useIsAdmin() {
  const { profile } = useAuth()
  return profile?.role === 'admin'
}

// Hook para verificar si es manager
export function useIsManager() {
  const { profile } = useAuth()
  return profile?.role === 'manager'
}

// Hook para verificar si es mecánico
export function useIsMechanic() {
  const { profile } = useAuth()
  return profile?.role === 'mechanic'
}

// Hook para verificar si es recepcionista
export function useIsReceptionist() {
  const { profile } = useAuth()
  return profile?.role === 'receptionist'
}

// Hook para obtener el ID del workshop actual
export function useOrganizationId() {
  const { profile } = useAuth()
  return profile?.workshop_id || null
}
