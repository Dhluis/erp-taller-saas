import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import * as sgMail from '@sendgrid/mail';

/**
 * POST /api/messaging/test/email
 * Enviar email de prueba con SendGrid (SIN depender de BD)
 *
 * Seguridad:
 * - Mantiene auth Supabase cuando es posible
 * - Bypass temporal controlado por header `x-messaging-test-token`
 *   si existe `MESSAGING_TEST_TOKEN` en env (para evitar endpoint abierto)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar (o bypass temporal con token)
    const testTokenHeader = request.headers.get('x-messaging-test-token') || '';
    const envTestToken = (process.env.MESSAGING_TEST_TOKEN || '').trim();

    let isAuthorized = false;

    // Intentar auth Supabase normal
    try {
      const supabase = createClientFromRequest(request);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!authError && user) {
        isAuthorized = true;
      }
    } catch (authCrash: any) {
      // Si falla por headers inválidos (p.ej. caracteres CRLF en env/cookies), permitir fallback con token
      console.error('⚠️ [SendGrid Test] Error en autenticación Supabase:', authCrash?.message || authCrash);
    }

    // Bypass temporal controlado por token (solo si se configuró env)
    if (!isAuthorized) {
      if (envTestToken && testTokenHeader.trim() === envTestToken) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'No autorizado',
          hint:
            'Inicia sesión o envía header x-messaging-test-token (requiere MESSAGING_TEST_TOKEN en env).',
        },
        { status: 401 }
      );
    }

    // 2. Parsear body
    const { testEmail } = await request.json();

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // 3. Verificar que SendGrid esté configurado
    const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'SendGrid no configurado. Agrega SENDGRID_API_KEY a las variables de entorno.',
        },
        { status: 500 }
      );
    }

    // 4. Configurar SendGrid (compatibilidad default/named export)
    if ((sgMail as any).default && typeof (sgMail as any).default.setApiKey === 'function') {
      (sgMail as any).default.setApiKey(apiKey);
    } else if (typeof (sgMail as any).setApiKey === 'function') {
      (sgMail as any).setApiKey(apiKey);
    } else {
      (sgMail as any).setApiKey(apiKey);
    }

    // 5. Preparar email
    const from = {
      email: (process.env.SMTP_FROM_EMAIL || 'servicios@eaglessystem.io').trim(),
      name: (process.env.SMTP_FROM_NAME || 'Eagles ERP').trim(),
    };

    // 6. Enviar email
    await (sgMail as any).send({
      to: testEmail,
      from,
      subject: '✅ Email de Prueba - Eagles ERP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ ¡Email de Prueba Exitoso!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hola,</p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Este es un email de prueba desde <strong>Eagles ERP</strong>.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-weight: 500;">
                ✓ Tu configuración de email está funcionando correctamente
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              <strong>Información técnica:</strong><br>
              Enviado desde: ${from.name} &lt;${from.email}&gt;<br>
              Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}<br>
              Powered by: SendGrid
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Eagles ERP - Sistema de Gestión para Talleres Automotrices
            </p>
          </div>
        </div>
      `,
      text: `
        ✅ Email de Prueba - Eagles ERP
        
        Hola,
        
        Este es un email de prueba desde Eagles ERP.
        
        ✓ Tu configuración de email está funcionando correctamente
        
        ---
        Enviado desde: ${from.name} <${from.email}>
        Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        Powered by: SendGrid
      `,
    });

    console.log('✅ [SendGrid Test] Email enviado exitosamente:', {
      to: testEmail,
      from: from.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `✅ Email de prueba enviado a ${testEmail}`,
      from: from.email,
    });
  } catch (error: any) {
    console.error('❌ [SendGrid Test] Error:', error);

    // Error específico de SendGrid
    if (error?.response) {
      console.error('[SendGrid Test] Response body:', error.response.body);
      return NextResponse.json(
        {
          error: 'Error al enviar email',
          details:
            error.response.body?.errors?.[0]?.message ||
            'Error desconocido',
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || 'Error al enviar email de prueba',
        details: 'Revisa las variables de entorno de SendGrid',
      },
      { status: 500 }
    );
  }
}

