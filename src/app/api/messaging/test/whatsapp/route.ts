import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/messaging/whatsapp-service';

/**
 * POST /api/messaging/test/whatsapp
 * Enviar WhatsApp de prueba
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
      console.error('[POST /api/messaging/test/whatsapp] Error obteniendo perfil:', profileError);
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

    // 4. Obtener proveedor antes de enviar (para incluir en mensaje)
    const { getMessagingConfig } = await import('@/lib/messaging/twilio-client');
    const config = await getMessagingConfig(profile.organization_id);
    const providerName = config?.whatsappProvider === 'twilio' ? 'Twilio Business API' : 'WAHA';

    // 5. Enviar WhatsApp de prueba
    const result = await sendWhatsAppMessage(profile.organization_id, {
      to: testPhone,
      message: `✅ *WhatsApp de Prueba - Eagles System*

Tu configuración está funcionando correctamente.

*Proveedor:* ${providerName}
*Fecha:* ${new Date().toLocaleString('es-MX')}

Este es un mensaje de prueba.`
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Error al enviar WhatsApp de prueba. Verifica tu configuración.',
          provider: result.provider
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp de prueba enviado a ${testPhone}`,
      provider: result.provider
    });

  } catch (error: any) {
    console.error('[POST /api/messaging/test/whatsapp] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar WhatsApp de prueba', details: error.message },
      { status: 500 }
    );
  }
}

