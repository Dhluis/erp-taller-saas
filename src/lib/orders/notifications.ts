/**
 * Capa de notificaciones de órdenes de trabajo
 * Envía WhatsApp (Twilio) y/o email (SendGrid) al cliente
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/sender'
import { sendEmailViaSendGrid, EmailOptions } from '@/lib/messaging/email-service'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  waiting_approval: 'Esperando aprobación',
  waiting_parts: 'Esperando repuestos',
  ready: 'Listo para retirar',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export interface NotifyResult {
  sent: boolean
  channels: string[]
  errors: string[]
}

/**
 * Notifica al cliente sobre el estado de su orden de trabajo.
 * Reutilizable para notificación manual (botón) y automática (cambio de estado).
 */
export async function notifyOrderStatus(
  organizationId: string,
  orderId: string,
  trigger: 'manual' | 'status_change',
  statusOverride?: string
): Promise<NotifyResult> {
  const result: NotifyResult = { sent: false, channels: [], errors: [] }

  try {
    const supabase = getSupabaseServiceClient()

    // Cargar orden con cliente y vehículo
    const { data: order, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        status,
        description,
        customer:customers(id, name, phone, email),
        vehicle:vehicles(brand, model, year, license_plate)
      `)
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single() as { data: any; error: any }

    if (error || !order) {
      result.errors.push('Orden no encontrada')
      return result
    }

    const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
    const vehicle = Array.isArray(order.vehicle) ? order.vehicle[0] : order.vehicle

    if (!customer) {
      result.errors.push('La orden no tiene cliente asociado')
      return result
    }

    const status = statusOverride || order.status
    const statusLabel = STATUS_LABELS[status] || status
    const customerName = customer.name || 'Cliente'
    const vehicleInfo = vehicle
      ? `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
      : ''
    const plate = vehicle?.license_plate ? ` (${vehicle.license_plate})` : ''

    // --- WhatsApp ---
    if (customer.phone) {
      const waMessage =
        `Hola ${customerName}, te informamos sobre tu vehículo${vehicleInfo ? ` ${vehicleInfo}` : ''}${plate}:\n` +
        `Estado: *${statusLabel}*\n` +
        (order.description ? `Descripción: ${order.description}\n` : '') +
        `Gracias por confiar en nosotros.`

      const waResult = await sendMessage(organizationId, customer.phone, waMessage)
      if (waResult.success) {
        result.channels.push('whatsapp')
      } else {
        result.errors.push(`WhatsApp: ${waResult.error || 'Error desconocido'}`)
      }
    }

    // --- Email ---
    if (customer.email) {
      const emailOptions: EmailOptions = {
        to: customer.email,
        subject: `Actualización de tu orden de trabajo`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1a1a1a">Actualización de tu orden</h2>
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>Te informamos que el estado de tu orden ha sido actualizado.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              ${vehicleInfo ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Vehículo</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>${vehicleInfo}${plate}</strong></td></tr>` : ''}
              <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Estado</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>${statusLabel}</strong></td></tr>
              ${order.description ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280">Descripción</td><td style="padding:8px;border:1px solid #e5e7eb">${order.description}</td></tr>` : ''}
            </table>
            <p style="color:#6b7280;font-size:14px">Gracias por confiar en nosotros.</p>
          </div>
        `,
      }

      const emailSent = await sendEmailViaSendGrid(organizationId, emailOptions)
      if (emailSent) {
        result.channels.push('email')
      } else {
        result.errors.push('Email: no se pudo enviar (verifique configuración SendGrid)')
      }
    }

    // --- Push notification a todos los usuarios de la organización ---
    const pushTitle = `Orden actualizada: ${statusLabel}`
    const pushBody = `${customerName}${vehicleInfo ? ` · ${vehicleInfo}` : ''}`
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        title: pushTitle,
        body: pushBody,
        url: '/dashboard/ordenes',
      }),
    }).catch((err) => console.warn('[OrderNotifications] Push send error:', err))

    // --- Notificación in-app (campana) ---
    // Solo campos confirmados: organization_id, type, title, message, read
    // type válidos: 'info','warning','success','error','stock_low','order_completed','quotation_created'
    const notifType = status === 'completed' ? 'order_completed' : status === 'ready' ? 'success' : 'info'
    const { error: notifError } = await (getSupabaseServiceClient() as any)
      .from('notifications')
      .insert({
        organization_id: organizationId,
        type: notifType,
        title: `${statusLabel}: ${customerName}`,
        message: `${vehicleInfo ? `${vehicleInfo}${plate} — ` : ''}Estado actualizado a "${statusLabel}"`,
        read: false,
      })
    if (notifError) {
      console.error('[OrderNotifications] In-app notify FAILED:', notifError.message, '| code:', notifError.code, '| details:', notifError.details)
    } else {
      console.log('[OrderNotifications] ✅ In-app notification created | status:', status, '| org:', organizationId)
    }

    result.sent = result.channels.length > 0
    return result

  } catch (err: any) {
    console.error('[OrderNotifications] Error:', err)
    result.errors.push(err.message || 'Error inesperado')
    return result
  }
}
