import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/users/stats - Estadísticas de usuarios de la organización
 * Requiere permiso users:read
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId, userId } = await getTenantContext(request)

    if (!organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: currentUser } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()

    if (currentUser && !hasPermission(currentUser.role as UserRole, 'users', 'read')) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver estadísticas de usuarios' },
        { status: 403 }
      )
    }

    const { data: users, error } = await (supabase as any)
      .from('users')
      .select('id, role, is_active')
      .eq('organization_id', organizationId)

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener usuarios: ${error.message}` },
        { status: 500 }
      )
    }

    const list = users || []
    const byRole = list.reduce(
      (acc: Record<string, number>, u: { role: string }) => {
        acc[u.role] = (acc[u.role] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const activeCount = list.filter((u: { is_active: boolean }) => u.is_active).length

    return NextResponse.json({
      total: list.length,
      active: activeCount,
      inactive: list.length - activeCount,
      by_role: byRole,
    })
  } catch (error: unknown) {
    console.error('[GET /api/users/stats] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Error interno' },
      { status: 500 }
    )
  }
}
