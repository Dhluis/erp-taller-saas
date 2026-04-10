import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient, createClientFromRequest } from '@/lib/supabase/server'
import { getCachedProfileByAuthId } from '@/lib/database/queries/users'

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
    
    // Obtener cliente administrativo (puede ser null si falta la clave)
    const serviceClient = getSupabaseServiceClient()
    
    // ✅ CRÍTICO: Si no hay cliente administrativo, usar el cliente de usuario (RLS activo)
    // Esto evita el crash que mandaba a los usuarios al registro.
    const supabaseAdmin = serviceClient || supabase
    
    // Intentar obtener el usuario usando el helper con caché (que ahora busca en ambas tablas)
    const userProfile = await getCachedProfileByAuthId(userId, supabaseAdmin)
    
    if (!userProfile) {
      console.log('[GET /api/users/me] Perfil no encontrado ni en caché ni en DB (ambas tablas), verificando autoreparación...')
      
      try {
        // 1. Obtener metadata del usuario de auth para usar organization_id si existe
        const userMetadata = authUser.user_metadata || {}
        const organizationIdFromMetadata = userMetadata.organization_id || null
        
        // 2. Buscar si hay alguna organización existente para este usuario (por email)
        let finalOrganizationId = organizationIdFromMetadata
        let userRole = userMetadata.role || 'ADMIN'
        let fullName = userMetadata.full_name || authUser.email?.split('@')[0] || 'Usuario'
        
        // Buscar en system_users por email como último recurso (si no tiene auth_user_id vinculado)
        if (!finalOrganizationId) {
          console.log('[GET /api/users/me] Buscando vinculación por email en system_users...')
          const { data: legacyUser } = await supabaseAdmin
            .from('system_users')
            .select('organization_id, role, first_name, last_name')
            .eq('email', authUser.email || '')
            .maybeSingle()
          
          if (legacyUser) {
            finalOrganizationId = legacyUser.organization_id
            userRole = legacyUser.role || userRole
            fullName = `${legacyUser.first_name || ''} ${legacyUser.last_name || ''}`.trim() || fullName
            console.log(`✅ [GET /api/users/me] Organización encontrada vía system_users: ${finalOrganizationId}`)
          }
        }

        // 3. Buscar organización por email directo si nada funcionó
        if (!finalOrganizationId) {
          const { data: existingOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('email', authUser.email || '')
            .maybeSingle()

          if (existingOrg?.id) {
            finalOrganizationId = existingOrg.id
            console.log(`✅ [GET /api/users/me] Organización encontrada vía coincidencia de email: ${finalOrganizationId}`)
          }
        }
        
        // 4. Si no tiene organización, el usuario debe completar el registro primero
        if (!finalOrganizationId) {
          console.warn(`⚠️ [GET /api/users/me] Usuario ${authUser.email} no tiene organización vinculada.`)
          return NextResponse.json(
            { error: 'Usuario sin organización vinculada. Por favor contacta a soporte o completa tu registro.' },
            { status: 404 }
          )
        }
        
        // 5. Crear perfil en la tabla 'users' para sincronizar
        console.log(`🔄 [GET /api/users/me] Creando perfil en tabla 'users' para sincronizar sesión...`)
        const { data: newUser, error: createError } = await (supabaseAdmin as any)
          .from('users')
          .insert({
            auth_user_id: authUser.id,
            email: authUser.email || '',
            full_name: fullName,
            organization_id: finalOrganizationId,
            workshop_id: null,
            role: userRole,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single() as { data: any; error: any }
        
        if (createError) {
          console.error('[GET /api/users/me] Error sincronizando perfil:', createError.message)
          return NextResponse.json(
            { error: `Error de sincronización: ${createError.message}` },
            { status: 500 }
          )
        }
        
        // Invalidar caché tras creación
        await import('@/lib/database/queries/users').then(m => m.invalidateUserProfileCache(authUser.id))
        
        return NextResponse.json({ 
          profile: { ...newUser, name: newUser.full_name || '' }
        })
      } catch (createErr: any) {
        console.error('[GET /api/users/me] Error en proceso de autoreparación:', createErr.message)
        return NextResponse.json(
          { error: `Fallo en autoreparación: ${createErr.message}` },
          { status: 500 }
        )
      }
    }

    // Usar el perfil encontrado o el recién creado
    const user = userProfile || (userProfile as any);

    if (!user) {
      console.error('[GET /api/users/me] Usuario es null después de query y autoreparación')
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('[GET /api/users/me] Usuario validado:', user.email)
    
    // Mapear full_name a name para compatibilidad con SessionContext
    const mappedUser = {
      ...user,
      name: user.full_name || ''
    }

    // ✅ NUEVO: Obtener workshops y configuración de la organización desde el servidor
    let workshops: any[] = []
    let companySettings: any = null

    if (user.organization_id) {
      // 1. Obtener workshops
      const { data: workshopsData, error: wError } = await supabaseAdmin
        .from('workshops')
        .select('id, name')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: true })
      
      if (wError) {
        console.warn('[GET /api/users/me] Error obteniendo workshops (no crítico):', wError.message)
      } else {
        workshops = workshopsData || []
        console.log(`[GET /api/users/me] Workshops encontrados: ${workshops.length}`)
      }

      // 2. Obtener configuración de empresa (incluyendo PDF de términos)
      const { data: settingsData, error: sError } = await supabaseAdmin
        .from('company_settings')
        .select('*')
        .eq('organization_id', user.organization_id)
        .maybeSingle()
      
      if (sError) {
        console.warn('[GET /api/users/me] Error obteniendo company_settings (no crítico):', sError.message)
      } else {
        companySettings = settingsData
        console.log('[GET /api/users/me] Configuración de empresa obtenida:', companySettings ? 'Encontrada' : 'No encontrada')
      }
    }
    
    // ✅ Híbrido: Asegurar que el PDF esté disponible incluso si la columna falla
    if (companySettings) {
      const appDefaults = companySettings.appointment_defaults || {}
      if (!companySettings.terms_pdf_url && appDefaults.terms_pdf_url) {
        console.log('[GET /api/users/me] Recuperando terms_pdf_url del backup JSONB')
        companySettings.terms_pdf_url = appDefaults.terms_pdf_url
      }
    }
    
    return NextResponse.json({
      profile: mappedUser,
      workshops, // ✅ Incluir workshops
      companySettings // ✅ Incluir configuración global (PDF, etc)
    })
  } catch (error: any) {
    console.error('[GET /api/users/me] Error catch:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Error al obtener perfil' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/me — actualizar perfil del usuario
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, phone, avatar_url } = body

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updateData.full_name = full_name.trim()
    if (phone !== undefined) updateData.phone = phone || null
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url || null

    // Obtener cliente administrativo (puede ser null)
    const serviceClient = getSupabaseServiceClient()
    const supabaseAdmin = serviceClient || supabase
    
    const { data: updated, error } = await (supabaseAdmin as any)
      .from('users')
      .update(updateData)
      .eq('auth_user_id', authUser.id)
      .select('id, auth_user_id, email, full_name, role, phone, avatar_url, is_active, organization_id, created_at, updated_at')
      .single()

    if (error) {
      console.error('[PATCH /api/users/me] Error:', error.message)
      return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
    }

    return NextResponse.json({ profile: { ...updated, name: updated.full_name || '' } })
  } catch (error: any) {
    console.error('[PATCH /api/users/me] Error catch:', error?.message)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}

