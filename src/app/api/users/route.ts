import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { CreateUserRequest } from '@/types/user'

// Cliente de Supabase con permisos de Service Role (para crear usuarios en auth)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return createAdminClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

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
    // 1. Validar autenticación y contexto multi-tenant
    const { userId, organizationId } = await getTenantContext(request)
    const supabase = await createClient()
    
    // 2. Obtener rol del usuario actual
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()
    
    if (userError || !currentUser || !currentUser.role) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // 3. Validar permisos (solo admin puede crear usuarios)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'users', 'create')) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear usuarios' },
        { status: 403 }
      )
    }
    
    // 4. Obtener datos del body
    const body: CreateUserRequest = await request.json()
    const { email, password, name, role, phone } = body
    
    // 5. Validaciones
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: email, password, name, role' },
        { status: 400 }
      )
    }
    
    // Validar que el rol sea válido
    const validRoles: UserRole[] = ['ADMIN', 'ASESOR', 'MECANICO']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Debe ser: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }
    
    // Validar longitud de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }
    
    // 6. Verificar que el email no exista en la organización
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email en tu organización' },
        { status: 409 }
      )
    }
    
    // 7. Crear usuario en Supabase Auth (usando Service Role)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        name,
        organization_id: organizationId,
        role,
      }
    })
    
    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: `Error al crear usuario: ${authError.message}` },
        { status: 500 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario en autenticación' },
        { status: 500 }
      )
    }
    
    // 8. Crear perfil en tabla users
    const { data: newUser, error: profileError } = await (supabase as any)
      .from('users')
      .insert({
        id: authData.user.id, // Usar el mismo ID de auth.users
        auth_user_id: authData.user.id,
        email,
        full_name: name, // La columna es 'full_name', no 'name'
        phone: phone || null,
        role,
        organization_id: organizationId,
        workshop_id: null, // Se puede asignar después si es necesario
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (profileError || !newUser) {
      console.error('Error creating user profile:', profileError)
      
      // Intentar eliminar usuario de auth si falla la creación del perfil
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error('Error deleting auth user after profile creation failure:', deleteError)
      }
      
      return NextResponse.json(
        { error: `Error al crear perfil: ${profileError?.message || 'Error desconocido'}` },
        { status: 500 }
      )
    }
    
    // 9. Si es mecánico, crear también registro en tabla employees
    if (role === 'MECANICO') {
      const { error: employeeError } = await (supabase as any)
        .from('employees')
        .insert({
          organization_id: organizationId,
          user_id: authData.user.id,
          name,
          email,
          phone: phone || null,
          role: 'mechanic',
          is_active: true,
        })
      
      if (employeeError) {
        console.error('Error creating employee record:', employeeError)
        // No falla todo, solo loguear el error
      }
    }
    
    // 10. Retornar usuario creado (sin datos sensibles)
    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.full_name || newUser.name, // Compatibilidad: usar full_name si existe
        role: newUser.role,
        phone: newUser.phone,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
      },
      message: 'Usuario creado exitosamente'
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Error in POST /api/users:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
