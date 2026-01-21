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
    // Estados activos (NO incluir completed ni cancelled)
    const ACTIVE_STATUSES = [
      'reception',
      'diagnosis',
      'waiting_parts',
      'in_progress',
      'quality_check'
    ]

    console.log('🔍 [Delete User Validation] Verificando órdenes activas:', {
      userId: targetUserId,
      organizationId,
      activeStatuses: ACTIVE_STATUSES
    })

    // ✅ FIX: Usar users.id directamente (work_orders.assigned_to → users.id)
    // ✅ FIX: Filtrar por deleted_at IS NULL (soft delete)
    // ✅ FIX: Usar .in() para estados activos (más preciso que .not())
    const { count: activeCount, error: countError } = await (supabase as any)
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', targetUserId) // ← Usa users.id directamente
      .eq('organization_id', organizationId)
      .is('deleted_at', null) // ✅ SOFT DELETE: Solo contar órdenes activas (no eliminadas)
      .in('status', ACTIVE_STATUSES) // ✅ FIX: Usar .in() en lugar de .not()
    
    if (countError) {
      console.error('❌ [Delete User Validation] Error contando órdenes asignadas:', {
        error: countError,
        userId: targetUserId,
        organizationId
      })
      return NextResponse.json(
        { success: false, error: 'Error al verificar órdenes asignadas' },
        { status: 500 }
      )
    }

    console.log('📊 [Delete User Validation] Resultado:', {
      userId: targetUserId,
      activeCount: activeCount || 0,
      canDelete: !activeCount || activeCount === 0
    })
    
    // Si hay órdenes activas, obtener algunas para mostrar en el mensaje
    if (activeCount && activeCount > 0) {
      const { data: assignedOrders, error: ordersError } = await (supabase as any)
        .from('work_orders')
        .select('id, status, order_number')
        .eq('assigned_to', targetUserId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null) // ✅ SOFT DELETE: Solo órdenes activas
        .in('status', ACTIVE_STATUSES) // ✅ FIX: Usar .in() en lugar de .not()
        .limit(5) // Solo para mostrar en el mensaje
      
      if (ordersError) {
        console.error('❌ [Delete User Validation] Error obteniendo órdenes asignadas:', ordersError)
      }

      console.log('📋 [Delete User Validation] Órdenes activas encontradas:', {
        count: activeCount,
        orders: assignedOrders?.map((o: any) => ({
          id: o.id,
          status: o.status,
          order_number: o.order_number
        }))
      })
      
      const orderNumbers = assignedOrders
        ?.slice(0, 5)
        .map((o: any) => o.order_number || `#${o.id.substring(0, 8)}`)
        .join(', ') || ''
      const moreText = activeCount > 5 ? ` y ${activeCount - 5} más` : ''
      
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el usuario porque tiene ${activeCount} orden${activeCount > 1 ? 'es' : ''} de trabajo activa${activeCount > 1 ? 's' : ''}`,
          details: orderNumbers ? `Órdenes activas: ${orderNumbers}${moreText}. Para eliminar este usuario, primero debes reasignar estas órdenes a otro mecánico o completarlas/cancelarlas.` : `Para eliminar este usuario, primero debes reasignar estas órdenes a otro mecánico o completarlas/cancelarlas.`,
          orderIds: assignedOrders?.map((o: any) => o.id) || [],
          orderCount: activeCount
        },
        { status: 400 }
      )
    }

    console.log('✅ [Delete User Validation] Usuario puede ser eliminado (0 órdenes activas)')
    
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
    
    // ✅ Obtener datos completos del usuario antes de eliminar (para logging y respuesta)
    const { data: userToDelete, error: getUserError } = await (supabase as any)
      .from('users')
      .select('id, full_name, email, role, organization_id')
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .single()
    
    if (getUserError || !userToDelete) {
      console.error('❌ [Delete User] Error obteniendo datos del usuario:', getUserError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener datos del usuario' },
        { status: 500 }
      )
    }
    
    // ✅ FIX: Buscar TODAS las órdenes (incluyendo completadas/canceladas) para desasignarlas
    // Esto resuelve el foreign key constraint violation
    const { data: allOrders, error: allOrdersError } = await (supabase as any)
      .from('work_orders')
      .select('id, order_number, status')
      .eq('assigned_to', targetUserId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null) // Solo órdenes activas (no eliminadas con soft delete)
    
    if (allOrdersError) {
      console.error('❌ [Delete User] Error al verificar todas las órdenes:', allOrdersError)
      return NextResponse.json(
        { success: false, error: 'Error al verificar órdenes del usuario' },
        { status: 500 }
      )
    }
    
    const totalOrders = allOrders?.length || 0
    const ordersByStatus = allOrders?.reduce((acc: Record<string, number>, o: any) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    console.log('🔍 [Delete User] Órdenes encontradas:', {
      userId: targetUserId,
      userName: userToDelete.full_name,
      activeOrders: activeCount || 0,
      totalOrders,
      ordersByStatus
    })
    
    // ✅ FIX: Usar Service Role Client para todas las operaciones (bypass RLS)
    const supabaseAdmin = getSupabaseAdmin()
    
    // ✅ FIX: Desasignar TODAS las órdenes antes de eliminar (resuelve foreign key constraint)
    if (totalOrders > 0) {
      console.log(`🔄 [Delete User] Desasignando ${totalOrders} órdenes del usuario...`)
      
      const { error: updateError } = await (supabaseAdmin as any)
        .from('work_orders')
        .update({ assigned_to: null })
        .eq('assigned_to', targetUserId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null) // Solo actualizar órdenes activas (no eliminadas)
      
      if (updateError) {
        console.error('❌ [Delete User] Error al desasignar órdenes:', {
          error: updateError,
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          userId: targetUserId,
          organizationId,
          totalOrders
        })
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error al desasignar órdenes del usuario',
            details: updateError.message || 'Error desconocido'
          },
          { status: 500 }
        )
      }
      
      console.log(`✅ [Delete User] ${totalOrders} órdenes desasignadas correctamente`)
    } else {
      console.log('ℹ️ [Delete User] Usuario no tiene órdenes asignadas')
    }
    
    console.log('🔄 [Delete User] Procediendo a eliminar usuario:', {
      userId: targetUserId,
      userName: userToDelete.full_name,
      userEmail: userToDelete.email,
      organizationId,
      activeOrders: activeCount || 0,
      totalOrdersDesasignadas: totalOrders
    })
    
    // 1. Eliminar usuario de auth primero (usando service role)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUser.auth_user_id
    )
    
    if (deleteAuthError) {
      console.error('❌ [Delete User] Error eliminando usuario de auth:', deleteAuthError)
      // Continuar con eliminación de users aunque falle auth (puede que ya no exista en auth)
      console.warn('⚠️ [Delete User] Continuando con eliminación de users a pesar del error en auth')
    } else {
      console.log('✅ [Delete User] Usuario eliminado de auth correctamente')
    }
    
    // 2. ✅ FIX: Eliminar de tabla users usando Service Role Client (bypass RLS)
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('users')
      .delete()
      .eq('id', targetUserId)
      .eq('organization_id', organizationId) // ✅ Multi-tenant safety
    
    if (deleteError) {
      console.error('❌ [Delete User] Error eliminando usuario de BD:', {
        error: deleteError,
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
        userId: targetUserId,
        organizationId
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al eliminar usuario de la base de datos',
          details: deleteError.message || 'Error desconocido'
        },
        { status: 500 }
      )
    }
    
    console.log('✅ [Delete User] Usuario eliminado exitosamente de la BD:', {
      userId: targetUserId,
      userName: userToDelete.full_name,
      userEmail: userToDelete.email,
      organizationId,
      ordersDesasignadas: totalOrders
    })
    
    return NextResponse.json({
      success: true,
      message: `Usuario ${userToDelete.full_name || userToDelete.email} eliminado exitosamente`,
      deletedUser: {
        id: targetUserId,
        name: userToDelete.full_name,
        email: userToDelete.email,
        role: userToDelete.role
      },
      ordersUpdated: totalOrders,
      ordersByStatus: ordersByStatus
    })
  } catch (error: any) {
    console.error('[Delete User] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
