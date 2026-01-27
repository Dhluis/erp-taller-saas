import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/messaging/sms-service';

/**
 * POST /api/messaging/send/sms
 * Enviar SMS a cliente (producción)
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
      console.error('[POST /api/messaging/send/sms] Error obteniendo perfil:', profileError);
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // 3. Parsear body
    const body = await request.json();
    const { to, message, mediaUrl } = body;

    // Validaciones
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Campos requeridos: to, message' },
        { status: 400 }
      );
    }

    if (message.length > 1600) {
      return NextResponse.json(
        { error: 'Mensaje muy largo (máx 1600 caracteres)' },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    // 4. Enviar SMS
    const success = await sendSMS(profile.organization_id, {
      to,
      message,
      mediaUrl,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Error al enviar SMS. Verifica tu configuración de Twilio.' },
        { status: 500 }
      );
    }

    // 5. TODO: Guardar en historial (implementar después)
    console.log('[POST /api/messaging/send/sms] SMS enviado:', {
      to,
      messageLength: message.length,
      organizationId: profile.organization_id,
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'SMS enviado exitosamente'
    });

  } catch (error: any) {
    console.error('[POST /api/messaging/send/sms] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar SMS', details: error.message },
      { status: 500 }
    );
  }
}

