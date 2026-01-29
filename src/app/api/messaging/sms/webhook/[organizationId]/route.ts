import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/messaging/sms/webhook/[organizationId]
 * Webhook de Twilio para SMS entrantes
 * IMPORTANTE: Siempre retornar 200/XML para evitar reintentos infinitos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const organizationId = params.organizationId;

    // Parsear datos del webhook de Twilio (form-urlencoded)
    const formData = await request.formData();
    const fromNumber = formData.get('From') as string;
    const toNumber = formData.get('To') as string;
    const messageBody = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const accountSid = formData.get('AccountSid') as string;

    console.log('📨 [SMS Webhook] Mensaje entrante:', {
      organizationId,
      from: fromNumber,
      to: toNumber,
      messageSid,
      bodyLength: messageBody?.length || 0
    });

    // Validar que tenemos datos mínimos
    if (!fromNumber || !toNumber || !messageBody || !messageSid) {
      console.error('❌ [SMS Webhook] Datos incompletos del webhook');
      // Retornar 200/XML para evitar reintentos
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          status: 200,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // Guardar SMS entrante en BD
    const supabaseAdmin = getSupabaseServiceClient();
    const { error: insertError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        organization_id: organizationId,
        to_number: toNumber,
        from_number: fromNumber,
        message_body: messageBody,
        message_sid: messageSid,
        status: 'delivered', // SMS entrantes están "delivered" por defecto
        delivered_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ [SMS Webhook] Error guardando SMS en BD:', insertError);
      // Continuar aunque falle el guardado
    } else {
      console.log('✅ [SMS Webhook] SMS guardado en BD');
    }

    // TODO: Aquí puedes agregar lógica para:
    // - Procesar comandos del cliente (ej: "STATUS", "INFO")
    // - Responder automáticamente
    // - Integrar con chatbot/IA

    // Retornar respuesta XML vacía (Twilio espera XML)
    // Para responder, puedes usar <Message>:
    // return new NextResponse(
    //   '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Gracias por tu mensaje</Message></Response>',
    //   { headers: { 'Content-Type': 'application/xml' } }
    // );

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      }
    );

  } catch (error: any) {
    console.error('❌ [SMS Webhook] Error procesando webhook:', error);
    
    // SIEMPRE retornar 200/XML para evitar reintentos infinitos de Twilio
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      }
    );
  }
}

