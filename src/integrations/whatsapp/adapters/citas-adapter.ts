// src/integrations/whatsapp/adapters/citas-adapter.ts

/**
 * 🔌 Adapter para Citas/Appointments
 * 
 * Conecta el bot de WhatsApp con el sistema de citas existente.
 * NO modifica el código original, solo lo importa y usa.
 * 
 * Funcionalidad:
 * - Crear citas desde el bot de WhatsApp
 * - Verificar disponibilidad de horarios
 * - Consultar citas existentes
 * - Actualizar estado de citas
 */

import { 
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  confirmAppointment,
  cancelAppointment
} from '@/lib/supabase/appointments';
import type { Appointment, CreateAppointment } from '@/lib/supabase/appointments';
import type { 
  BotCreatedAppointment, 
  AdapterResponse 
} from '../types';

export interface CreateAppointmentFromBotParams {
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  service_type: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  duration?: number; // minutos
  notes?: string;
  customer_phone: string; // Para tracking
}

/**
 * Verifica disponibilidad en una fecha/hora específica
 */
export async function checkAvailability(
  organizationId: string,
  date: string,
  time: string,
  durationMinutes: number = 60
): Promise<AdapterResponse<{ available: boolean; conflicting_appointments?: any[] }>> {
  try {
    // Combinar fecha y hora
    const appointmentDateTime = `${date}T${time}:00`;
    const startTime = new Date(appointmentDateTime);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    // Buscar citas existentes en ese día
    const existingAppointments = await getAppointments({
      date_from: date,
      date_to: date
    });

    // Filtrar solo citas activas (no canceladas) y de la organización correcta
    const activeAppointments = existingAppointments.filter((apt: any) => {
      return apt.organization_id === organizationId &&
             ['scheduled', 'confirmed', 'in_progress'].includes(apt.status);
    });

    // Verificar solapamientos
    const conflicts = activeAppointments.filter((apt: any) => {
      const aptStart = new Date(apt.appointment_date);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 60) * 60000);

      // Hay conflicto si:
      // - La nueva cita empieza durante una cita existente
      // - La nueva cita termina durante una cita existente
      // - La nueva cita envuelve completamente una cita existente
      return (
        (startTime >= aptStart && startTime < aptEnd) ||
        (endTime > aptStart && endTime <= aptEnd) ||
        (startTime <= aptStart && endTime >= aptEnd)
      );
    });

    return {
      success: true,
      data: {
        available: conflicts.length === 0,
        conflicting_appointments: conflicts.length > 0 ? conflicts : undefined
      }
    };

  } catch (error) {
    console.error('[CitasAdapter] Error verificando disponibilidad:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene horarios disponibles para una fecha
 */
export async function getAvailableSlots(
  organizationId: string,
  date: string,
  businessHours: { start: string; end: string },
  slotDuration: number = 60 // minutos
): Promise<AdapterResponse<string[]>> {
  try {
    const slots: string[] = [];

    // Parsear horas de negocio
    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end.split(':').map(Number);

    // Generar slots cada X minutos
    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour || 
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      // Verificar si está disponible
      const availabilityResult = await checkAvailability(
        organizationId,
        date,
        timeSlot,
        slotDuration
      );

      if (availabilityResult.success && availabilityResult.data?.available) {
        slots.push(timeSlot);
      }

      // Avanzar al siguiente slot
      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return {
      success: true,
      data: slots
    };

  } catch (error) {
    console.error('[CitasAdapter] Error obteniendo slots disponibles:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Crea una cita desde el bot de WhatsApp
 */
export async function createAppointmentFromBot(
  params: CreateAppointmentFromBotParams
): Promise<AdapterResponse<BotCreatedAppointment>> {
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

    if (!params.appointment_date || !params.appointment_time) {
      return {
        success: false,
        error: 'appointment_date y appointment_time son requeridos'
      };
    }

    // 2. Combinar fecha y hora en formato ISO
    const appointmentDateTime = `${params.appointment_date}T${params.appointment_time}:00`;

    // 3. Verificar disponibilidad antes de crear
    const availabilityCheck = await checkAvailability(
      params.organization_id,
      params.appointment_date,
      params.appointment_time,
      params.duration || 60
    );

    if (!availabilityCheck.success) {
      return {
        success: false,
        error: 'No se pudo verificar disponibilidad'
      };
    }

    if (!availabilityCheck.data?.available) {
      return {
        success: false,
        error: 'Ese horario ya no está disponible',
        metadata: {
          conflicting_appointments: availabilityCheck.data?.conflicting_appointments
        }
      };
    }

    // 4. Preparar datos para la función existente
    const appointmentData: CreateAppointment = {
      customer_id: params.customer_id,
      vehicle_id: params.vehicle_id,
      organization_id: params.organization_id,
      service_type: params.service_type,
      appointment_date: appointmentDateTime,
      duration: params.duration || 60,
      status: 'confirmed', // Citas del bot se confirman automáticamente
      notes: params.notes 
        ? `${params.notes}\n\n📱 Cita agendada por WhatsApp Bot`
        : '📱 Cita agendada por WhatsApp Bot'
    };

    // 5. Llamar a la función EXISTENTE sin modificarla
    const appointment = await createAppointment(appointmentData);

    // 6. Guardar metadata adicional de WhatsApp
    await saveWhatsAppAppointmentMetadata({
      appointment_id: appointment.id,
      organization_id: params.organization_id,
      source: 'whatsapp_bot',
      customer_phone: params.customer_phone,
      scheduled_via: 'bot_conversation',
      created_at: new Date()
    });

    // 7. Mapear a BotCreatedAppointment
    const botAppointment: BotCreatedAppointment = {
      id: appointment.id,
      organization_id: appointment.organization_id,
      customer_id: appointment.customer_id,
      vehicle_id: appointment.vehicle_id || undefined,
      date: params.appointment_date,
      time: params.appointment_time,
      service: params.service_type,
      status: appointment.status,
      created_at: new Date(appointment.created_at)
    };

    return {
      success: true,
      data: botAppointment,
      metadata: {
        source: 'whatsapp_bot',
        customer_phone: params.customer_phone,
        auto_confirmed: true
      }
    };

  } catch (error) {
    console.error('[CitasAdapter] Error creando cita desde bot:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear cita'
    };
  }
}

/**
 * Obtiene las citas de un cliente (para contexto del bot)
 */
export async function getCustomerAppointments(
  customerId: string,
  organizationId: string
): Promise<AdapterResponse<Appointment[]>> {
  try {
    const appointments = await getAppointments({
      customer_id: customerId
    });

    // Filtrar por organización (ya que getAppointments no lo filtra directamente)
    const filteredAppointments = appointments.filter((apt: any) => 
      apt.organization_id === organizationId
    );

    return {
      success: true,
      data: filteredAppointments
    };

  } catch (error) {
    console.error('[CitasAdapter] Error obteniendo citas del cliente:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene las próximas citas (para recordatorios)
 */
export async function getUpcomingAppointments(
  organizationId: string,
  daysAhead: number = 1
): Promise<AdapterResponse<Appointment[]>> {
  try {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const appointments = await getAppointments({
      date_from: today.toISOString().split('T')[0],
      date_to: futureDate.toISOString().split('T')[0]
    });

    // Filtrar por organización y estado
    const filteredAppointments = appointments.filter((apt: any) => 
      apt.organization_id === organizationId &&
      ['scheduled', 'confirmed'].includes(apt.status)
    );

    return {
      success: true,
      data: filteredAppointments
    };

  } catch (error) {
    console.error('[CitasAdapter] Error obteniendo próximas citas:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Cancela una cita desde el bot
 */
export async function cancelAppointmentFromBot(
  appointmentId: string,
  organizationId: string,
  reason?: string
): Promise<AdapterResponse<void>> {
  try {
    // Verificar que la cita pertenece a la organización
    const appointment = await getAppointmentById(appointmentId);
    
    if (!appointment) {
      return {
        success: false,
        error: 'Cita no encontrada'
      };
    }

    if (appointment.organization_id !== organizationId) {
      return {
        success: false,
        error: 'Cita no pertenece a esta organización'
      };
    }

    // Usar función existente para cancelar
    await cancelAppointment(
      appointmentId,
      reason ? `${reason}\n\n(Cancelada vía WhatsApp Bot)` : 'Cancelada vía WhatsApp Bot'
    );

    // Guardar evento en metadata
    await saveAppointmentEventMetadata({
      appointment_id: appointmentId,
      organization_id: organizationId,
      event_type: 'cancelled',
      triggered_by: 'whatsapp_bot',
      reason,
      timestamp: new Date()
    });

    return {
      success: true
    };

  } catch (error) {
    console.error('[CitasAdapter] Error cancelando cita:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Confirma una cita desde el bot
 */
export async function confirmAppointmentFromBot(
  appointmentId: string,
  organizationId: string
): Promise<AdapterResponse<void>> {
  try {
    // Verificar que la cita pertenece a la organización
    const appointment = await getAppointmentById(appointmentId);
    
    if (!appointment) {
      return {
        success: false,
        error: 'Cita no encontrada'
      };
    }

    if (appointment.organization_id !== organizationId) {
      return {
        success: false,
        error: 'Cita no pertenece a esta organización'
      };
    }

    // Usar función existente para confirmar
    await confirmAppointment(appointmentId);

    // Guardar evento en metadata
    await saveAppointmentEventMetadata({
      appointment_id: appointmentId,
      organization_id: organizationId,
      event_type: 'confirmed',
      triggered_by: 'whatsapp_bot',
      timestamp: new Date()
    });

    return {
      success: true
    };

  } catch (error) {
    console.error('[CitasAdapter] Error confirmando cita:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// ============================================
// 💾 FUNCIONES AUXILIARES (Metadata WhatsApp)
// ============================================

/**
 * Guarda metadata adicional de citas creadas por WhatsApp
 */
async function saveWhatsAppAppointmentMetadata(metadata: {
  appointment_id: string;
  organization_id: string;
  source: string;
  customer_phone: string;
  scheduled_via: string;
  created_at: Date;
}) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Tabla que crearemos después
    await supabase
      .from('whatsapp_appointment_metadata')
      .insert({
        appointment_id: metadata.appointment_id,
        organization_id: metadata.organization_id,
        source: metadata.source,
        customer_phone: metadata.customer_phone,
        scheduled_via: metadata.scheduled_via,
        created_at: metadata.created_at.toISOString()
      });

  } catch (error) {
    console.warn('[CitasAdapter] No se pudo guardar metadata WhatsApp:', error);
  }
}

/**
 * Registra eventos de citas (confirmación, cancelación, etc.)
 */
async function saveAppointmentEventMetadata(data: {
  appointment_id: string;
  organization_id: string;
  event_type: string;
  triggered_by: string;
  reason?: string;
  timestamp: Date;
}) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    await supabase
      .from('appointment_events')
      .insert({
        appointment_id: data.appointment_id,
        organization_id: data.organization_id,
        event_type: data.event_type,
        triggered_by: data.triggered_by,
        reason: data.reason,
        created_at: data.timestamp.toISOString()
      });

  } catch (error) {
    console.warn('[CitasAdapter] No se pudo registrar evento de cita:', error);
  }
}

// ============================================
// 📤 EXPORTAR INTERFAZ PÚBLICA
// ============================================

export const citasAdapter = {
  checkAvailability,
  getAvailableSlots,
  createFromBot: createAppointmentFromBot,
  getCustomerAppointments,
  getUpcomingAppointments,
  cancelFromBot: cancelAppointmentFromBot,
  confirmFromBot: confirmAppointmentFromBot
};

