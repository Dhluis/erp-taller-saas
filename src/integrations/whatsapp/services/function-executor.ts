// src/integrations/whatsapp/services/function-executor.ts

/**
 * ⚡ Function Executor
 * 
 * Ejecuta las funciones que el AI Agent solicita:
 * - schedule_appointment
 * - check_availability
 * - get_service_price
 * - create_quote
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
  customerPhone: string
): Promise<any> {
  console.log('[FunctionExecutor] Ejecutando:', functionCall.name, functionCall.arguments);

  try {
    switch (functionCall.name) {
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
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

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
  // Obtener contexto para horarios
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
        message: `Lo siento, estamos cerrados los ${dayName}s`
      }
    };
  }

  // Verificar slots disponibles
  const slotsResult = await citasAdapter.getAvailableSlots(
    organizationId,
    args.date,
    businessHours,
    60 // 60 minutos por slot
  );

  return slotsResult;
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

