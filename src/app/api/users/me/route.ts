import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient, createClientFromRequest } from '@/lib/supabase/server'

// Endpoint para obtener el perfil del usuario actual
// Usa Service Role para bypass RLS
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/users/me] Iniciando...')
    
    // Obtener usuario autenticado directamente desde Supabase usando el request
    // Esto es más confiable para usuarios nuevos que acaban de hacer login
    const supabase = createClientFromRequest(request)
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('[GET /api/users/me] Usuario no autenticado:', authError?.message)
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    const userId = authUser.id
    console.log('[GET /api/users/me] userId:', userId)
    
    // Usar Service Role para bypass RLS
    const supabaseAdmin = getSupabaseServiceClient()
    console.log('[GET /api/users/me] Usando Service Role Client')
    
    // Intentar obtener el usuario de la tabla users
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id, email, full_name, role, phone, is_active, organization_id, created_at, updated_at')
      .eq('auth_user_id', userId)
      .single()
    
    if (error) {
      console.error('[GET /api/users/me] Error en query:', error)
      console.error('[GET /api/users/me] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // Si el error es que no existe el registro, verificar si tiene organización en metadata
      // Solo crear perfil si ya tiene organización (registro completo), NO para usuarios OAuth nuevos
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        console.log('[GET /api/users/me] Usuario no encontrado, verificando si tiene organización...')
        
        try {
          // Obtener metadata del usuario de auth para usar organization_id si existe
          const userMetadata = authUser.user_metadata || {}
          const organizationIdFromMetadata = userMetadata.organization_id || null
          
          // Buscar si hay alguna organización existente para este usuario (por email)
          // Esto es para usuarios que se registraron con email/password y luego hacen login con OAuth
          let finalOrganizationId = organizationIdFromMetadata
          
          if (!finalOrganizationId) {
            const { data: existingOrg } = await supabaseAdmin
              .from('organizations')
              .select('id')
              .eq('email', authUser.email || '')
              .limit(1)
              .single()
            
            if (existingOrg && !existingOrg.error) {
              finalOrganizationId = existingOrg.id
              console.log('[GET /api/users/me] Organización encontrada por email:', finalOrganizationId)
            }
          }
          
          // ⚠️ IMPORTANTE: NO crear organización automáticamente para usuarios OAuth nuevos
          // Si no tiene organización, el usuario debe completar el registro primero
          if (!finalOrganizationId) {
            console.warn('[GET /api/users/me] Usuario sin organización - debe completar registro')
            return NextResponse.json(
              { error: 'Usuario sin organización. Por favor completa tu registro primero.' },
              { status: 404 }
            )
          }
          
          // Solo crear perfil si ya tiene organización válida
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              id: authUser.id, // El id debe coincidir con auth.users.id
              auth_user_id: authUser.id,
              email: authUser.email || '',
              full_name: userMetadata.full_name || authUser.email?.split('@')[0] || 'Usuario',
              organization_id: finalOrganizationId,
              workshop_id: null,
              role: userMetadata.role || 'ADMIN', // Por defecto ADMIN para usuarios nuevos
              phone: userMetadata.phone || null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (createError) {
            console.error('[GET /api/users/me] Error creando perfil:', createError)
            return NextResponse.json(
              { error: `Error al crear perfil: ${createError.message}` },
              { status: 500 }
            )
          }
          
          console.log('[GET /api/users/me] Perfil creado exitosamente:', newUser.email)
          
          // Mapear full_name a name para compatibilidad
          const mappedUser = {
            ...newUser,
            name: newUser.full_name || ''
          }
          
          return NextResponse.json({ 
            profile: mappedUser
          })
        } catch (createErr: any) {
          console.error('[GET /api/users/me] Error en proceso de creación:', createErr)
          return NextResponse.json(
            { error: `Error al crear perfil automáticamente: ${createErr.message}` },
            { status: 500 }
          )
        }
      }
      
      // Para otros errores, devolver 500 con más detalles
      return NextResponse.json(
        { error: `Error al obtener usuario: ${error.message}` },
        { status: 500 }
      )
    }

    if (!user) {
      console.error('[GET /api/users/me] Usuario es null después de query exitosa')
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('[GET /api/users/me] Usuario encontrado:', user.email)
    
    // Mapear full_name a name para compatibilidad con SessionContext
    const mappedUser = {
      ...user,
      name: user.full_name || ''
    }
    
    return NextResponse.json({ 
      profile: mappedUser  // SessionContext espera 'profile', no 'user'
    })
  } catch (error: any) {
    console.error('[GET /api/users/me] Error catch:', error)
    console.error('[GET /api/users/me] Error stack:', error?.stack)
    console.error('[GET /api/users/me] Error name:', error?.name)
    console.error('[GET /api/users/me] Error message:', error?.message)
    
    return NextResponse.json(
      { 
        error: error?.message || 'Error al obtener perfil',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

