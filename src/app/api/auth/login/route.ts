import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserByEmail, updateLastLogin } from '@/lib/database/queries/users'

// POST /api/auth/login - Autenticar usuario
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        {
          data: null,
          error: 'Email y contraseña son requeridos'
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          data: null,
          error: 'Credenciales inválidas'
        },
        { status: 401 }
      )
    }

    // Obtener información del usuario desde system_users
    const userData = await getUserByEmail(email)

    if (!userData || !userData.is_active) {
      return NextResponse.json(
        {
          data: null,
          error: 'Usuario inactivo o no encontrado'
        },
        { status: 401 }
      )
    }

    // Actualizar último login
    await updateLastLogin(userData.id)

    return NextResponse.json({
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          organization_id: userData.organization_id,
          is_active: userData.is_active
        },
        session: authData.session
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/auth/login:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al autenticar usuario'
      },
      { status: 500 }
    )
  }
}

