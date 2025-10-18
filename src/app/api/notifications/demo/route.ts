import { NextRequest, NextResponse } from 'next/server'
import { notifySystemAlert } from '@/lib/notifications/service'

// GET /api/notifications/demo - Demostrar sistema de notificaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'

    // Crear notificación de demostración
    const notification = await notifySystemAlert(
      organizationId,
      'Sistema de Notificaciones',
      'El sistema de notificaciones está funcionando correctamente. Esta es una notificación de demostración.',
      'medium',
      { 
        demo: true, 
        timestamp: new Date().toISOString(),
        features: [
          'Notificaciones automáticas',
          'Diferentes tipos de notificación',
          'Prioridades configurables',
          'Filtrado por usuario y organización'
        ]
      }
    )

    return NextResponse.json({
      data: {
        message: 'Sistema de notificaciones funcionando correctamente',
        notification,
        features: {
          types: [
            'low_stock',
            'invoice_overdue', 
            'quotation_approved',
            'order_completed',
            'payment_received',
            'supplier_order_received',
            'system_alert',
            'user_activity'
          ],
          priorities: ['low', 'medium', 'high', 'urgent'],
          capabilities: [
            'Creación automática de notificaciones',
            'Filtrado por tipo y prioridad',
            'Marcado como leído',
            'Eliminación de notificaciones',
            'Estadísticas y reportes',
            'Búsqueda avanzada'
          ]
        },
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/notifications/demo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

