import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import { createClient, getSupabaseServiceClient } from '@/lib/supabase/server'

const VALID_ROLES: UserRole[] = ['ADMIN', 'ASESOR', 'MECANICO']

/**
 * PUT /api/users/[id]/role - Cambiar rol de usuario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params
    const { userId, organizationId } = await getTenantContext(request)

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const role = body.role
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Rol inválido. Debe ser: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()

    if (userError || !currentUser?.role) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!hasPermission(currentUser.role as UserRole, 'users', 'update')) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar usuarios' },
        { status: 403 }
      )
    }

    const { data: targetUser, error: existingError } = await (supabase as any)
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .single()

    if (existingError || !targetUser) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      const { count } = await (supabase as any)
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'ADMIN')
        .eq('is_active', true)
      if (count === 1) {
        return NextResponse.json(
          { success: false, error: 'No puedes cambiar el rol del último administrador activo' },
          { status: 400 }
        )
      }
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: updatedUser, error: updateError } = await (supabaseAdmin as any)
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .select('id, email, full_name, role, is_active')
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Error al actualizar: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: { ...updatedUser, name: updatedUser.full_name || '' },
      message: 'Rol actualizado',
    })
  } catch (error: unknown) {
    console.error('[PUT /api/users/[id]/role] Error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Error interno' },
      { status: 500 }
    )
  }
}
