import { NextRequest, NextResponse } from 'next/server'
import { getAllNotifications, getNotificationStats } from '@/lib/database/queries/notifications'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/notifications - Listar notificaciones
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { error: 'No autorizado: organización no encontrada' },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const type = searchParams.get('type') as any
    const priority = searchParams.get('priority') as any
    const is_read = searchParams.get('is_read')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await getAllNotifications(organizationId, {
      user_id: userId,
      type,
      priority,
      is_read: is_read ? is_read === 'true' : undefined,
      search,
      page,
      limit
    })

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

