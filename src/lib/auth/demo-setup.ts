/**
 * Configuración de Usuario Demo
 * Funciones para crear y configurar usuario de prueba
 */

import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface DemoUserData {
  email: string
  password: string
  fullName: string
  organizationName: string
}

const DEMO_USER: DemoUserData = {
  email: 'hdzalfonsodigital@gmail.com',
  password: 'Gabyyluis2025@%',
  fullName: 'Luis Díaz',
  organizationName: 'Taller Demo'
}

/**
 * Crear usuario demo completo (organización + perfil)
 */
export async function createDemoUser(): Promise<{
  success: boolean
  message: string
  data?: any
  error?: string
}> {
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      options: {
        data: {
          full_name: DEMO_USER.fullName,
          organization_name: DEMO_USER.organizationName
        }
      }
    })

    if (authError) {
      return {
        success: false,
        message: 'Error al crear usuario en Auth',
        error: authError.message
      }
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'No se pudo crear el usuario'
      }
    }

    // 2. Crear organización
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        name: DEMO_USER.organizationName,
        description: 'Organización de prueba para desarrollo'
      })
      .select()
      .single()

    if (orgError && !orgError.message.includes('duplicate key')) {
      return {
        success: false,
        message: 'Error al crear organización',
        error: orgError.message
      }
    }

    // 3. Crear perfil de usuario
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        organization_id: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
        full_name: DEMO_USER.fullName,
        is_active: true,
        email_verified: true,
        preferences: {},
        metadata: {
          is_demo_user: true,
          created_by: 'demo_setup_script'
        }
      })
      .select()
      .single()

    if (profileError && !profileError.message.includes('duplicate key')) {
      return {
        success: false,
        message: 'Error al crear perfil de usuario',
        error: profileError.message
      }
    }

    return {
      success: true,
      message: 'Usuario demo creado exitosamente',
      data: {
        user: authData.user,
        organization: orgData,
        profile: profileData
      }
    }

  } catch (error) {
    return {
      success: false,
      message: 'Error inesperado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Verificar si el usuario demo existe
 */
export async function checkDemoUser(): Promise<{
  exists: boolean
  user?: any
  profile?: any
  organization?: any
}> {
  try {
    // Verificar usuario auth
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.email !== DEMO_USER.email) {
      return { exists: false }
    }

    // Verificar perfil
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Verificar organización
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile?.organization_id)
      .single()

    return {
      exists: true,
      user,
      profile,
      organization
    }

  } catch (error) {
    return { exists: false }
  }
}

/**
 * Iniciar sesión como usuario demo
 */
export async function loginAsDemo(): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_USER.email,
      password: DEMO_USER.password
    })

    if (error) {
      return {
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message
      }
    }

    return {
      success: true,
      message: 'Sesión iniciada exitosamente'
    }

  } catch (error) {
    return {
      success: false,
      message: 'Error inesperado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Obtener datos del usuario demo
 */
export function getDemoUserData(): DemoUserData {
  return DEMO_USER
}
