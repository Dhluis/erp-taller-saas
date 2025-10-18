import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications/info - Información del sistema de notificaciones
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      data: {
        message: 'Sistema de notificaciones implementado exitosamente',
        system: {
          name: 'ERP Notifications System',
          version: '1.0.0',
          status: 'active'
        },
        features: {
          notification_types: [
            {
              type: 'low_stock',
              description: 'Notificaciones cuando el stock de productos está bajo',
              priority: 'high'
            },
            {
              type: 'invoice_overdue',
              description: 'Notificaciones de facturas vencidas',
              priority: 'high'
            },
            {
              type: 'quotation_approved',
              description: 'Notificaciones de cotizaciones aprobadas',
              priority: 'medium'
            },
            {
              type: 'order_completed',
              description: 'Notificaciones de órdenes completadas',
              priority: 'medium'
            },
            {
              type: 'payment_received',
              description: 'Notificaciones de pagos recibidos',
              priority: 'medium'
            },
            {
              type: 'supplier_order_received',
              description: 'Notificaciones de órdenes de compra recibidas',
              priority: 'medium'
            },
            {
              type: 'system_alert',
              description: 'Alertas del sistema',
              priority: 'configurable'
            },
            {
              type: 'user_activity',
              description: 'Notificaciones de actividad del usuario',
              priority: 'low'
            }
          ],
          priorities: [
            { level: 'low', description: 'Baja prioridad' },
            { level: 'medium', description: 'Prioridad media' },
            { level: 'high', description: 'Alta prioridad' },
            { level: 'urgent', description: 'Urgente' }
          ],
          capabilities: [
            'Creación automática de notificaciones',
            'Filtrado por tipo, prioridad y usuario',
            'Marcado como leído/no leído',
            'Eliminación de notificaciones',
            'Estadísticas y reportes',
            'Búsqueda avanzada',
            'Notificaciones urgentes',
            'Limpieza automática de notificaciones antiguas'
          ]
        },
        endpoints: {
          protected: [
            'GET /api/notifications - Listar notificaciones',
            'GET /api/notifications/[id] - Obtener notificación',
            'PUT /api/notifications/[id] - Marcar como leída',
            'DELETE /api/notifications/[id] - Eliminar notificación',
            'POST /api/notifications/mark-all-read - Marcar todas como leídas',
            'GET /api/notifications/stats - Estadísticas',
            'GET /api/notifications/urgent - Notificaciones urgentes',
            'POST /api/notifications/auto-check - Verificación automática'
          ],
          public: [
            'GET /api/notifications/info - Información del sistema'
          ]
        },
        authentication: {
          required: true,
          method: 'Bearer Token (Supabase Auth)',
          permissions: {
            read: 'Ver notificaciones',
            create: 'Crear notificaciones',
            update: 'Marcar como leída',
            delete: 'Eliminar notificaciones'
          }
        },
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/notifications/info:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

