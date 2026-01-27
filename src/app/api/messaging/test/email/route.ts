import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmailViaSendGrid } from '@/lib/messaging/email-service';

/**
 * POST /api/messaging/test/email
 * Enviar email de prueba
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
      .select('organization_id, email, full_name')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error('[POST /api/messaging/test/email] Error obteniendo perfil:', profileError);
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // 3. Parsear body
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // 4. Enviar email de prueba
    const success = await sendEmailViaSendGrid(profile.organization_id, {
      to: testEmail,
      subject: '✅ Email de Prueba - Eagles ERP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">✅ ¡Email de Prueba Exitoso!</h2>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hola,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Este es un <strong>email de prueba</strong> desde Eagles ERP.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Tu configuración de email está funcionando correctamente. ✅
            </p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>Organización:</strong> ${profile.organization_id.substring(0, 8)}...<br>
                <strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              Este es un mensaje de prueba. No respondas a este email.
            </p>
            <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">
              Enviado desde Eagles ERP | Sistema de Mensajería
            </p>
          </div>
        </div>
      `,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Error al enviar email de prueba. Verifica tu configuración de SendGrid.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email de prueba enviado a ${testEmail}`
    });

  } catch (error: any) {
    console.error('[POST /api/messaging/test/email] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar email de prueba', details: error.message },
      { status: 500 }
    );
  }
}

