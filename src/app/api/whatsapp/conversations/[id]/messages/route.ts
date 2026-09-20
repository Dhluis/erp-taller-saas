import { NextRequest, NextResponse } from 'next/server';
/**
 * API Route para enviar una respuesta manual en una conversación de WhatsApp
 * POST: envía el mensaje (vía sendMessage, respeta cuota y proveedor configurado)
 * y lo registra en whatsapp_messages.
 */

import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { hasPermission, UserRole } from '@/lib/auth/permissions';
import { sendMessage } from '@/lib/messaging/sender';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantContext = await getTenantContext(request);
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    if (!hasPermission(tenantContext.role as UserRole, 'whatsapp', 'update')) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para responder en la bandeja de WhatsApp' }, { status: 403 });
    }

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ success: false, error: 'El mensaje no puede estar vacío' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Servicio no disponible' }, { status: 500 });
    }

    const { data: conversation, error: convError } = await (supabaseAdmin as any)
      .from('whatsapp_conversations')
      .select('id, customer_phone, organization_id')
      .eq('id', id)
      .eq('organization_id', tenantContext.organizationId)
      .maybeSingle();

    if (convError || !conversation) {
      return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
    }

    // ✅ El servidor es la fuente de verdad de la ventana de 24h — la UI ya
    // debería haber deshabilitado el input, pero no confiamos solo en eso.
    const { data: lastInbound } = await (supabaseAdmin as any)
      .from('whatsapp_messages')
      .select('created_at')
      .eq('conversation_id', id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastInbound?.created_at) {
      const elapsed = Date.now() - new Date(lastInbound.created_at).getTime();
      if (elapsed > TWENTY_FOUR_HOURS_MS) {
        return NextResponse.json(
          {
            success: false,
            error: 'Han pasado más de 24h desde el último mensaje del cliente. Solo se pueden enviar plantillas aprobadas por Meta (disponible en una fase futura).',
            errorCode: 'OUTSIDE_24H_WINDOW',
          },
          { status: 409 }
        );
      }
    }

    const result = await sendMessage(tenantContext.organizationId, conversation.customer_phone, message);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo enviar el mensaje', errorCode: result.errorCode },
        { status: result.errorCode === 'OUTSIDE_24H_WINDOW' ? 409 : 502 }
      );
    }

    const sentAt = new Date().toISOString();

    const { data: savedMessage, error: insertError } = await (supabaseAdmin as any)
      .from('whatsapp_messages')
      .insert({
        conversation_id: id,
        organization_id: tenantContext.organizationId,
        from_number: null,
        to_number: conversation.customer_phone,
        direction: 'outbound',
        body: message,
        message_type: 'text',
        provider: 'meta',
        provider_message_id: result.messageId,
        status: 'sent',
        sent_at: sentAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/whatsapp/conversations/[id]/messages] Error guardando mensaje enviado:', insertError);
      // El mensaje ya salió por Meta — no fallar la respuesta al usuario por un error de guardado
    }

    await (supabaseAdmin as any)
      .from('whatsapp_conversations')
      .update({ last_message: message, last_message_at: sentAt, updated_at: sentAt })
      .eq('id', id);

    return NextResponse.json({ success: true, data: savedMessage || { body: message, sent_at: sentAt } });
  } catch (error) {
    console.error('[POST /api/whatsapp/conversations/[id]/messages] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
