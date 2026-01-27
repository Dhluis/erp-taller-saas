import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/messaging/sms-service';

/**
 * POST /api/messaging/test/sms
 * Enviar SMS de prueba
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener perfil usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error('[POST /api/messaging/test/sms] Error obteniendo perfil:', profileError);
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // 3. Parsear body
    const body = await request.json();
    const { testPhone } = body;

    if (!testPhone) {
      return NextResponse.json(
        { error: 'Número de teléfono requerido' },
        { status: 400 }
      );
    }

    // 4. Enviar SMS de prueba
    const success = await sendSMS(profile.organization_id, {
      to: testPhone,
      message: '✅ SMS de Prueba - Eagles ERP\n\nTu configuración de SMS está funcionando correctamente.\n\nFecha: ' + new Date().toLocaleString('es-MX')
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Error al enviar SMS de prueba. Verifica tu configuración de Twilio.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `SMS de prueba enviado a ${testPhone}`
    });

  } catch (error: any) {
    console.error('[POST /api/messaging/test/sms] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar SMS de prueba', details: error.message },
      { status: 500 }
    );
  }
}

