import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/messaging/sms/webhook/[organizationId]/status
 * Webhook de Twilio para actualizaciones de estado de SMS
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
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    console.log('📊 [SMS Status Webhook] Actualización de estado:', {
      organizationId,
      messageSid,
      status: messageStatus,
      errorCode,
      errorMessage
    });

    // Validar que tenemos messageSid
    if (!messageSid || !messageStatus) {
      console.error('❌ [SMS Status Webhook] Datos incompletos');
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          status: 200,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // Mapear estados de Twilio a nuestros estados
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'sending': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'undelivered',
      'failed': 'failed',
    };

    const mappedStatus = statusMap[messageStatus.toLowerCase()] || 'pending';

    // Actualizar estado en BD
    const supabaseAdmin = getSupabaseServiceClient();
    const updateData: any = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    };

    if (errorCode) {
      updateData.error_code = errorCode;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (mappedStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('sms_messages')
      .update(updateData)
      .eq('message_sid', messageSid)
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error('❌ [SMS Status Webhook] Error actualizando estado:', updateError);
      // Continuar aunque falle la actualización
    } else {
      console.log('✅ [SMS Status Webhook] Estado actualizado:', mappedStatus);
    }

    // Retornar respuesta XML vacía
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      }
    );

  } catch (error: any) {
    console.error('❌ [SMS Status Webhook] Error procesando webhook:', error);
    
    // SIEMPRE retornar 200/XML para evitar reintentos infinitos
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      }
    );
  }
}

