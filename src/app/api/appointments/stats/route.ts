import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments/stats - Obtener estadísticas de citas filtradas por organización
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/appointments/stats] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: null
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
      console.error('[GET /api/appointments/stats] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: null
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    // Obtener todas las citas de la organización
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('status, appointment_date')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[GET /api/appointments/stats] Error en query:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener estadísticas de citas',
          data: null
        },
        { status: 500 }
      );
    }

    const data = appointments || [];
    const total = data.length;
    const scheduled = data.filter(a => a.status === 'scheduled').length;
    const confirmed = data.filter(a => a.status === 'confirmed').length;
    const in_progress = data.filter(a => a.status === 'in_progress').length;
    const completed = data.filter(a => a.status === 'completed').length;
    const cancelled = data.filter(a => a.status === 'cancelled').length;
    const no_show = data.filter(a => a.status === 'no_show').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayCount = data.filter(a => a.appointment_date === today).length;
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const thisWeek = data.filter(a => {
      const appointmentDate = new Date(a.appointment_date);
      return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
    }).length;
    
    const thisMonth = data.filter(a => {
      const appointmentDate = new Date(a.appointment_date);
      return appointmentDate.getMonth() === now.getMonth() && appointmentDate.getFullYear() === now.getFullYear();
    }).length;

    const stats = {
      total,
      scheduled,
      confirmed,
      in_progress,
      completed,
      cancelled,
      no_show,
      today: todayCount,
      thisWeek,
      thisMonth
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[GET /api/appointments/stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener estadísticas de citas',
        data: null
      },
      { status: 500 }
    );
  }
}

