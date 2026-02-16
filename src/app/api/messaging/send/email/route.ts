import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmailViaSendGrid } from '@/lib/messaging/email-service';

/**
 * POST /api/messaging/send/email
 * Enviar email a cliente (producción)
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
      console.error('[POST /api/messaging/send/email] Error obteniendo perfil:', profileError);
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // 3. Parsear body
    const body = await request.json();
    const { to, subject, html, replyTo, fromName } = body;

    // Validaciones
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Campos requeridos: to, subject, html' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Email inválido: ${email}` },
          { status: 400 }
        );
      }
    }

    // 4. Enviar email
    const success = await sendEmailViaSendGrid(profile.organization_id, {
      to,
      subject,
      html,
      replyTo,
      fromName,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Error al enviar email. Verifica tu configuración.' },
        { status: 500 }
      );
    }

    // 5. Historial: no existe tabla email_messages; se implementará en futura migración
    console.log('[POST /api/messaging/send/email] Email enviado:', {
      to,
      subject,
      organizationId: profile.organization_id,
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'Email enviado exitosamente'
    });

  } catch (error: any) {
    console.error('[POST /api/messaging/send/email] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar email', details: error.message },
      { status: 500 }
    );
  }
}

