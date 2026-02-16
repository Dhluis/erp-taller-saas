import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/messaging/whatsapp-service';

/**
 * POST /api/messaging/send/whatsapp
 * Enviar WhatsApp a cliente (producción)
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
      console.error('[POST /api/messaging/send/whatsapp] Error obteniendo perfil:', profileError);
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

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    // Validar URL de media si se proporciona
    if (mediaUrl) {
      try {
        new URL(mediaUrl);
      } catch {
        return NextResponse.json(
          { error: 'URL de media inválida' },
          { status: 400 }
        );
      }
    }

    // 4. Enviar WhatsApp
    const result = await sendWhatsAppMessage(profile.organization_id, {
      to,
      message,
      mediaUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Error al enviar WhatsApp. Verifica tu configuración.',
          provider: result.provider
        },
        { status: 500 }
      );
    }

    // 5. Historial: whatsapp_messages requiere conversation_id; envíos directos sin conversación no se persisten
    console.log('[POST /api/messaging/send/whatsapp] WhatsApp enviado:', {
      to,
      messageLength: message.length,
      provider: result.provider,
      organizationId: profile.organization_id,
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp enviado exitosamente',
      provider: result.provider
    });

  } catch (error: any) {
    console.error('[POST /api/messaging/send/whatsapp] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar WhatsApp', details: error.message },
      { status: 500 }
    );
  }
}

