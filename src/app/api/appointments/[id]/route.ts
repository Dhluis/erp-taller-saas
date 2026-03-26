import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';

/** Shared helper: resolve organization_id from authenticated user */
async function resolveOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, organizationId: null, workshopId: null, error: 'No autorizado' };

  const supabaseAdmin = getSupabaseServiceClient();
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('organization_id, workshop_id')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !userProfile?.organization_id) {
    return { user, organizationId: null, workshopId: null, error: 'No se pudo obtener la organización del usuario' };
  }

  return {
    user,
    organizationId: userProfile.organization_id as string,
    workshopId: (userProfile as any).workshop_id as string | null,
    error: null,
  };
}

/**
 * PUT /api/appointments/[id] - Actualizar cita existente
 * Usa service role para evitar problemas de RLS con usuarios recién creados (Asesores)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de cita requerido' }, { status: 400 });
    }

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
      status: newStatus,
    } = body;

    const supabaseAdmin = getSupabaseServiceClient();

    // Verify the appointment belongs to this organization
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('id, organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing || (existing as any).organization_id !== organizationId) {
      return NextResponse.json({ success: false, error: 'Cita no encontrada o sin permiso' }, { status: 404 });
    }

    // ─── 1. Resolver cliente ───────────────────────────────────────────────────
    let customerId: string | undefined = body.customer_id;

    if (!customerId && customer_phone) {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('phone', customer_phone)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingCustomer) {
        customerId = (existingCustomer as any).id;
      } else if (customer_name) {
        const { data: newCustomer } = await supabaseAdmin
          .from('customers')
          .insert({
            organization_id: organizationId,
            workshop_id: workshopId || null,
            name: customer_name,
            phone: customer_phone,
            email: customer_email || null,
          } as any)
          .select('id')
          .single();
        if (newCustomer) customerId = (newCustomer as any).id;
      }
    }

    // ─── 2. Resolver vehículo ─────────────────────────────────────────────────
    let vehicleId: string | null = body.vehicle_id || null;

    if (!vehicleId && customerId) {
      const brand = vehicle_brand?.trim() || '';
      const model = vehicle_model?.trim() || '';
      const plate = vehicle_plate?.trim().toUpperCase() || '';
      const hasVehicleData = brand || model || plate;

      if (hasVehicleData && plate) {
        const { data: existingVehicle } = await supabaseAdmin
          .from('vehicles')
          .select('id')
          .eq('license_plate', plate)
          .eq('customer_id', customerId)
          .maybeSingle();
        if (existingVehicle) vehicleId = (existingVehicle as any).id;
      }

      if (!vehicleId && hasVehicleData && brand && model) {
        const { data: newVehicle } = await supabaseAdmin
          .from('vehicles')
          .insert({
            customer_id: customerId,
            organization_id: organizationId,
            workshop_id: workshopId || null,
            brand,
            model,
            license_plate: vehicle_plate?.trim().toUpperCase() || null,
            year: vehicle_year ? parseInt(vehicle_year) : null,
          } as any)
          .select('id')
          .single();
        if (newVehicle) vehicleId = (newVehicle as any).id;
      }
    }

    // ─── 3. Normalizar fecha/hora y actualizar cita ───────────────────────────
    let dateOnly = appointment_date || '';
    if (dateOnly.includes('T')) dateOnly = dateOnly.split('T')[0];

    let timeStr = appointment_time || '09:00';
    if (!timeStr.includes(':')) timeStr = `${timeStr}:00`;
    if (timeStr.split(':').length === 2) timeStr = `${timeStr}:00`;

    const appointmentDateTime = `${dateOnly}T${timeStr}`;

    const updateData: Record<string, any> = {
      service_type,
      appointment_date: appointmentDateTime,
      duration: estimated_duration || 60,
      notes: notes || null,
      status: newStatus || 'scheduled',
      vehicle_id: vehicleId,
    };
    if (customerId) updateData.customer_id = customerId;

    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select(`*, customer:customers(id, name, phone, email), vehicle:vehicles(id, brand, model, year, license_plate)`)
      .single();

    if (updateError || !updatedAppointment) {
      console.error('[PUT /api/appointments/[id]] Error:', updateError);
      return NextResponse.json({ success: false, error: `Error actualizando cita: ${updateError?.message}` }, { status: 500 });
    }

    console.log('✅ [PUT /api/appointments/[id]] Cita actualizada:', id);
    return NextResponse.json({ success: true, data: updatedAppointment });
  } catch (error: any) {
    console.error('[PUT /api/appointments/[id]] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error al actualizar cita' }, { status: 500 });
  }
}

/**
 * DELETE /api/appointments/[id] - Eliminar cita
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de cita requerido' }, { status: 400 });
    }

    const { organizationId, error } = await resolveOrg(request);
    if (error || !organizationId) {
      return NextResponse.json({ success: false, error: error || 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('id, organization_id')
      .eq('id', id)
      .single();

    if (!existing || (existing as any).organization_id !== organizationId) {
      return NextResponse.json({ success: false, error: 'Cita no encontrada o sin permiso' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ success: false, error: `Error eliminando cita: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/appointments/[id]] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error al eliminar cita' }, { status: 500 });
  }
}
