import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import { createClient as getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server'
import type { CreateUserRequest } from '@/types/user'

export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/users] Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      console.error('[GET /api/users] No se pudo obtener tenantContext')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    const { organizationId } = tenantContext
    console.log('[GET /api/users] organizationId:', organizationId)
    
    if (!organizationId) {
      console.error('[GET /api/users] organizationId es null o undefined')
      return NextResponse.json(
        { error: 'No se pudo obtener la organización' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Obtener todos los usuarios de la organización
    console.log('[GET /api/users] Ejecutando query...')
    const { data: users, error } = await supabase
      .from('users')
      .select('id, auth_user_id, email, full_name, role, phone, is_active, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[GET /api/users] Error en query Supabase:', error)
      console.error('[GET /api/users] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { error: `Error al obtener usuarios: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('[GET /api/users] Usuarios obtenidos:', users?.length || 0)
    if (users && users.length > 0) {
      console.log('[GET /api/users] Primer usuario:', {
        id: users[0].id,
        email: users[0].email,
        full_name: users[0].full_name,
        role: users[0].role
      })
    }
    
    // Mapear full_name a name para compatibilidad con el tipo User
    const mappedUsers = users?.map((user: any) => {
      const mapped: any = {
        id: user.id,
        auth_user_id: user.auth_user_id,
        email: user.email,
        name: user.full_name || '', // Mapear full_name a name
        full_name: user.full_name, // Mantener también full_name por si acaso
        role: user.role,
        phone: user.phone,
        is_active: user.is_active,
        organization_id: user.organization_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
      console.log('[GET /api/users] Usuario mapeado:', {
        id: mapped.id,
        email: mapped.email,
        full_name: user.full_name,
        name: mapped.name,
        'name existe?': 'name' in mapped
      })
      return mapped
    }) || []
    
    console.log('[GET /api/users] Total usuarios mapeados:', mappedUsers.length)
    if (mappedUsers.length > 0) {
      console.log('[GET /api/users] Primer usuario mapeado completo:', mappedUsers[0])
    }
    
    return NextResponse.json({ users: mappedUsers })
  } catch (error: any) {
    console.error('[GET /api/users] Error catch:', error)
    console.error('[GET /api/users] Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/users] Iniciando creación de usuario...')
    
    const { organizationId, userId } = await getTenantContext(request)
    
    // Obtener rol del usuario actual
    const supabase = await getSupabaseServerClient()
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()

    if (!currentUser || !hasPermission(currentUser.role as UserRole, 'users', 'create')) {
      console.log('[POST /api/users] Sin permisos:', currentUser?.role)
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body: CreateUserRequest = await request.json()
    const { name, email, password, role, phone } = body

    // Validaciones
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const validRoles: UserRole[] = ['ADMIN', 'ASESOR', 'MECANICO']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // ⚠️ CRÍTICO: Usar Service Role Client (bypasses RLS)
    const supabaseAdmin = getSupabaseServiceClient()
    console.log('[POST /api/users] Usando Service Role Client para crear usuario')

    // 1. Crear en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('[POST /api/users] Error creating auth user:', authError)
      throw new Error(`Error al crear usuario en auth: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario en autenticación')
    }

    console.log('[POST /api/users] Usuario creado en auth:', authData.user.id)

    // 2. Crear perfil en users CON SERVICE ROLE (bypasses RLS)
    const { data: userData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        organization_id: organizationId,
        full_name: name,
        email,
        role,
        phone: phone || null,
        is_active: true
      })
      .select()
      .single()

    if (profileError) {
      console.error('[POST /api/users] Error creating profile:', profileError)
      // Rollback: eliminar de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Error al crear perfil: ${profileError.message}`)
    }

    console.log('[POST /api/users] Usuario creado exitosamente:', userData.id)
    
    // Mapear full_name a name para compatibilidad
    const mappedUser = {
      ...userData,
      name: userData.full_name || ''
    }
    
    return NextResponse.json({ user: mappedUser }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/users] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
    
  } catch (error: any) {
    console.error('Error in POST /api/users:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
