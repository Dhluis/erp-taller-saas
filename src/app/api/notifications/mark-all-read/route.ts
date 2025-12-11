import { NextRequest, NextResponse } from 'next/server'
import { markAllNotificationsAsRead } from '@/lib/database/queries/notifications'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// POST /api/notifications/mark-all-read - Marcar todas como leídas
export async function POST(request: NextRequest) {
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

    const notifications = await markAllNotificationsAsRead(organizationId, tenantContext.userId)

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

