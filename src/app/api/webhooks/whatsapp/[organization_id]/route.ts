// src/app/api/webhooks/whatsapp/[organization_id]/route.ts

/**
 * 🎯 API Route: Webhook de WhatsApp
 * 
 * Recibe webhooks de Twilio o Evolution API
 * Ruta: POST /api/webhooks/whatsapp/[organization_id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseTwilioWebhook, validateTwilioSignature } from '@/integrations/whatsapp/utils/twilio-parser';
import { parseEvolutionWebhook, validateEvolutionWebhook } from '@/integrations/whatsapp/utils/evolution-parser';
import { processIncomingMessage } from '@/integrations/whatsapp/services/webhook-handler';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs'; // Importante para Supabase server
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/whatsapp/[organization_id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { organization_id: string } }
) {
  try {
    const organizationId = params.organization_id;

    console.log('[WebhookAPI] Webhook recibido para org:', organizationId);

    // 1. Validar que la organización existe
    const supabase = await createClient();
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('[WebhookAPI] Organización no encontrada:', organizationId);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // 2. Obtener configuración de WhatsApp
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('provider, settings')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!config) {
      console.error('[WebhookAPI] Configuración WhatsApp no encontrada');
      return NextResponse.json(
        { error: 'WhatsApp not configured' },
        { status: 400 }
      );
    }

    // 3. Parsear según el provider
    let parsedMessage;

    if (config.provider === 'twilio') {
      // Twilio envía form-data
      const formData = await request.formData();
      const payload: any = {};
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });

      // Validar firma de Twilio (opcional pero recomendado)
      const twilioSignature = request.headers.get('x-twilio-signature');
      if (twilioSignature && config.settings?.auth_token) {
        const isValid = validateTwilioSignature(
          config.settings.auth_token,
          twilioSignature,
          request.url,
          payload
        );

        if (!isValid) {
          console.error('[WebhookAPI] Firma de Twilio inválida');
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 403 }
          );
        }
      }

      parsedMessage = parseTwilioWebhook(payload, organizationId);

    } else if (config.provider === 'evolution') {
      // Evolution envía JSON
      const payload = await request.json();

      // Validar API Key de Evolution
      const evolutionApiKey = request.headers.get('apikey');
      if (evolutionApiKey && config.settings?.api_key) {
        const isValid = validateEvolutionWebhook(
          config.settings.api_key,
          evolutionApiKey
        );

        if (!isValid) {
          console.error('[WebhookAPI] API Key de Evolution inválida');
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 403 }
          );
        }
      }

      parsedMessage = parseEvolutionWebhook(payload, organizationId);

      // Evolution devuelve null para mensajes salientes
      if (!parsedMessage) {
        return NextResponse.json({ success: true, message: 'Outbound message ignored' });
      }

    } else {
      console.error('[WebhookAPI] Provider no soportado:', config.provider);
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 }
      );
    }

    // 4. Procesar mensaje
    const result = await processIncomingMessage({
      organizationId,
      message: parsedMessage
    });

    if (!result.success) {
      console.error('[WebhookAPI] Error procesando mensaje:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log('[WebhookAPI] Mensaje procesado exitosamente:', result.messageId);

    // 5. Responder (importante para Twilio)
    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('[WebhookAPI] Error en webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/whatsapp/[organization_id]
 * Para verificar que el endpoint está activo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { organization_id: string } }
) {
  return NextResponse.json({
    status: 'active',
    organization_id: params.organization_id,
    message: 'WhatsApp webhook endpoint is ready'
  });
}

