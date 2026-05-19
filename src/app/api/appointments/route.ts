import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { checkResourceLimit } from '@/lib/billing/check-limits';

/** Shared helper: resolve organization_id from authenticated user */
async function resolveOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, organizationId: null, error: 'No autorizado' };

  const supabaseAdmin = getSupabaseServiceClient();
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('organization_id, workshop_id')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !userProfile?.organization_id) {
    return { user, organizationId: null, error: 'No se pudo obtener la organización del usuario' };
  }

  return {
    user,
    organizationId: userProfile.organization_id as string,
    workshopId: (userProfile as any).workshop_id as string | null,
    error: null,
  };
}

/**
 * GET /api/appointments - Obtener citas filtradas por organización
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId, error } = await resolveOrg(request);
    if (error || !organizationId) {
      return NextResponse.json({ success: false, error: error || 'No autorizado', data: [] }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const vehicleId = searchParams.get('vehicle_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabaseAdmin
      .from('appointments')
      .select(`*, customer:customers(id, name, phone, email), vehicle:vehicles(id, brand, model, year, license_plate)`)
      .eq('organization_id', organizationId);

    if (status)     query = query.eq('status', status);
    if (customerId) query = query.eq('customer_id', customerId);
    if (vehicleId)  query = query.eq('vehicle_id', vehicleId);
    if (dateFrom)   query = query.gte('appointment_date', dateFrom);
    if (dateTo)     query = query.lte('appointment_date', dateTo);

    const { data: appointments, error: queryError } = await query.order('appointment_date', { ascending: false });

    if (queryError) {
      console.error('[GET /api/appointments] Error:', queryError);
      return NextResponse.json({ success: false, error: 'Error al obtener citas', data: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: appointments || [], count: appointments?.length || 0 });
  } catch (error: any) {
    console.error('[GET /api/appointments] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error al obtener citas', data: [] }, { status: 500 });
  }
}

/**
 * POST /api/appointments - Crear cita (con cliente y vehículo incluidos)
 * Usa service role para evitar problemas de RLS con usuarios recién creados
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, workshopId, error } = await resolveOrg(request);
    if (error || !organizationId) {
      return NextResponse.json({ success: false, error: error || 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      vehicle_brand,
      vehicle_model,
      vehicle_year,
      vehicle_plate,
      service_type,
      appointment_date,
      appointment_time,
      notes,
      estimated_duration,
    } = body;

    if (!customer_phone || !service_type || !appointment_date) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos (teléfono, servicio, fecha)' }, { status: 400 });
    }

    // ── Billing: verificar límite de citas del plan ──
    const apptLimitCheck = await checkResourceLimit(organizationId, 'work_order', { useOrganizationId: true });
    if (!apptLimitCheck.canCreate) {
      return NextResponse.json(
        { success: false, error: apptLimitCheck.error?.message || 'Límite del plan alcanzado', limit_reached: true, limit_error: apptLimitCheck.error },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseServiceClient();

    // ─── 1. Buscar o crear cliente ─────────────────────────────────────────────
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('phone', customer_phone)
      .eq('organization_id', organizationId)
      .maybeSingle();

    let customerId: string;

    if (existingCustomer) {
      customerId = (existingCustomer as any).id;
      console.log('✅ [POST /api/appointments] Cliente encontrado:', customerId);
    } else {
      // Verificar límite de clientes antes de crear uno nuevo implícitamente
      const custLimitCheck = await checkResourceLimit(organizationId, 'customer', { useOrganizationId: true });
      if (!custLimitCheck.canCreate) {
        return NextResponse.json(
          { success: false, error: custLimitCheck.error?.message || 'Límite de clientes del plan alcanzado', limit_reached: true, limit_error: custLimitCheck.error },
          { status: 403 }
        );
      }

      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          organization_id: organizationId,
          workshop_id: workshopId || null,
          name: customer_name || 'Cliente',
          phone: customer_phone,
          email: customer_email || null,
        } as any)
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        console.error('[POST /api/appointments] Error creando cliente:', customerError);
        return NextResponse.json({ success: false, error: `Error creando cliente: ${customerError?.message}` }, { status: 500 });
      }
      customerId = (newCustomer as any).id;
      console.log('✅ [POST /api/appointments] Cliente creado:', customerId);
    }

    // ─── 2. Buscar o crear vehículo (opcional) ────────────────────────────────
    let vehicleId: string | null = null;
    const brand = vehicle_brand?.trim() || '';
    const model = vehicle_model?.trim() || '';
    const plate = vehicle_plate?.trim().toUpperCase() || '';
    const hasVehicleData = brand || model || plate;

    if (hasVehicleData) {
      if (plate) {
        const { data: existingVehicles } = await supabaseAdmin
          .from('vehicles')
          .select('id')
          .eq('license_plate', plate)
          .eq('customer_id', customerId)
          .maybeSingle();
        if (existingVehicles) {
          vehicleId = (existingVehicles as any).id;
          console.log('✅ [POST /api/appointments] Vehículo encontrado por placa:', vehicleId);
        }
      }

      if (!vehicleId && brand && model) {
        const { data: newVehicle, error: vehicleError } = await supabaseAdmin
          .from('vehicles')
          .insert({
            customer_id: customerId,
            organization_id: organizationId,
            workshop_id: workshopId || null,
            brand,
            model,
            license_plate: plate || null,
            year: vehicle_year ? parseInt(vehicle_year) : null,
          } as any)
          .select('id')
          .single();

        if (!vehicleError && newVehicle) {
          vehicleId = (newVehicle as any).id;
          console.log('✅ [POST /api/appointments] Vehículo creado:', vehicleId);
        } else {
          console.warn('[POST /api/appointments] No se pudo crear el vehículo, la cita se creará sin vehículo');
        }
      }
    }

    // ─── 3. Normalizar fecha/hora y crear cita ────────────────────────────────
    let dateOnly = appointment_date || '';
    if (dateOnly.includes('T')) dateOnly = dateOnly.split('T')[0];

    let timeStr = appointment_time || '09:00';
    if (!timeStr.includes(':')) timeStr = `${timeStr}:00`;
    if (timeStr.split(':').length === 2) timeStr = `${timeStr}:00`;

    const appointmentDateTime = `${dateOnly}T${timeStr}`;

    const insertData: Record<string, any> = {
      customer_id: customerId,
      organization_id: organizationId,
      service_type,
      appointment_date: appointmentDateTime,
      duration: estimated_duration || 60,
      notes: notes || null,
      status: 'scheduled',
    };
    if (vehicleId) insertData.vehicle_id = vehicleId;

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert(insertData)
      .select(`*, customer:customers(id, name, phone, email), vehicle:vehicles(id, brand, model, year, license_plate)`)
      .single();

    if (appointmentError || !appointment) {
      console.error('[POST /api/appointments] Error creando cita:', appointmentError);
      return NextResponse.json({ success: false, error: `Error creando cita: ${appointmentError?.message}` }, { status: 500 });
    }

    console.log('✅ [POST /api/appointments] Cita creada:', appointment.id);
    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/appointments] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error al crear cita' }, { status: 500 });
  }
}

