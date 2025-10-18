import { NextRequest, NextResponse } from 'next/server'
import { getAllNotifications, getNotificationStats } from '@/lib/database/queries/notifications'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/notifications - Listar notificaciones
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id
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

