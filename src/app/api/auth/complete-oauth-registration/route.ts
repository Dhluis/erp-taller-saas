import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClientFromRequest } from '@/lib/supabase/server'

// Función para obtener el cliente admin de Supabase (solo para operaciones administrativas necesarias)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, phone, workshopName, workshopEmail, workshopPhone, workshopAddress } = body

    // Validar datos requeridos
    if (!email || !fullName || !workshopName) {
      return NextResponse.json(
        { error: 'Email, nombre completo y nombre del taller son obligatorios' },
        { status: 400 }
      )
    }

    // PASO 1: Usar Service Role para buscar el usuario por email en auth.users
    // Esto es necesario porque la sesión puede no estar establecida aún después del callback OAuth
    const supabaseAdmin = getSupabaseAdmin()
    
    // Buscar usuario por email usando auth.admin (solo Service Role puede hacer esto)
    // Usamos getUserByEmail equivalente: listUsers con filtro
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: 'Error al verificar usuario' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!authUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado. Por favor, inicia sesión con Google nuevamente.' },
        { status: 404 }
      )
    }

    // PASO 2: Verificar que el usuario sea de OAuth (tiene provider 'google')
    // Esto asegura que solo usuarios que vienen de OAuth puedan usar este endpoint
    const isOAuthUser = authUser.app_metadata?.provider === 'google' || 
                       authUser.app_metadata?.providers?.includes('google') ||
                       authUser.identities?.some((id: any) => id.provider === 'google')

    if (!isOAuthUser) {
      return NextResponse.json(
        { error: 'Este endpoint solo está disponible para usuarios que se registraron con Google.' },
        { status: 403 }
      )
    }

    // PASO 4: Verificar que el usuario NO tenga ya una organización (evitar duplicados)
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      return NextResponse.json(
        { error: 'Error al verificar usuario' },
        { status: 500 }
      )
    }

    // Si el usuario ya tiene una organización, rechazar la creación
    if (existingUser && existingUser.organization_id) {
      return NextResponse.json(
        { error: 'Ya tienes una organización asociada. No puedes crear otra.' },
        { status: 409 }
      )
    }

    // PASO 4: Crear la organización (usando Service Role solo para esta operación administrativa)
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: workshopName,
        email: workshopEmail || email,
        phone: workshopPhone || null,
        address: workshopAddress || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: 'Error al crear la organización' },
        { status: 500 }
      )
    }

    // PASO 5: Crear o actualizar el perfil del usuario en la tabla users
    // Usamos Service Role solo para esta operación porque es parte del flujo de onboarding inicial
    if (existingUser) {
      // Actualizar usuario existente con organización
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          organization_id: organization.id,
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUser.id)

      if (updateError) {
        console.error('Error updating user:', updateError)
        // Si falla la actualización, eliminar la organización creada
        await supabaseAdmin.from('organizations').delete().eq('id', organization.id)
        return NextResponse.json(
          { error: 'Error al actualizar perfil de usuario' },
          { status: 500 }
        )
      }
    } else {
      // Crear nuevo perfil para usuario OAuth
      const { error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.id,
          auth_user_id: authUser.id,
          email: email,
          full_name: fullName,
          organization_id: organization.id,
          workshop_id: null,
          role: 'ADMIN',
          phone: phone || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (createError) {
        console.error('Error creating user profile:', createError)
        // Si falla la creación, eliminar la organización creada
        await supabaseAdmin.from('organizations').delete().eq('id', organization.id)
        return NextResponse.json(
          { error: 'Error al crear perfil de usuario' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Registro completado exitosamente',
      data: {
        organizationId: organization.id,
        userId: authUser.id
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error in complete-oauth-registration:', error)
    return NextResponse.json(
      { error: error.message || 'Error al completar el registro' },
      { status: 500 }
    )
  }
}

