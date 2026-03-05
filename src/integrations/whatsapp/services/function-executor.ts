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

      case 'get_services_info':
        return await getServicesInfo(
          functionCall.arguments as { service_name?: string },
          organizationId
        );

      case 'create_quote':
        return await createQuote(
          functionCall.arguments as CreateQuoteArgs,
          organizationId,
          customerPhone
        );

      case 'get_cash_balance':
        return await getCashBalance(organizationId);

      case 'get_business_summary':
        return await getBusinessSummary(organizationId);

      default:
        return {
          success: false,
          error: `Función no soportada: ${functionCall.name}`
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[FunctionExecutor] ❌ Error:', errorMessage);
    return {
      success: false,
      error: errorMessage
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
  console.log('[FunctionExecutor] 📅 Creando solicitud...');
  console.log('[FunctionExecutor] 📋 Args:', JSON.stringify(args, null, 2));

  try {
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();
    const { loadAIContext } = await import('./context-loader');

    // 1. Verificar disponibilidad primero
    const availabilityResult = await checkAvailability(
      { date: args.preferred_date },
      organizationId
    );

    if (!availabilityResult.success || !availabilityResult.data?.available) {
      console.log('[FunctionExecutor] ❌ No disponible en esa fecha');
      return {
        success: false,
        error: availabilityResult.data?.message || 'No hay disponibilidad en esa fecha'
      };
    }

    // 2. Cargar contexto para obtener business_hours y require_human_approval
    const context = await loadAIContext(organizationId, conversationId);
    if (!context) {
      return {
        success: false,
        error: 'No se pudo cargar la configuración del taller'
      };
    }

    // Obtener configuración para require_human_approval
    const { getAIConfig } = await import('./context-loader');
    const aiConfig = await getAIConfig(organizationId);
    const requireApproval = aiConfig?.require_human_approval || false;

    // 3. Validar que la hora esté dentro de business_hours
    const date = new Date(args.preferred_date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[date.getDay()];
    const businessHours = context.business_hours[dayName];

    if (!businessHours) {
      return {
        success: false,
        error: `Lo siento, estamos cerrados los ${dayName}s`
      };
    }

    const [preferredHour, preferredMinute] = args.preferred_time.split(':').map(Number);
    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end.split(':').map(Number);

    const preferredTimeMinutes = preferredHour * 60 + preferredMinute;
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    if (preferredTimeMinutes < startTimeMinutes || preferredTimeMinutes >= endTimeMinutes) {
      return {
        success: false,
        error: `El horario ${args.preferred_time} está fuera de nuestro horario de atención (${businessHours.start} - ${businessHours.end})`
      };
    }

    // 4. Verificar conflictos con citas existentes
    const preferredDateTime = new Date(`${args.preferred_date}T${args.preferred_time}:00`);

    // Consultar appointments existentes (no canceladas)
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_date, status')
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled')
      .gte('appointment_date', new Date(preferredDateTime.getTime() - 60 * 60 * 1000).toISOString()) // 1 hora antes
      .lte('appointment_date', new Date(preferredDateTime.getTime() + 60 * 60 * 1000).toISOString()); // 1 hora después

    // Consultar appointment_requests pendientes/confirmadas para esa fecha/hora
    const { data: existingRequests } = await supabase
      .from('appointment_requests')
      .select('preferred_datetime, status')
      .eq('organization_id', organizationId)
      .eq('preferred_date', args.preferred_date)
      .eq('preferred_time', args.preferred_time)
      .in('status', ['pending', 'approved']);

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        success: false,
        error: 'Ya hay una cita agendada en ese horario. Por favor elige otro horario.'
      };
    }

    if (existingRequests && existingRequests.length > 0) {
      return {
        success: false,
        error: 'Ese horario ya está reservado. Por favor elige otro horario.'
      };
    }

    // 5. Insertar solicitud de cita
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
      console.error('[FunctionExecutor] ❌ Error:', error.message);
      return {
        success: false,
        error: `Error al crear solicitud: ${error.message}`
      };
    }

    console.log('[FunctionExecutor] ✅ Solicitud creada:', appointmentRequest?.id);

    const confirmationMessage = requireApproval
      ? 'Te confirmaremos en breve'
      : '¡Cita confirmada!';

    return {
      success: true,
      data: {
        appointment_request_id: appointmentRequest?.id,
        message: confirmationMessage,
        details: {
          service: args.service_type,
          vehicle: args.vehicle_description,
          date: args.preferred_date,
          time: args.preferred_time,
          requires_approval: requireApproval
        }
      }
    };
  } catch (error: any) {
    console.error('[FunctionExecutor] ❌ Error:', error.message);
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
  console.log('[FunctionExecutor] 📅 Verificando disponibilidad:', args.date);

  try {
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
          message: `Lo siento, estamos cerrados los ${dayName}s`,
          business_hours: null,
          occupied_slots: []
        }
      };
    }

    // Consultar appointments existentes para esa fecha (no canceladas)
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();

    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_date, status')
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled')
      .gte('appointment_date', new Date(`${args.date}T00:00:00`).toISOString())
      .lt('appointment_date', new Date(`${args.date}T23:59:59`).toISOString());

    // Consultar appointment_requests pendientes/confirmadas para esa fecha
    const { data: existingRequests } = await supabase
      .from('appointment_requests')
      .select('preferred_time, status')
      .eq('organization_id', organizationId)
      .eq('preferred_date', args.date)
      .in('status', ['pending', 'approved']);

    // Obtener horarios ocupados
    const occupiedSlots = new Set<string>();
    
    if (existingAppointments) {
      existingAppointments.forEach((apt: any) => {
        const aptDate = new Date(apt.appointment_date);
        const hour = aptDate.getHours().toString().padStart(2, '0');
        const minute = aptDate.getMinutes().toString().padStart(2, '0');
        occupiedSlots.add(`${hour}:${minute}`);
      });
    }

    if (existingRequests) {
      existingRequests.forEach((req: any) => {
        if (req.preferred_time) {
          occupiedSlots.add(req.preferred_time);
        }
      });
    }

    // Calcular slots disponibles (cada 60 minutos)
    const startHour = parseInt(businessHours.start.split(':')[0]);
    const endHour = parseInt(businessHours.end.split(':')[0]);
    const availableSlots: string[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = `${hour.toString().padStart(2, '0')}:00`;
      if (!occupiedSlots.has(slotTime)) {
        availableSlots.push(slotTime);
      }
    }

    const dayNames: Record<string, string> = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    return {
      success: true,
      data: {
        available: availableSlots.length > 0,
        date: args.date,
        day_name: dayNames[dayName] || dayName,
        business_hours: {
          start: businessHours.start,
          end: businessHours.end
        },
        available_slots: availableSlots,
        occupied_slots: Array.from(occupiedSlots),
        message: availableSlots.length > 0
          ? `Tenemos disponibilidad el ${dayNames[dayName] || dayName} ${args.date}. Horarios disponibles: ${availableSlots.join(', ')}`
          : `Lo siento, no hay disponibilidad el ${dayNames[dayName] || dayName} ${args.date}. Horario del taller: ${businessHours.start} - ${businessHours.end}`
      }
    };
  } catch (error: any) {
    console.error('[FunctionExecutor] ❌ Error:', error.message);
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
 * Obtiene información de servicios disponibles
 */
async function getServicesInfo(
  args: { service_name?: string },
  organizationId: string
): Promise<any> {
  console.log('[FunctionExecutor] 📋 Obteniendo información de servicios...');
  
  try {
    const context = await loadAIContext(organizationId, '');

    if (!context) {
      return {
        success: false,
        error: 'No se pudo cargar el contexto del taller'
      };
    }

    let services = context.services || [];

    // Si se proporciona service_name, filtrar por nombre
    if (args.service_name) {
      services = services.filter(s => 
        s.name?.toLowerCase().includes(args.service_name!.toLowerCase())
      );

      if (services.length === 0) {
        return {
          success: false,
          error: `No encontré el servicio "${args.service_name}"`
        };
      }
    }

    // Formatear servicios para retornar
    const formattedServices = services.map((s: any) => ({
      name: s.name || 'Servicio sin nombre',
      price_range: s.price_range || s.price || 'Consultar precio',
      duration: s.duration || s.duration_minutes || 'Consultar duración',
      description: s.description || ''
    }));

    return {
      success: true,
      data: {
        services: formattedServices,
        count: formattedServices.length,
        message: args.service_name
          ? `Encontré ${formattedServices.length} servicio(s) que coincide(n) con "${args.service_name}"`
          : `Tenemos ${formattedServices.length} servicio(s) disponible(s)`
      }
    };
  } catch (error: any) {
    console.error('[FunctionExecutor] ❌ Error:', error.message);
    return {
      success: false,
      error: error.message || 'Error desconocido al obtener información de servicios'
    };
  }
}

/**
 * Obtiene el saldo actual de las cuentas de efectivo
 */
async function getCashBalance(organizationId: string): Promise<any> {
  console.log('[FunctionExecutor] 💰 Consultando saldo de caja...');
  try {
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();

    const { data: accounts, error } = await supabase
      .from('cash_accounts')
      .select('id, name, account_number, account_type, initial_balance')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      // Si la tabla no existe aún, devolver mensaje amigable
      if (error.code === '42P01') {
        return { success: true, data: { accounts: [], total_balance: 0, message: 'Módulo de cuentas de efectivo no configurado aún.' } };
      }
      return { success: false, error: `Error al consultar cuentas: ${error.message}` };
    }

    const results = await Promise.all(
      (accounts || []).map(async (acc) => {
        const { data: movs } = await supabase
          .from('cash_account_movements')
          .select('movement_type, amount')
          .eq('cash_account_id', acc.id);
        let delta = 0;
        for (const m of movs || []) {
          if (m.movement_type === 'deposit' || m.movement_type === 'adjustment') delta += Number(m.amount);
          else if (m.movement_type === 'withdrawal') delta -= Number(m.amount);
        }
        return {
          name: acc.name,
          account_number: acc.account_number || '',
          account_type: acc.account_type,
          current_balance: Number(acc.initial_balance) + delta
        };
      })
    );

    const total = results.reduce((sum, a) => sum + a.current_balance, 0);

    return {
      success: true,
      data: {
        accounts: results,
        total_balance: total,
        message: results.length === 0
          ? 'No hay cuentas de efectivo configuradas.'
          : `Tienes ${results.length} cuenta(s) de efectivo con un total de $${total.toFixed(2)}`
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al obtener saldo de caja' };
  }
}

/**
 * Resumen general del negocio: órdenes pendientes, ingresos de hoy y saldo de caja
 */
async function getBusinessSummary(organizationId: string): Promise<any> {
  console.log('[FunctionExecutor] 📊 Obteniendo resumen del negocio...');
  try {
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Órdenes pendientes e in_progress
    const { data: pendingOrders } = await supabase
      .from('work_orders')
      .select('id, status')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'in_progress', 'waiting_parts', 'waiting_approval']);

    // Órdenes completadas hoy
    const { data: completedToday } = await supabase
      .from('work_orders')
      .select('id, total_amount')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('completed_at', todayStart.toISOString())
      .lte('completed_at', todayEnd.toISOString());

    const revenueToday = (completedToday || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

    // Saldo de caja
    const cashResult = await getCashBalance(organizationId);
    const totalCash = cashResult.success ? cashResult.data.total_balance : 0;

    const pending = (pendingOrders || []).filter((o: any) => o.status === 'pending').length;
    const inProgress = (pendingOrders || []).filter((o: any) => o.status === 'in_progress').length;
    const waitingParts = (pendingOrders || []).filter((o: any) => o.status === 'waiting_parts').length;

    return {
      success: true,
      data: {
        pending_orders: pending,
        in_progress_orders: inProgress,
        waiting_parts_orders: waitingParts,
        total_active_orders: (pendingOrders || []).length,
        revenue_today: revenueToday,
        completed_today: (completedToday || []).length,
        cash_balance: totalCash,
        message: `Hoy: ${(completedToday || []).length} órdenes completadas | Ingresos: $${revenueToday.toFixed(2)} | Activas: ${(pendingOrders || []).length} | Saldo caja: $${totalCash.toFixed(2)}`
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al obtener resumen del negocio' };
  }
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


