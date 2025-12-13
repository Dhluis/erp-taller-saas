import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Cliente de Supabase con permisos de Service Role (para operaciones administrativas)
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await getTenantContext(request)
    const supabase = await createClient()
    
    const { data: user, error } = await (supabase as any)
      .from('users')
      .select('id, email, full_name, role, phone, is_active, created_at, updated_at')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, organizationId } = await getTenantContext(request)
    const supabase = await createClient()
    
    // Obtener rol del usuario actual
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
    
    // Validar permisos (solo admin puede editar usuarios)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'users', 'update')) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar usuarios' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { name, email, role, phone, is_active, password } = body
    
    // Validar que el usuario a editar pertenece a la organización
    const { data: existingUser, error: existingError } = await (supabase as any)
      .from('users')
      .select('id, email, auth_user_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingError || !existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // Preparar datos de actualización
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (name !== undefined) updateData.full_name = name // La columna es 'full_name', no 'name'
    if (email !== undefined) {
      // Validar formato de email si se proporciona
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Email inválido' },
          { status: 400 }
        )
      }
      updateData.email = email
    }
    if (role !== undefined) {
      const validRoles: UserRole[] = ['ADMIN', 'ASESOR', 'MECANICO']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Rol inválido. Debe ser: ${validRoles.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.role = role
    }
    if (phone !== undefined) updateData.phone = phone || null
    if (is_active !== undefined) updateData.is_active = is_active
    
    // Actualizar en tabla users
    const { data: updatedUser, error: updateError } = await (supabase as any)
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: `Error al actualizar usuario: ${updateError.message}` },
        { status: 500 }
      )
    }
    
    // Si se actualizó la contraseña
    if (password && password.length > 0) {
      const supabaseAdmin = getSupabaseAdmin()
      
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.auth_user_id,
        { password }
      )
      
      if (passwordError) {
        console.error('Error updating password:', passwordError)
        // No fallar todo, solo loguear el error
      }
    }
    
    return NextResponse.json({
      user: updatedUser,
      message: 'Usuario actualizado exitosamente'
    })
  } catch (error: any) {
    console.error('Error in PUT /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, organizationId } = await getTenantContext(request)
    const supabase = await createClient()
    
    // Obtener rol del usuario actual
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
    
    // Validar permisos (solo admin puede eliminar usuarios)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'users', 'delete')) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar usuarios' },
        { status: 403 }
      )
    }
    
    // Validar que el usuario a eliminar existe y pertenece a la organización
    const { data: existingUser, error: existingError } = await (supabase as any)
      .from('users')
      .select('id, auth_user_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingError || !existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // No permitir auto-eliminación
    if (existingUser.auth_user_id === userId) {
      return NextResponse.json(
        { error: 'No puedes eliminarte a ti mismo' },
        { status: 400 }
      )
    }
    
    // Eliminar usuario de auth primero (usando service role)
    const supabaseAdmin = getSupabaseAdmin()
    
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      existingUser.auth_user_id
    )
    
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      // Intentar eliminar de todos modos el registro de users
    }
    
    // Eliminar de tabla users (si existe)
    const { error: deleteError } = await (supabase as any)
      .from('users')
      .delete()
      .eq('id', params.id)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: `Error al eliminar usuario: ${deleteError.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
