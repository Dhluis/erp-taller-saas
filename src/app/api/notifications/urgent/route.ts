import { NextRequest, NextResponse } from 'next/server'
import { getUrgentNotifications } from '@/lib/database/queries/notifications'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/notifications/urgent - Obtener notificaciones urgentes
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id

    const notifications = await getUrgentNotifications(organizationId)

    return NextResponse.json({
      data: notifications,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/notifications/urgent:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

