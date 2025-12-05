// src/integrations/whatsapp/services/function-executor.ts

/**
 * ⚡ Function Executor
 * 
 * Ejecuta las funciones que el AI Agent solicita:
 * - create_appointment_request: Crea solicitud de cita
 * - check_availability: Consulta disponibilidad
 * - get_service_price: Consulta precio de servicio
 * - create_quote: Crea cotización
 * - schedule_appointment: Agenda cita (legacy)
 */

import type {
  AIFunctionCall,
  ScheduleAppointmentArgs,
  CheckAvailabilityArgs,
  GetServicePriceArgs,
  CreateQuoteArgs,
  AdapterResponse
} from '../types';
import { citasAdapter } from '../adapters/citas-adapter';
import { ordenesAdapter } from '../adapters/ordenes-adapter';
import { clientesAdapter } from '../adapters/clientes-adapter';
import { loadAIContext } from './context-loader';

/**
 * Ejecuta una función solicitada por el AI
 */
export async function executeFunction(
  functionCall: AIFunctionCall,
  organizationId: string,
  conversationId: string,
  customerPhone: string
): Promise<any> {
  console.log('[FunctionExecutor] Ejecutando:', functionCall.name, functionCall.arguments);

  try {
    switch (functionCall.name) {
      case 'create_appointment_request':
        return await createAppointmentRequest(
          functionCall.arguments as any,
          organizationId,
          conversationId,
          customerPhone
        );

      case 'schedule_appointment':
        return await scheduleAppointment(
          functionCall.arguments as ScheduleAppointmentArgs,
          organizationId,
          customerPhone
        );

      case 'check_availability':
        return await checkAvailability(
          functionCall.arguments as CheckAvailabilityArgs,
          organizationId
        );

      case 'get_service_price':
        return await getServicePrice(
          functionCall.arguments as GetServicePriceArgs,
          organizationId
        );

      case 'create_quote':
        return await createQuote(
          functionCall.arguments as CreateQuoteArgs,
          organizationId,
          customerPhone
        );

      default:
        return {
          success: false,
          error: `Función no soportada: ${functionCall.name}`
        };
    }
  } catch (error) {
    console.error('[FunctionExecutor] Error ejecutando función:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Crea una solicitud de cita
 */
async function createAppointmentRequest(
  args: {
    service_type: string;
    vehicle_description: string;
    preferred_date: string;
    preferred_time: string;
    customer_name?: string;
    estimated_price?: number;
    notes?: string;
  },
  organizationId: string,
  conversationId: string,
  customerPhone: string
): Promise<any> {
  console.log('[FunctionExecutor] 📅 Creando solicitud de cita...');
  console.log('[FunctionExecutor] 📋 Datos:', {
    service_type: args.service_type,
    vehicle_description: args.vehicle_description,
    preferred_date: args.preferred_date,
    preferred_time: args.preferred_time
  });

  try {
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();

    // Construir preferred_datetime combinando fecha y hora
    const preferredDateTime = new Date(`${args.preferred_date}T${args.preferred_time}:00`);

    // Insertar solicitud de cita
    const { data: appointmentRequest, error } = await supabase
      .from('appointment_requests')
      .insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        customer_phone: customerPhone,
        customer_name: args.customer_name || null,
        vehicle_description: args.vehicle_description,
        service_type: args.service_type,
        preferred_date: args.preferred_date,
        preferred_time: args.preferred_time,
        preferred_datetime: preferredDateTime.toISOString(),
        estimated_price: args.estimated_price || null,
        notes: args.notes || null,
        status: 'pending'
      } as any)
      .select('id')
      .single();

    if (error) {
      console.error('[FunctionExecutor] ❌ Error creando solicitud de cita:', error);
      return {
        success: false,
        error: `Error al crear solicitud: ${error.message}`
      };
    }

    console.log('[FunctionExecutor] ✅ Solicitud de cita creada:', appointmentRequest?.id);

    return {
      success: true,
      data: {
        appointment_request_id: appointmentRequest?.id,
        message: 'Solicitud de cita creada exitosamente. El taller revisará tu solicitud y te confirmará pronto.'
      }
    };
  } catch (error: any) {
    console.error('[FunctionExecutor] ❌ Error en createAppointmentRequest:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear solicitud de cita'
    };
  }
}

/**
 * Agenda una cita
 */
async function scheduleAppointment(
  args: ScheduleAppointmentArgs,
  organizationId: string,
  customerPhone: string
): Promise<any> {
  // 1. Obtener o crear cliente
  const customerResult = await clientesAdapter.getOrCreate({
    organization_id: organizationId,
    name: args.customer_name,
    phone: customerPhone
  });

  if (!customerResult.success || !customerResult.data) {
    return {
      success: false,
      error: 'No se pudo obtener/crear el cliente'
    };
  }

  const customerId = customerResult.data.id;

  // 2. Crear o buscar vehículo (si tiene datos)
  let vehicleId: string | undefined;

  if (args.vehicle_brand && args.vehicle_model) {
    // Aquí podrías crear un adapter para vehículos
    // Por ahora, simplificaremos creando directamente
    const { getSupabaseServerClient } = await import('../utils/supabase-server-helpers');
    const supabase = await getSupabaseServerClient();

    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('customer_id', customerId)
      .eq('brand', args.vehicle_brand)
      .eq('model', args.vehicle_model)
      .maybeSingle();

    if (existingVehicle) {
      vehicleId = existingVehicle.id;
    } else {
      const { data: newVehicle } = await supabase
        .from('vehicles')
        .insert({
          customer_id: customerId,
          brand: args.vehicle_brand,
          model: args.vehicle_model,
          year: args.vehicle_year || new Date().getFullYear().toString()
        })
        .select('id')
        .single();

      vehicleId = newVehicle?.id;
    }
  }

  if (!vehicleId) {
    return {
      success: false,
      error: 'Se requiere información del vehículo para agendar'
    };
  }

  // 3. Agendar la cita usando el adapter
  const appointmentResult = await citasAdapter.createFromBot({
    organization_id: organizationId,
    customer_id: customerId,
    vehicle_id: vehicleId,
    service_type: args.service_name,
    appointment_date: args.date,
    appointment_time: args.time,
    notes: args.notes,
    customer_phone: customerPhone
  });

  return appointmentResult;
}

/**
 * Verifica disponibilidad
 */
async function checkAvailability(
  args: CheckAvailabilityArgs,
  organizationId: string
): Promise<any> {
  console.log('[FunctionExecutor] 📅 Consultando disponibilidad para:', args.date);

  try {
    // Obtener contexto para horarios y citas existentes
    const context = await loadAIContext(organizationId, '');

    if (!context) {
      return {
        success: false,
        error: 'No se pudo cargar el contexto del taller'
      };
    }

    // Obtener horario del día
    const date = new Date(args.date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[date.getDay()];
    const businessHours = context.business_hours[dayName];

    if (!businessHours) {
      return {
        success: true,
        data: {
          available: false,
          message: `Lo siento, estamos cerrados los ${dayName}s`,
          business_hours: null
        }
      };
    }

    // Consultar citas existentes para esa fecha
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();

    const { data: existingAppointments } = await supabase
      .from('appointment_requests')
      .select('preferred_time, preferred_datetime')
      .eq('organization_id', organizationId)
      .eq('preferred_date', args.date)
      .in('status', ['pending', 'confirmed']);

    // Calcular slots disponibles (cada 60 minutos)
    const startHour = parseInt(businessHours.start.split(':')[0]);
    const endHour = parseInt(businessHours.end.split(':')[0]);
    const availableSlots: string[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = `${hour.toString().padStart(2, '0')}:00`;
      // Verificar si hay conflicto con citas existentes
      const hasConflict = existingAppointments?.some((apt: any) => {
        const aptTime = apt.preferred_time || '';
        return aptTime.startsWith(`${hour.toString().padStart(2, '0')}:`);
      });
      
      if (!hasConflict) {
        availableSlots.push(slotTime);
      }
    }

    return {
      success: true,
      data: {
        available: availableSlots.length > 0,
        date: args.date,
        day_name: dayName,
        business_hours: {
          start: businessHours.start,
          end: businessHours.end
        },
        available_slots: availableSlots,
        message: availableSlots.length > 0
          ? `Tenemos disponibilidad el ${args.date}. Horarios disponibles: ${availableSlots.join(', ')}`
          : `Lo siento, no hay disponibilidad el ${args.date}. Horario del taller: ${businessHours.start} - ${businessHours.end}`
      }
    };
  } catch (error: any) {
    console.error('[FunctionExecutor] ❌ Error en checkAvailability:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al verificar disponibilidad'
    };
  }
}

/**
 * Obtiene precio de un servicio
 */
async function getServicePrice(
  args: GetServicePriceArgs,
  organizationId: string
): Promise<any> {
  const context = await loadAIContext(organizationId, '');

  if (!context) {
    return {
      success: false,
      error: 'No se pudo cargar el contexto del taller'
    };
  }

  // Buscar servicio
  const service = context.services.find(s => 
    s.name.toLowerCase().includes(args.service_name.toLowerCase())
  );

  if (!service) {
    return {
      success: false,
      error: `No encontré el servicio "${args.service_name}"`
    };
  }

  return {
    success: true,
    data: {
      service_name: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes,
      description: service.description
    }
  };
}

/**
 * Crea una cotización
 */
async function createQuote(
  args: CreateQuoteArgs,
  organizationId: string,
  customerPhone: string
): Promise<any> {
  const context = await loadAIContext(organizationId, '');

  if (!context) {
    return {
      success: false,
      error: 'No se pudo cargar el contexto del taller'
    };
  }

  // Buscar servicios solicitados
  const quotedServices = args.services.map(serviceName => {
    const service = context.services.find(s => 
      s.name.toLowerCase().includes(serviceName.toLowerCase())
    );
    return service;
  }).filter(Boolean);

  if (quotedServices.length === 0) {
    return {
      success: false,
      error: 'No se encontraron los servicios solicitados'
    };
  }

  // Calcular totales
  const subtotal = quotedServices.reduce((sum, s) => sum + (s?.price || 0), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return {
    success: true,
    data: {
      customer_name: args.customer_name,
      services: quotedServices,
      subtotal,
      iva,
      total,
      vehicle: args.vehicle_brand && args.vehicle_model 
        ? `${args.vehicle_brand} ${args.vehicle_model} ${args.vehicle_year || ''}`
        : undefined
    }
  };
}


