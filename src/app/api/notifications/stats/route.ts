import { NextRequest, NextResponse } from 'next/server'
import { getNotificationStats } from '@/lib/database/queries/notifications'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/notifications/stats - Obtener estadísticas de notificaciones
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id
    const userId = searchParams.get('user_id')

    const stats = await getNotificationStats(organizationId, userId)

    return NextResponse.json({
      data: stats,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/notifications/stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

