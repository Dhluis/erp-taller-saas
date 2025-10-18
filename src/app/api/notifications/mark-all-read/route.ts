import { NextRequest, NextResponse } from 'next/server'
import { markAllNotificationsAsRead } from '@/lib/database/queries/notifications'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// POST /api/notifications/mark-all-read - Marcar todas como leídas
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id

    const notifications = await markAllNotificationsAsRead(organizationId, user.id)

    return NextResponse.json({
      data: {
        message: 'Todas las notificaciones marcadas como leídas',
        count: notifications.length,
        notifications
      },
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/notifications/mark-all-read:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

