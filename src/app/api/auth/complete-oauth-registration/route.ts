import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { email, userId, fullName, phone, workshopName, workshopEmail, workshopPhone, workshopAddress } = body

    // Validar datos requeridos
    if (!email || !fullName || !workshopName) {
      return NextResponse.json(
        { error: 'Email, nombre completo y nombre del taller son obligatorios' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    let authUser = null

    // PASO 1: Si tenemos userId, usarlo directamente (más eficiente y confiable)
    if (userId) {
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (!getUserError && userData?.user) {
        authUser = userData.user
        
        // Verificar que el email coincida
        if (authUser.email?.toLowerCase() !== email.toLowerCase()) {
          console.error('[complete-oauth-registration] Email no coincide con userId:', {
            providedEmail: email,
            userEmail: authUser.email
          })
          return NextResponse.json(
            { error: 'El email proporcionado no coincide con el usuario.' },
            { status: 400 }
          )
        }
      }
    }

    // PASO 2: Si no encontramos el usuario con userId, buscar por email (fallback)
    if (!authUser) {
      console.warn('[complete-oauth-registration] Usando búsqueda por email como fallback')
      
      // Intentar buscar el usuario con retry
      const maxRetries = 2
      const retryDelay = 1000
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
        
        let page = 1
        const perPage = 50
        
        while (!authUser) {
          const { data: authUsersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage
          })
          
          if (listError) {
            console.error('Error listing users (attempt', attempt + 1, '):', listError)
            break
          }
          
          if (!authUsersData || !authUsersData.users || authUsersData.users.length === 0) {
            break
          }
          
          authUser = authUsersData.users.find(u => 
            u.email?.toLowerCase().trim() === email.toLowerCase().trim()
          )
          
          if (authUser || authUsersData.users.length < perPage) {
            break
          }
          
          page++
        }
        
        if (authUser) break
      }
    }

    if (!authUser) {
      console.error('[complete-oauth-registration] Usuario no encontrado. Email:', email, 'UserId:', userId)
      return NextResponse.json(
        { error: 'Usuario no encontrado. Por favor, inicia sesión con Google nuevamente.' },
        { status: 404 }
      )
    }
    
    console.log('[complete-oauth-registration] Usuario encontrado:', authUser.id, authUser.email)

    // PASO 2: Verificar que el usuario sea de OAuth (tiene provider 'google')
    // Esto asegura que solo usuarios que vienen de OAuth puedan usar este endpoint
    // La verificación es flexible porque la estructura puede variar
    const identities = authUser.identities || []
    const hasGoogleProvider = identities.some((id: any) => id.provider === 'google')
    const hasGoogleInMetadata = authUser.app_metadata?.provider === 'google' || 
                                authUser.app_metadata?.providers?.includes('google')
    
    const isOAuthUser = hasGoogleProvider || hasGoogleInMetadata

    // Log para debugging (remover en producción si es necesario)
    console.log('OAuth user check:', {
      email: authUser.email,
      identities: identities.map((id: any) => id.provider),
      app_metadata: authUser.app_metadata,
      isOAuthUser
    })

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

