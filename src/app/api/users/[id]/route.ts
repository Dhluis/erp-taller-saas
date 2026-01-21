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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const { organizationId } = await getTenantContext(request)
    const supabase = await createClient()
    
    const { data: user, error } = await (supabase as any)
      .from('users')
      .select('id, email, full_name, role, phone, is_active, created_at, updated_at')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single()
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // Mapear full_name a name para compatibilidad
    const mappedUser = {
      ...user,
      name: user.full_name || '' // Mapear full_name a name
    }
    
    return NextResponse.json({ user: mappedUser })
  } catch (error: any) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}

// Función compartida para actualizar usuario (usada por PUT y PATCH)
async function updateUserHandler(
  request: NextRequest,
  params: Promise<{ id: string }>,
  isPartial: boolean = false
) {
  try {
    const { id: targetUserId } = await params
    const { userId, organizationId } = await getTenantContext(request)
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    
    // Obtener rol del usuario actual
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()
    
    if (userError || !currentUser || !currentUser.role) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // Validar permisos (solo admin puede editar usuarios)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'users', 'update')) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar usuarios' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { name, email, role, phone, is_active, password } = body
    
    // Validar que el usuario a editar pertenece a la organización y obtener su rol actual
    const { data: targetUser, error: existingError } = await (supabase as any)
      .from('users')
      .select('id, email, auth_user_id, role')
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // Validar: No permitir cambiar el rol del último admin (solo si se está cambiando el rol)
    if (role !== undefined && targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      // Contar cuántos admins hay en la organización
      const { count, error: countError } = await (supabase as any)
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'ADMIN')
        .eq('is_active', true)
      
      console.log('[PUT /api/users/[id]] Contando admins activos:', count)
      
      if (countError) {
        console.error('[Update User] Error contando admins:', countError)
        return NextResponse.json(
          { success: false, error: 'Error al validar permisos' },
          { status: 500 }
        )
      }
      
      if (count === 1) {
        return NextResponse.json(
          { success: false, error: 'No puedes cambiar el rol del último administrador activo de la organización' },
          { status: 400 }
        )
      }
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
          { success: false, error: 'Email inválido' },
          { status: 400 }
        )
      }
      updateData.email = email
    }
    if (role !== undefined) {
      const validRoles: UserRole[] = ['ADMIN', 'ASESOR', 'MECANICO']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { success: false, error: `Rol inválido. Debe ser: ${validRoles.join(', ')}` },
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
      .eq('id', targetUserId)
      .select('id, auth_user_id, email, full_name, role, phone, is_active, organization_id, created_at, updated_at')
      .single()
    
    if (updateError) {
      console.error('[Update User] Error actualizando usuario:', updateError)
      return NextResponse.json(
        { success: false, error: `Error al actualizar usuario: ${updateError.message}` },
        { status: 500 }
      )
    }
    
    // Si se actualizó la contraseña
    if (password && password.length > 0) {
      const supabaseAdmin = getSupabaseAdmin()
      
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.auth_user_id,
        { password }
      )
      
      if (passwordError) {
        console.error('[Update User] Error actualizando contraseña:', passwordError)
        // No fallar todo, solo loguear el error
      }
    }
    
    // Mapear full_name a name para compatibilidad
    const mappedUser = {
      ...updatedUser,
      name: updatedUser.full_name || ''
    }
    
    return NextResponse.json({
      success: true,
      user: mappedUser,
      message: 'Usuario actualizado exitosamente'
    })
  } catch (error: any) {
    console.error('[Update User] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateUserHandler(request, params, false)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateUserHandler(request, params, true)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params
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
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // Validar permisos (solo admin puede eliminar usuarios)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'users', 'delete')) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para eliminar usuarios' },
        { status: 403 }
      )
    }
    
    // Validar que el usuario a eliminar existe y pertenece a la organización
    const { data: targetUser, error: existingError } = await (supabase as any)
      .from('users')
      .select('id, auth_user_id, role')
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    // No permitir auto-eliminación
    if (targetUser.auth_user_id === userId) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminarte a ti mismo' },
        { status: 400 }
      )
    }
    
    // ✅ VALIDACIÓN: Verificar si el usuario tiene órdenes de trabajo asignadas
    const { data: assignedOrders, error: ordersError } = await (supabase as any)
      .from('work_orders')
      .select('id, status, order_number')
      .eq('assigned_to', targetUserId)
      .eq('organization_id', organizationId)
      .not('status', 'in', '("completed","cancelled")')
      .limit(10) // Limitar para no sobrecargar, pero suficiente para mostrar el problema
    
    if (ordersError) {
      console.error('[Delete User] Error verificando órdenes asignadas:', ordersError)
      return NextResponse.json(
        { success: false, error: 'Error al verificar órdenes asignadas' },
        { status: 500 }
      )
    }
    
    if (assignedOrders && assignedOrders.length > 0) {
      const activeCount = assignedOrders.length
      const orderNumbers = assignedOrders
        .slice(0, 5)
        .map((o: any) => o.order_number || `#${o.id.substring(0, 8)}`)
        .join(', ')
      const moreText = activeCount > 5 ? ` y ${activeCount - 5} más` : ''
      
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el usuario porque tiene ${activeCount} orden${activeCount > 1 ? 'es' : ''} de trabajo activa${activeCount > 1 ? 's' : ''}`,
          details: `Órdenes activas: ${orderNumbers}${moreText}. Para eliminar este usuario, primero debes reasignar estas órdenes a otro mecánico o completarlas/cancelarlas desde el módulo de órdenes.`
        },
        { status: 400 }
      )
    }
    
    // Validar: No permitir eliminar el último admin activo
    if (targetUser.role === 'ADMIN') {
      const { count, error: countError } = await (supabase as any)
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'ADMIN')
        .eq('is_active', true)
      
      console.log('[Delete User] Contando admins activos:', count)
      
      if (countError) {
        console.error('[Delete User] Error contando admins:', countError)
        return NextResponse.json(
          { success: false, error: 'Error al validar permisos' },
          { status: 500 }
        )
      }
      
      if (count === 1) {
        return NextResponse.json(
          { success: false, error: 'No puedes eliminar el último administrador activo de la organización' },
          { status: 400 }
        )
      }
    }
    
    // Eliminar usuario de auth primero (usando service role)
    const supabaseAdmin = getSupabaseAdmin()
    
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUser.auth_user_id
    )
    
    if (deleteAuthError) {
      console.error('[Delete User] Error eliminando usuario de auth:', deleteAuthError)
      // Intentar eliminar de todos modos el registro de users
    }
    
    // Eliminar de tabla users (si existe)
    const { error: deleteError } = await (supabase as any)
      .from('users')
      .delete()
      .eq('id', targetUserId)
    
    if (deleteError) {
      console.error('[Delete User] Error eliminando usuario:', deleteError)
      return NextResponse.json(
        { success: false, error: `Error al eliminar usuario: ${deleteError.message}` },
        { status: 500 }
      )
    }
    
    console.log('[Delete User] ✅ Usuario eliminado exitosamente:', targetUserId)
    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('[Delete User] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
