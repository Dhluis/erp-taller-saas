import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import { createClient, getSupabaseServiceClient } from '@/lib/supabase/server'

/** PUT /api/users/[id]/activate - Activar o desactivar usuario */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params
    const { userId, organizationId } = await getTenantContext(request)
    if (!organizationId) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const is_active = body.is_active
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Se requiere is_active (boolean)' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: currentUser, error: userError } = await (supabase as any).from('users').select('role').eq('auth_user_id', userId).single()
    if (userError || !currentUser?.role) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    if (!hasPermission(currentUser.role as UserRole, 'users', 'update')) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para editar usuarios' }, { status: 403 })
    }

    const { data: targetUser, error: existingError } = await (supabase as any).from('users').select('id, role').eq('id', targetUserId).eq('organization_id', organizationId).single()
    if (existingError || !targetUser) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })

    if (!is_active && targetUser.role === 'ADMIN') {
      const { count } = await (supabase as any).from('users').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('role', 'ADMIN').eq('is_active', true)
      if (count === 1) return NextResponse.json({ success: false, error: 'No puedes desactivar al último administrador activo' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: updatedUser, error: updateError } = await (supabaseAdmin as any).from('users').update({ is_active, updated_at: new Date().toISOString() }).eq('id', targetUserId).eq('organization_id', organizationId).select('id, email, full_name, role, is_active').single()
    if (updateError) return NextResponse.json({ success: false, error: `Error: ${updateError.message}` }, { status: 500 })

    return NextResponse.json({ success: true, user: { ...updatedUser, name: updatedUser.full_name || '' }, message: updatedUser.is_active ? 'Usuario activado' : 'Usuario desactivado' })
  } catch (error: unknown) {
    console.error('[PUT /api/users/[id]/activate] Error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Error interno' }, { status: 500 })
  }
}
