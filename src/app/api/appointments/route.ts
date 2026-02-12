import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments - Obtener citas filtradas por organización
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/appointments] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: []
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[GET /api/appointments] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: []
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const vehicleId = searchParams.get('vehicle_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Construir query
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        customer:customers(id, name, phone, email),
        vehicle:vehicles(id, brand, model, year, license_plate)
      `)
      .eq('organization_id', organizationId);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }
    if (dateFrom) {
      query = query.gte('appointment_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('appointment_date', dateTo);
    }

    // Ordenar por fecha
    const { data: appointments, error } = await query
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('[GET /api/appointments] Error en query:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener citas',
          data: []
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: appointments || [],
      count: appointments?.length || 0
    });
  } catch (error: any) {
    console.error('[GET /api/appointments] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener citas',
        data: []
      },
      { status: 500 }
    );
  }
}

