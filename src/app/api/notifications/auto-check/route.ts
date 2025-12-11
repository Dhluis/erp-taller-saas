import { NextRequest, NextResponse } from 'next/server'
import { checkAndCreateAutomaticNotifications } from '@/lib/notifications/service'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// POST /api/notifications/auto-check - Verificar y crear notificaciones automáticas
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

    const result = await checkAndCreateAutomaticNotifications(organizationId)

    return NextResponse.json({
      data: result,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/notifications/auto-check:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

