import { NextRequest, NextResponse } from 'next/server';
/**
 * Webhook de WhatsApp Cloud API (Meta) — ÚNICO Y GLOBAL, no por organización.
 * Meta configura el Callback URL una sola vez a nivel de la Meta App; cada
 * evento entrante trae metadata.phone_number_id, que es lo único que permite
 * saber a qué organización pertenece el mensaje (ver
 * organization_messaging_config.meta_phone_number_id).
 *
 * GET  — handshake de verificación (hub.mode / hub.verify_token / hub.challenge)
 * POST — mensajes entrantes y delivery receipts (statuses)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { verifyMetaWebhookSignature } from '@/lib/messaging/meta-whatsapp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =====================================================
// GET - Verificación del webhook
// =====================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Meta Webhook] Verificación fallida', { mode, tokenMatches: token === verifyToken });
  return new NextResponse('Forbidden', { status: 403 });
}

// =====================================================
// POST - Mensajes entrantes y delivery receipts
// =====================================================
export async function POST(request: NextRequest) {
  // Leer el body crudo ANTES de parsear JSON — necesario para verificar la firma
  const rawBody = await request.text();

  const appSecret = process.env.META_APP_SECRET;
  const signature = request.headers.get('x-hub-signature-256');

  if (!appSecret || !verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    console.error('[Meta Webhook] Firma inválida o META_APP_SECRET no configurado — request rechazado');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[Meta Webhook] Body no es JSON válido');
    // Firma válida pero body corrupto: no es un ataque, responder 200 para que Meta no reintente indefinidamente
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    console.error('[Meta Webhook] Service client no disponible');
    return NextResponse.json({ received: true });
  }

  try {
    const entries = payload?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const phoneNumberId = value?.metadata?.phone_number_id;
        const displayPhoneNumber = value?.metadata?.display_phone_number || '';

        if (!phoneNumberId) {
          console.warn('[Meta Webhook] Evento sin phone_number_id, se ignora');
          continue;
        }

        // ✅ Resolver organización — único mecanismo de ruteo multi-tenant
        const { data: config } = await (supabase as any)
          .from('organization_messaging_config')
          .select('organization_id')
          .eq('meta_phone_number_id', phoneNumberId)
          .maybeSingle();

        const organizationId = config?.organization_id;
        if (!organizationId) {
          console.warn('[Meta Webhook] phone_number_id sin organización asignada:', phoneNumberId);
          continue;
        }

        // --- Mensajes entrantes ---
        const messages = value?.messages || [];
        for (const message of messages) {
          await handleInboundMessage(supabase, organizationId, displayPhoneNumber, value, message);
        }

        // --- Delivery receipts de mensajes salientes ---
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          await handleStatusUpdate(supabase, status);
        }
      }
    }
  } catch (error) {
    // No romper el ack por errores de procesamiento parcial — Meta reintenta y
    // puede terminar dando de baja la suscripción si fallamos repetido.
    console.error('[Meta Webhook] Error procesando payload:', error);
  }

  return NextResponse.json({ received: true });
}

function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  return digits ? `+${digits}` : '';
}

async function handleInboundMessage(
  supabase: any,
  organizationId: string,
  displayPhoneNumber: string,
  value: any,
  message: any
) {
  const customerPhone = normalizePhone(message.from);
  if (!customerPhone) return;

  const contact = (value.contacts || []).find((c: any) => c.wa_id === message.from);
  const customerName = contact?.profile?.name || null;

  const sentAt = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  let body = '';
  let mediaId: string | null = null;
  let mediaType: string | null = null;

  switch (message.type) {
    case 'text':
      body = message.text?.body || '';
      break;
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker': {
      mediaType = message.type;
      mediaId = message[message.type]?.id || null;
      // Descarga/re-alojo del medio queda para una etapa siguiente — se guarda
      // el media_id en metadata para no perder la referencia.
      body = message[message.type]?.caption || `[${message.type}]`;
      break;
    }
    case 'location':
      body = `[ubicación] ${message.location?.latitude ?? ''}, ${message.location?.longitude ?? ''}`;
      break;
    default:
      body = `[mensaje no soportado: ${message.type}]`;
  }

  // Buscar conversación existente por organización + teléfono del cliente
  const { data: existingConversation } = await supabase
    .from('whatsapp_conversations')
    .select('id, messages_count')
    .eq('organization_id', organizationId)
    .eq('customer_phone', customerPhone)
    .maybeSingle();

  let conversationId: string;

  if (existingConversation) {
    conversationId = existingConversation.id;
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message: body,
        last_message_at: sentAt,
        messages_count: (existingConversation.messages_count || 0) + 1,
        status: 'open',
        customer_name: customerName || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
  } else {
    const { data: newConversation, error: insertError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        organization_id: organizationId,
        customer_phone: customerPhone,
        customer_name: customerName,
        status: 'open',
        is_bot_active: false,
        last_message: body,
        last_message_at: sentAt,
        messages_count: 1,
        started_at: sentAt,
      })
      .select('id')
      .single();

    if (insertError || !newConversation) {
      console.error('[Meta Webhook] Error creando conversación:', insertError);
      return;
    }
    conversationId = newConversation.id;
  }

  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    from_number: customerPhone,
    to_number: normalizePhone(displayPhoneNumber),
    direction: 'inbound',
    body,
    message_type: message.type,
    media_type: mediaType,
    provider: 'meta',
    provider_message_id: message.id,
    metadata: mediaId ? { media_id: mediaId } : null,
    sent_at: sentAt,
  });
}

async function handleStatusUpdate(supabase: any, status: any) {
  if (!status?.id) return;

  const updates: Record<string, any> = { status: status.status };
  const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : null;

  if (status.status === 'delivered' && timestamp) updates.delivered_at = timestamp;
  if (status.status === 'read' && timestamp) updates.read_at = timestamp;

  await supabase.from('whatsapp_messages').update(updates).eq('provider_message_id', status.id);
}
