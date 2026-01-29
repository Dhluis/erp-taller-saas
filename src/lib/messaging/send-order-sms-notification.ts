import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getMessagingConfig } from './twilio-client';
import { sendSMS } from './sms-service';

/**
 * Interfaz para datos de notificación de orden
 */
export interface OrderSMSNotificationData {
  orderId: string;
  organizationId: string;
  newStatus: string;
  total?: number;
  customerPhone?: string;
}

/**
 * Enviar SMS automático cuando cambia el estado de una orden
 * 
 * Esta función:
 * 1. Verifica si SMS automático está habilitado
 * 2. Verifica si el nuevo estado está en la lista de estados que activan SMS
 * 3. Obtiene datos del cliente y orden
 * 4. Envía SMS con mensaje personalizado
 * 5. Guarda el SMS en el historial
 */
export async function sendOrderSMSNotification(
  data: OrderSMSNotificationData
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const { orderId, organizationId, newStatus, total, customerPhone } = data;

    console.log('📱 [Order SMS] Iniciando notificación:', {
      orderId,
      organizationId,
      newStatus
    });

    // 1. Obtener configuración de mensajería
    const config = await getMessagingConfig(organizationId);

    if (!config) {
      console.warn('📱 [Order SMS] No hay configuración de mensajería');
      return { success: false, error: 'No hay configuración de mensajería' };
    }

    // 2. Verificar si SMS automático está habilitado
    if (!config.smsEnabled) {
      console.log('📱 [Order SMS] SMS no está habilitado para esta organización');
      return { success: false, error: 'SMS no habilitado' };
    }

    // 3. Verificar si el estado está en la lista de estados que activan SMS
    // Necesitamos obtener sms_auto_notifications y sms_notification_statuses de BD
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: messagingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_auto_notifications, sms_notification_statuses')
      .eq('organization_id', organizationId)
      .single();

    if (!messagingConfig?.sms_auto_notifications) {
      console.log('📱 [Order SMS] Notificaciones automáticas deshabilitadas');
      return { success: false, error: 'Notificaciones automáticas deshabilitadas' };
    }

    const notificationStatuses = messagingConfig.sms_notification_statuses || ['completed', 'ready'];
    
    if (!notificationStatuses.includes(newStatus.toLowerCase())) {
      console.log('📱 [Order SMS] Estado no activa SMS:', newStatus);
      return { success: false, error: 'Estado no activa SMS automático' };
    }

    // 4. Obtener datos completos de la orden y cliente
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select(`
        id,
        status,
        description,
        customer:customers(
          id,
          name,
          phone,
          email
        ),
        vehicle:vehicles(
          id,
          brand,
          model,
          license_plate
        )
      `)
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (orderError || !order) {
      console.error('❌ [Order SMS] Error obteniendo orden:', orderError);
      return { success: false, error: 'Orden no encontrada' };
    }

    // 5. Obtener teléfono del cliente
    const customer = order.customer as any;
    const phone = customerPhone || customer?.phone;

    if (!phone) {
      console.warn('📱 [Order SMS] Cliente no tiene teléfono');
      return { success: false, error: 'Cliente no tiene teléfono' };
    }

    // 6. Generar mensaje personalizado según el estado
    const vehicle = order.vehicle as any;
    const vehicleInfo = vehicle 
      ? `${vehicle.brand} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}`
      : 'tu vehículo';

    let message = '';
    
    switch (newStatus.toLowerCase()) {
      case 'completed':
      case 'ready':
        message = `✅ Tu orden está lista!\n\nVehículo: ${vehicleInfo}\n${total ? `Total: $${total.toFixed(2)}\n` : ''}Puedes pasar a recogerlo. Gracias por confiar en nosotros.`;
        break;
      case 'in_progress':
        message = `🔧 Tu orden está en proceso.\n\nVehículo: ${vehicleInfo}\nTe notificaremos cuando esté lista.`;
        break;
      case 'diagnosis':
        message = `🔍 Diagnóstico completado.\n\nVehículo: ${vehicleInfo}\nRevisa la cotización en tu panel.`;
        break;
      default:
        message = `📋 Actualización de tu orden.\n\nVehículo: ${vehicleInfo}\nEstado: ${newStatus}`;
    }

    // 7. Enviar SMS
    console.log('📱 [Order SMS] Enviando SMS a:', phone);
    const smsResult = await sendSMS(organizationId, {
      to: phone,
      message: message,
    });

    if (!smsResult.success) {
      console.error('❌ [Order SMS] Error enviando SMS:', smsResult.error);
      return { success: false, error: smsResult.error || 'Error enviando SMS' };
    }

    // 8. Guardar en historial
    const { error: historyError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        organization_id: organizationId,
        to_number: phone,
        from_number: config.smsFromNumber || '',
        message_body: message,
        message_sid: smsResult.messageSid,
        status: 'pending', // Se actualizará cuando llegue el webhook
        work_order_id: orderId,
        order_status: newStatus,
      });

    if (historyError) {
      console.error('❌ [Order SMS] Error guardando en historial:', historyError);
      // No fallar si solo falla el historial
    } else {
      console.log('✅ [Order SMS] SMS guardado en historial');
    }

    console.log('✅ [Order SMS] Notificación enviada exitosamente');
    return { success: true };

  } catch (error: any) {
    console.error('❌ [Order SMS] Error en notificación:', error);
    return { 
      success: false, 
      error: error.message || 'Error desconocido al enviar SMS' 
    };
  }
}

