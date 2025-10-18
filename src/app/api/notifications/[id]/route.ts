import { NextRequest, NextResponse } from 'next/server'
import { getNotificationById, markNotificationAsRead, deleteNotification } from '@/lib/database/queries/notifications'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/notifications/[id] - Obtener notificación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const notification = await getNotificationById(params.id)

    return NextResponse.json({
      data: notification,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/[id] - Marcar como leída
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const notification = await markNotificationAsRead(params.id)

    return NextResponse.json({
      data: notification,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in PUT /api/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Eliminar notificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'notifications', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const notification = await deleteNotification(params.id)

    return NextResponse.json({
      data: notification,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in DELETE /api/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

