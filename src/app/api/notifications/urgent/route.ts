import { NextRequest, NextResponse } from 'next/server'
import { getUrgentNotifications } from '@/lib/database/queries/notifications'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/notifications/urgent - Obtener notificaciones urgentes
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

