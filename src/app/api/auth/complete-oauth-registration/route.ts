import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

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

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Buscar el usuario en auth.users por email
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: 'Error al buscar usuario' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find(u => u.email === email)

    if (!authUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado. Por favor, inicia sesión con Google nuevamente.' },
        { status: 404 }
      )
    }

    // 2. Crear la organización
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

    // 3. Crear o actualizar el perfil del usuario en la tabla users
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      return NextResponse.json(
        { error: 'Error al verificar usuario' },
        { status: 500 }
      )
    }

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

