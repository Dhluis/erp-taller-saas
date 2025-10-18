import { NextRequest, NextResponse } from 'next/server'
import { 
  notifyLowStock, 
  notifyInvoiceOverdue, 
  notifyQuotationApproved, 
  notifyOrderCompleted,
  notifySystemAlert,
  notifyUserActivity
} from '@/lib/notifications/service'

// POST /api/notifications/test - Probar sistema de notificaciones
export async function POST(request: NextRequest) {
  try {
    const { type, organizationId = '00000000-0000-0000-0000-000000000000' } = await request.json()

    let result

    switch (type) {
      case 'low_stock':
        // Simular notificación de stock bajo
        result = await notifyLowStock('test-product-id')
        break

      case 'invoice_overdue':
        // Simular notificación de factura vencida
        result = await notifyInvoiceOverdue('test-invoice-id')
        break

      case 'quotation_approved':
        // Simular notificación de cotización aprobada
        result = await notifyQuotationApproved('test-quotation-id')
        break

      case 'order_completed':
        // Simular notificación de orden completada
        result = await notifyOrderCompleted('test-order-id')
        break

      case 'system_alert':
        // Simular alerta del sistema
        result = await notifySystemAlert(
          organizationId,
          'Alerta del Sistema',
          'Esta es una alerta de prueba del sistema de notificaciones',
          'high',
          { test: true, timestamp: new Date().toISOString() }
        )
        break

      case 'user_activity':
        // Simular actividad del usuario
        result = await notifyUserActivity(
          organizationId,
          'test-user-id',
          'Usuario realizó una acción de prueba',
          { action: 'test', timestamp: new Date().toISOString() }
        )
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de notificación no válido' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      data: {
        message: 'Notificación de prueba creada exitosamente',
        type,
        result,
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/notifications/test:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

