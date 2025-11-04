// src/integrations/whatsapp/adapters/ordenes-adapter.ts

/**
 * 🔌 Adapter para Órdenes
 * 
 * Conecta el bot de WhatsApp con el sistema de órdenes existente.
 * NO modifica el código original, solo lo importa y usa.
 * 
 * Principio: Adapter Pattern
 * - Importa funciones existentes de src/lib/database/queries/orders.ts
 * - Agrega lógica específica de WhatsApp (metadata, tracking, etc.)
 * - Mantiene aislado el código del bot
 */

import { createOrder } from '@/lib/database/queries/orders';
import type { WorkOrder } from '@/types/orders';
import type { 
  BotCreatedOrder, 
  AdapterResponse 
} from '../types';

export interface CreateOrderFromBotParams {
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  service_name: string;
  service_description?: string;
  estimated_cost?: number;
  appointment_id?: string; // Si viene de una cita agendada
  customer_phone: string; // Para tracking
  notes?: string;
}

/**
 * Crea una orden desde el bot de WhatsApp
 * Usa la función existente createOrder() sin modificarla
 */
export async function createOrderFromBot(
  params: CreateOrderFromBotParams
): Promise<AdapterResponse<BotCreatedOrder>> {
  try {
    // 1. Validar datos requeridos
    if (!params.organization_id) {
      return {
        success: false,
        error: 'organization_id es requerido'
      };
    }

    if (!params.customer_id) {
      return {
        success: false,
        error: 'customer_id es requerido'
      };
    }

    if (!params.vehicle_id) {
      return {
        success: false,
        error: 'vehicle_id es requerido'
      };
    }

    // 2. Preparar descripción enriquecida
    const description = `${params.service_name}${
      params.service_description ? `\n\n${params.service_description}` : ''
    }

📱 Orden creada automáticamente por el bot de WhatsApp
📞 Cliente contactó por: ${params.customer_phone}
${params.notes ? `\n📝 Notas adicionales: ${params.notes}` : ''}`;

    // 3. Llamar a la función EXISTENTE sin modificarla
    const workOrder = await createOrder({
      organization_id: params.organization_id,
      customer_id: params.customer_id,
      vehicle_id: params.vehicle_id,
      description,
      estimated_cost: params.estimated_cost,
      notes: params.notes
    });

    // 4. Guardar metadata adicional específica de WhatsApp
    // (Esto es NUEVO, no modifica el código existente)
    await saveWhatsAppOrderMetadata({
      order_id: workOrder.id,
      organization_id: params.organization_id,
      source: 'whatsapp_bot',
      customer_phone: params.customer_phone,
      appointment_id: params.appointment_id,
      service_name: params.service_name,
      created_at: new Date()
    });

    // 5. Mapear a nuestro tipo BotCreatedOrder
    const botOrder: BotCreatedOrder = {
      id: workOrder.id,
      order_number: (workOrder as any).order_number || `ORD-${workOrder.id.slice(0, 8)}`,
      organization_id: workOrder.organization_id,
      customer_id: workOrder.customer_id,
      vehicle_id: workOrder.vehicle_id || undefined,
      appointment_id: params.appointment_id,
      status: workOrder.status,
      total_amount: workOrder.total_amount || params.estimated_cost || 0,
      created_at: workOrder.created_at
    };

    return {
      success: true,
      data: botOrder,
      metadata: {
        source: 'whatsapp_bot',
        customer_phone: params.customer_phone
      }
    };

  } catch (error) {
    console.error('[OrdersAdapter] Error creando orden desde bot:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear orden'
    };
  }
}

/**
 * Obtiene una orden existente (para consultas del bot)
 * Usa las funciones existentes de queries
 */
export async function getOrderForBot(
  orderId: string,
  organizationId: string
): Promise<AdapterResponse<WorkOrder>> {
  try {
    // Usar cliente de Supabase del lado del cliente
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const { data, error } = await supabase
      .from('work_orders')
      .select('*, customer:customers(*), vehicle:vehicles(*)')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data as WorkOrder
    };

  } catch (error) {
    console.error('[OrdersAdapter] Error obteniendo orden:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Actualiza el estado de una orden (cuando el bot notifica al cliente)
 */
export async function updateOrderStatusFromBot(
  orderId: string,
  organizationId: string,
  newStatus: string,
  notes?: string
): Promise<AdapterResponse<void>> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('organization_id', organizationId);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    // Registrar actualización en timeline
    await saveOrderStatusChangeMetadata({
      order_id: orderId,
      organization_id: organizationId,
      previous_status: '', // Podrías obtenerlo antes
      new_status: newStatus,
      changed_by: 'whatsapp_bot',
      notes
    });

    return {
      success: true
    };

  } catch (error) {
    console.error('[OrdersAdapter] Error actualizando orden:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// ============================================
// 💾 FUNCIONES AUXILIARES (Metadata específica de WhatsApp)
// ============================================

/**
 * Guarda metadata adicional específica de órdenes creadas por WhatsApp
 * Esta es una tabla NUEVA que no afecta el código existente
 */
async function saveWhatsAppOrderMetadata(metadata: {
  order_id: string;
  organization_id: string;
  source: string;
  customer_phone: string;
  appointment_id?: string;
  service_name: string;
  created_at: Date;
}) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Esta tabla la crearemos después en la migración
    await supabase
      .from('whatsapp_order_metadata')
      .insert({
        order_id: metadata.order_id,
        organization_id: metadata.organization_id,
        source: metadata.source,
        customer_phone: metadata.customer_phone,
        appointment_id: metadata.appointment_id,
        service_name: metadata.service_name,
        created_at: metadata.created_at.toISOString()
      });

  } catch (error) {
    // No fallar si la tabla no existe aún
    console.warn('[OrdersAdapter] No se pudo guardar metadata WhatsApp:', error);
  }
}

/**
 * Registra cambios de estado iniciados por el bot
 */
async function saveOrderStatusChangeMetadata(data: {
  order_id: string;
  organization_id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  notes?: string;
}) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Tabla para timeline/auditoría
    await supabase
      .from('order_status_history')
      .insert({
        order_id: data.order_id,
        organization_id: data.organization_id,
        previous_status: data.previous_status,
        new_status: data.new_status,
        changed_by: data.changed_by,
        notes: data.notes,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.warn('[OrdersAdapter] No se pudo registrar cambio de estado:', error);
  }
}

// ============================================
// 📤 EXPORTAR INTERFAZ PÚBLICA
// ============================================

export const ordenesAdapter = {
  createFromBot: createOrderFromBot,
  getForBot: getOrderForBot,
  updateStatusFromBot: updateOrderStatusFromBot
};

