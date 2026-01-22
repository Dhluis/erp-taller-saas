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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🗑️ [DELETE USER] INICIO DE PROCESO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const { id: targetUserId } = await params
    const { userId, organizationId } = await getTenantContext(request)
    
    console.log('📋 [DELETE USER] Parámetros recibidos:', {
      targetUserId,
      targetUserIdType: typeof targetUserId,
      userId,
      userIdType: typeof userId,
      organizationId,
      organizationIdType: typeof organizationId,
      timestamp: new Date().toISOString()
    })
    
    const supabase = await createClient()
    
    // Obtener rol del usuario actual
    console.log('👤 [DELETE USER] Obteniendo usuario actual...')
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('id, role, full_name, email, organization_id')
      .eq('auth_user_id', userId)
      .single()
    
    if (userError || !currentUser || !currentUser.role) {
      console.error('❌ [DELETE USER] Error obteniendo usuario actual:', userError)
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    console.log('✅ [DELETE USER] Usuario actual:', {
      id: currentUser.id,
      name: currentUser.full_name,
      email: currentUser.email,
      role: currentUser.role,
      organizationId: currentUser.organization_id
    })
    
    // Validar permisos (solo admin puede eliminar usuarios)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'users', 'delete')) {
      console.log('❌ [DELETE USER] Sin permisos para eliminar usuarios')
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para eliminar usuarios' },
        { status: 403 }
      )
    }
    
    // Validar que el usuario a eliminar existe y pertenece a la organización
    console.log('🔍 [DELETE USER] Obteniendo usuario a eliminar...')
    const { data: targetUser, error: existingError } = await (supabase as any)
      .from('users')
      .select('id, auth_user_id, role, full_name, email, organization_id')
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingError || !targetUser) {
      console.error('❌ [DELETE USER] Error obteniendo usuario a eliminar:', existingError)
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    
    console.log('✅ [DELETE USER] Usuario a eliminar:', {
      id: targetUser.id,
      name: targetUser.full_name,
      email: targetUser.email,
      role: targetUser.role,
      organizationId: targetUser.organization_id,
      authUserId: targetUser.auth_user_id
    })
    
    // Validar multi-tenant
    if (targetUser.organization_id !== organizationId) {
      console.log('❌ [DELETE USER] Intento de eliminar usuario de otra organización')
      console.log('   Usuario actual org:', organizationId)
      console.log('   Usuario a eliminar org:', targetUser.organization_id)
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar usuarios de otra organización' },
        { status: 403 }
      )
    }
    
    // No permitir auto-eliminación
    if (targetUser.auth_user_id === userId) {
      console.log('❌ [DELETE USER] Intento de auto-eliminación')
      return NextResponse.json(
        { success: false, error: 'No puedes eliminarte a ti mismo' },
        { status: 400 }
      )
    }
    
    // ✅ CRÍTICO: Usar Service Role Client para validación (bypass RLS)
    // Si usamos cliente normal, RLS puede bloquear la consulta y retornar 0 órdenes
    // incluso cuando hay órdenes activas, permitiendo eliminación incorrecta
    const supabaseAdmin = getSupabaseAdmin()
    
    // ✅ VALIDACIÓN: Verificar si el usuario tiene órdenes de trabajo asignadas
    // Estados activos (NO incluir completed ni cancelled)
    const ACTIVE_STATUSES = [
      'reception',
      'diagnosis',
      'waiting_parts',
      'in_progress',
      'quality_check'
    ]

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [DELETE USER] VERIFICANDO ÓRDENES ACTIVAS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 [DELETE USER] Estados considerados activos:', ACTIVE_STATUSES)
    console.log('🔍 [DELETE USER] Buscando órdenes con:')
    console.log('   - assigned_to:', targetUserId, `(type: ${typeof targetUserId})`)
    console.log('   - organization_id:', organizationId, `(type: ${typeof organizationId})`)
    console.log('   - deleted_at: null')
    console.log('   - status IN:', ACTIVE_STATUSES)

    // ✅ DIAGNÓSTICO: Verificar TODAS las órdenes del usuario (sin filtros) para debugging
    console.log('🔍 [DELETE USER] PASO 1: Buscando TODAS las órdenes del usuario (sin filtros)...')
    const { data: allUserOrders, error: allUserOrdersError } = await (supabaseAdmin as any)
      .from('work_orders')
      .select('id, status, order_number, assigned_to, organization_id, deleted_at, created_at')
      .eq('assigned_to', targetUserId)
      .eq('organization_id', organizationId)
    
    if (allUserOrdersError) {
      console.error('❌ [DELETE USER] Error en diagnóstico:', {
        error: allUserOrdersError,
        message: allUserOrdersError.message,
        code: allUserOrdersError.code,
        details: allUserOrdersError.details
      })
    } else {
      console.log('📊 [DELETE USER] TODAS las órdenes del usuario:', {
        total: allUserOrders?.length || 0,
        ordenes: allUserOrders?.map((o: any) => ({
          id: o.id,
          number: o.order_number,
          status: o.status,
          assignedTo: o.assigned_to,
          assignedToType: typeof o.assigned_to,
          assignedToMatches: o.assigned_to === targetUserId,
          organizationId: o.organization_id,
          orgIdMatches: o.organization_id === organizationId,
          hasDeletedAt: !!o.deleted_at,
          deletedAt: o.deleted_at,
          createdAt: o.created_at
        }))
      })
    }

    // ✅ CRÍTICO: Obtener órdenes activas DIRECTAMENTE (más confiable que count)
    console.log('🔍 [DELETE USER] PASO 2: Buscando órdenes ACTIVAS del usuario...')
    const { data: activeOrders, error: ordersError } = await (supabaseAdmin as any)
      .from('work_orders')
      .select('id, status, order_number, assigned_to, organization_id, deleted_at, created_at')
      .eq('assigned_to', targetUserId) // ✅ CRÍTICO: Usuario a eliminar
      .eq('organization_id', organizationId) // ✅ CRÍTICO: Multi-tenant safety
      .is('deleted_at', null) // ✅ SOFT DELETE: Solo órdenes activas (no eliminadas)
      .in('status', ACTIVE_STATUSES) // ✅ Solo estados activos
    
    if (ordersError) {
      console.error('❌ [DELETE USER] Error obteniendo órdenes activas:', {
        error: ordersError,
        message: ordersError.message,
        code: ordersError.code,
        details: ordersError.details,
        hint: ordersError.hint,
        userId: targetUserId,
        organizationId
      })
      return NextResponse.json(
        { success: false, error: 'Error al verificar órdenes asignadas' },
        { status: 500 }
      )
    }

    // ✅ CRÍTICO: Normalizar activeCount
    const normalizedActiveCount = activeOrders?.length || 0
    
    console.log('📊 [DELETE USER] Resultado de validación de órdenes ACTIVAS:', {
      encontradas: normalizedActiveCount,
      ordenes: activeOrders?.map((o: any) => ({
        id: o.id,
        number: o.order_number,
        status: o.status,
        assignedTo: o.assigned_to,
        assignedToType: typeof o.assigned_to,
        assignedToMatches: o.assigned_to === targetUserId,
        organizationId: o.organization_id,
        orgIdMatches: o.organization_id === organizationId,
        hasDeletedAt: !!o.deleted_at,
        deletedAt: o.deleted_at,
        createdAt: o.created_at
      }))
    })
    
    // ✅ CRÍTICO: Si hay órdenes activas, RECHAZAR eliminación
    if (normalizedActiveCount > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🚫 [DELETE USER] ELIMINACIÓN RECHAZADA')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('❌ Usuario tiene órdenes activas asignadas')
      console.log('   Cantidad:', normalizedActiveCount)
      console.log('   Órdenes:', activeOrders?.map((o: any) => ({
        id: o.id,
        number: o.order_number,
        status: o.status
      })))
      
      const orderNumbers = activeOrders
        ?.slice(0, 5)
        .map((o: any) => o.order_number || `#${o.id.substring(0, 8)}`)
        .join(', ') || ''
      const moreText = normalizedActiveCount > 5 ? ` y ${normalizedActiveCount - 5} más` : ''
      
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el usuario porque tiene ${normalizedActiveCount} orden${normalizedActiveCount > 1 ? 'es' : ''} de trabajo activa${normalizedActiveCount > 1 ? 's' : ''}`,
          details: orderNumbers ? `Órdenes activas: ${orderNumbers}${moreText}. Para eliminar este usuario, primero debes reasignar estas órdenes a otro mecánico o completarlas/cancelarlas.` : `Para eliminar este usuario, primero debes reasignar estas órdenes a otro mecánico o completarlas/cancelarlas.`,
          orderIds: activeOrders?.map((o: any) => o.id) || [],
          orderCount: normalizedActiveCount
        },
        { status: 400 }
      )
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [DELETE USER] Validación de órdenes activas OK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ No hay órdenes activas, procediendo con eliminación...')
    
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
    
    // ✅ FIX: Buscar TODAS las órdenes (incluyendo completadas/canceladas/eliminadas)
    // IMPORTANTE: NO filtrar por deleted_at porque el foreign key constraint no lo respeta
    // Si hay una fila con assigned_to = userId, el DELETE fallará sin importar deleted_at
    const { data: allOrders, error: allOrdersError } = await (supabaseAdmin as any)
      .from('work_orders')
      .select('id, order_number, status, deleted_at')
      .eq('assigned_to', targetUserId)
      .eq('organization_id', organizationId)
      // ✅ CRÍTICO: NO filtrar por deleted_at - necesitamos TODAS las órdenes
    
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
    
    const activeOrdersCount = allOrders?.filter((o: any) => !o.deleted_at).length || 0
    const deletedOrdersCount = allOrders?.filter((o: any) => o.deleted_at).length || 0
    
    console.log('🔍 [Delete User] Órdenes encontradas:', {
      userId: targetUserId,
      userName: userToDelete.full_name,
      activeOrders: normalizedActiveCount,
      totalOrders,
      activeOrdersCount,
      deletedOrdersCount,
      ordersByStatus
    })
    
    // ✅ FIX: Desasignar TODAS las órdenes antes de eliminar (resuelve foreign key constraint)
    // CRÍTICO: Actualizar TODAS las órdenes sin filtrar por deleted_at
    // El foreign key constraint no distingue entre órdenes activas y eliminadas
    if (totalOrders > 0) {
      console.log(`🔄 [Delete User] Desasignando ${totalOrders} órdenes del usuario (${activeOrdersCount} activas, ${deletedOrdersCount} eliminadas)...`)
      
      const { error: updateError } = await (supabaseAdmin as any)
        .from('work_orders')
        .update({ assigned_to: null })
        .eq('assigned_to', targetUserId)
        .eq('organization_id', organizationId)
        // ✅ CRÍTICO: NO filtrar por deleted_at - actualizar TODAS las órdenes
      
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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🗑️ [DELETE USER] ELIMINANDO USUARIO DE BD')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🗑️ [DELETE USER] Usuario a eliminar:', {
      id: targetUserId,
      name: userToDelete.full_name,
      email: userToDelete.email,
      role: userToDelete.role,
      organizationId,
      ordenesDesasignadas: totalOrders
    })
    
    // 1. Eliminar usuario de auth primero (usando service role)
    console.log('🔐 [DELETE USER] Eliminando usuario de auth...')
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUser.auth_user_id
    )
    
    if (deleteAuthError) {
      console.error('❌ [DELETE USER] Error eliminando usuario de auth:', {
        error: deleteAuthError,
        message: deleteAuthError.message,
        authUserId: targetUser.auth_user_id
      })
      // Continuar con eliminación de users aunque falle auth (puede que ya no exista en auth)
      console.warn('⚠️ [DELETE USER] Continuando con eliminación de users a pesar del error en auth')
    } else {
      console.log('✅ [DELETE USER] Usuario eliminado de auth correctamente')
    }
    
    // 2. ✅ FIX: Eliminar de tabla users usando Service Role Client (bypass RLS)
    console.log('🗑️ [DELETE USER] Eliminando usuario de tabla users...')
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('users')
      .delete()
      .eq('id', targetUserId)
      .eq('organization_id', organizationId) // ✅ Multi-tenant safety
    
    if (deleteError) {
      console.error('❌ [DELETE USER] Error eliminando usuario de BD:', {
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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [DELETE USER] Usuario eliminado exitosamente')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 [DELETE USER] Resumen:', {
      userId: targetUserId,
      userName: userToDelete.full_name,
      userEmail: userToDelete.email,
      ordersDesasignadas: totalOrders,
      timestamp: new Date().toISOString()
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 [DELETE USER] PROCESO COMPLETADO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return NextResponse.json({
      success: true,
      message: `Usuario ${userToDelete.full_name || userToDelete.email} eliminado exitosamente`,
      deletedUser: {
        id: targetUserId,
        name: userToDelete.full_name,
        email: userToDelete.email,
        role: userToDelete.role
      },
      ordersUpdated: totalOrders
    })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ [DELETE USER] ERROR GENERAL')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ Error:', error)
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('❌ Timestamp:', new Date().toISOString())
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
