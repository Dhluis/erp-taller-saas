/**
 * WEBHOOK ENDPOINT - Twilio WhatsApp API
 * 
 * Recibe mensajes entrantes de Twilio WhatsApp API (tier premium)
 * y los procesa con la capa unificada de mensajería
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/messaging/unified-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/messaging/twilio/webhook/[organizationId]
 * Recibe mensajes de Twilio WhatsApp API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    console.log('[Twilio Webhook] 📨 Mensaje recibido de Twilio');
    
    // Twilio envía form-data, convertir a objeto
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log('[Twilio Webhook] Body recibido:', {
      From: body.From,
      Body: body.Body?.substring(0, 50),
      MessageSid: body.MessageSid,
    });
    
    // Validar que sea un mensaje entrante (no status callback)
    if (!body.From || !body.Body) {
      console.log('[Twilio Webhook] ⚠️ No es un mensaje entrante, ignorando');
      // Retornar TwiML vacío para que Twilio no reintente
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          headers: { 'Content-Type': 'text/xml' }
        }
      );
    }
    
    // Delegar a capa unificada
    await handleIncomingMessage('twilio', body, params.organizationId);
    
    // Twilio requiere respuesta TwiML (aunque esté vacía)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' }
      }
    );
    
  } catch (error: any) {
    console.error('[Twilio Webhook] ❌ Error:', error);
    
    // Siempre retornar 200 con TwiML para evitar reintentos de Twilio
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200
      }
    );
  }
}

/**
 * GET /api/messaging/twilio/webhook/[organizationId]
 * Verificación del webhook (para algunos providers)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  console.log('[Twilio Webhook] GET request - Verificación');
  return NextResponse.json({ 
    status: 'ok',
    organizationId: params.organizationId 
  });
}
