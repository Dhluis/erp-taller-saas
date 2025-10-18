import { NextRequest, NextResponse } from 'next/server'
import { checkAndCreateAutomaticNotifications } from '@/lib/notifications/service'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// POST /api/notifications/auto-check - Verificar y crear notificaciones automáticas
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id

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

