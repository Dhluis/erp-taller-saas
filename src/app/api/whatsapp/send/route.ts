/**
 * API ROUTE - Enviar Mensajes de WhatsApp
 * 
 * POST /api/whatsapp/send
 * 
 * Permite enviar mensajes de texto, imagen o archivo desde la UI
 * usando el servicio WAHA.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  sendTextMessage,
  sendImage,
  sendFile
} from '@/integrations/whatsapp/services/waha-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SendMessageBody {
  conversationId: string;
  to: string; // Número de teléfono
  message?: string; // Texto del mensaje
  type?: 'text' | 'image' | 'file'; // Tipo de mensaje (default: 'text')
  mediaUrl?: string; // URL de la imagen o archivo
  filename?: string; // Nombre del archivo (requerido para type='file')
  caption?: string; // Caption para imagen o archivo
}

/**
 * POST /api/whatsapp/send
 * Envía un mensaje de WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar autenticación
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    console.log(`[WhatsApp Send] Enviando mensaje para organización: ${organizationId}`);

    // 2. Parsear body
    const body: SendMessageBody = await request.json();

    // 3. Validaciones básicas
    if (!body.to) {
      return NextResponse.json({
        success: false,
        error: 'El campo "to" (número de teléfono) es requerido'
      }, { status: 400 });
    }

    // 4. Determinar tipo de mensaje (default: 'text')
    const messageType = body.type || 'text';

    // 5. Validaciones según el tipo
    const validationError = validateMessageType(messageType, body);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }

    // 6. Validar que la conversación existe y pertenece a la organización
    const supabase = getSupabaseServiceClient();
    if (body.conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id, organization_id, customer_phone')
        .eq('id', body.conversationId)
        .eq('organization_id', organizationId)
        .single();

      if (convError || !conversation) {
        return NextResponse.json({
          success: false,
          error: 'Conversación no encontrada o no pertenece a esta organización'
        }, { status: 404 });
      }

      // Si hay conversationId, usar el teléfono de la conversación si no se proporciona 'to'
      if (!body.to && conversation.customer_phone) {
        body.to = conversation.customer_phone;
      }
    }

    // 7. Enviar mensaje según el tipo
    let sendResult;
    let messageBody = '';
    let messageId: string | undefined;

    switch (messageType) {
      case 'text':
        if (!body.message) {
          return NextResponse.json({
            success: false,
            error: 'El campo "message" es requerido para mensajes de texto'
          }, { status: 400 });
        }
        
        console.log(`[WhatsApp Send] Enviando mensaje de texto a ${body.to}`);
        sendResult = await sendTextMessage(organizationId, body.to, body.message);
        messageBody = body.message;
        break;

      case 'image':
        if (!body.mediaUrl) {
          return NextResponse.json({
            success: false,
            error: 'El campo "mediaUrl" es requerido para mensajes de imagen'
          }, { status: 400 });
        }
        
        console.log(`[WhatsApp Send] Enviando imagen a ${body.to}`);
        sendResult = await sendImage(
          organizationId,
          body.to,
          body.mediaUrl,
          body.caption
        );
        messageBody = body.caption || '';
        break;

      case 'file':
        if (!body.mediaUrl || !body.filename) {
          return NextResponse.json({
            success: false,
            error: 'Los campos "mediaUrl" y "filename" son requeridos para mensajes de archivo'
          }, { status: 400 });
        }
        
        console.log(`[WhatsApp Send] Enviando archivo a ${body.to}`);
        sendResult = await sendFile(
          organizationId,
          body.to,
          body.mediaUrl,
          body.filename,
          body.caption
        );
        messageBody = body.caption || body.filename || '';
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Tipo de mensaje no soportado: ${messageType}`
        }, { status: 400 });
    }

    // 8. Verificar resultado del envío
    if (!sendResult.sent) {
      console.error('[WhatsApp Send] ❌ Error enviando mensaje:', sendResult.error);
      return NextResponse.json({
        success: false,
        error: sendResult.error || 'Error desconocido al enviar mensaje'
      }, { status: 500 });
    }

    messageId = sendResult.messageId;
    console.log(`[WhatsApp Send] ✅ Mensaje enviado exitosamente: ${messageId}`);

    // 9. Guardar mensaje en la base de datos
    const timestamp = new Date();
    
    // Determinar campos según el tipo
    const messageData: any = {
      conversation_id: body.conversationId || null,
      organization_id: organizationId,
      direction: 'outbound',
      from_number: '', // Se completará con el número del negocio
      to_number: body.to,
      body: messageBody,
      status: 'sent',
      provider: 'waha',
      provider_message_id: messageId || `out_${Date.now()}`,
      created_at: timestamp.toISOString()
    };

    // Agregar campos específicos según el tipo
    if (messageType === 'image' || messageType === 'file') {
      messageData.media_url = body.mediaUrl;
      messageData.message_type = messageType;
    }

    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert(messageData)
      .select('id')
      .single();

    if (saveError) {
      console.error('[WhatsApp Send] ⚠️ Error guardando mensaje en BD:', saveError);
      // No fallar si no se puede guardar, el mensaje ya se envió
    } else {
      console.log('[WhatsApp Send] ✅ Mensaje guardado en BD:', savedMessage.id);
    }

    // 10. Actualizar conversación si hay conversationId
    if (body.conversationId) {
      // Obtener count actual
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('messages_count')
        .eq('id', body.conversationId)
        .single();

      // Actualizar conversación
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: messageBody || (messageType === 'image' ? '[Imagen]' : messageType === 'file' ? `[Archivo: ${body.filename}]` : ''),
          last_message_at: timestamp.toISOString(),
          messages_count: (conv?.messages_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.conversationId);

      console.log('[WhatsApp Send] ✅ Conversación actualizada');
    }

    // 11. Retornar éxito
    return NextResponse.json({
      success: true,
      data: {
        messageId: messageId || savedMessage?.id,
        sent: true,
        timestamp: timestamp.toISOString(),
        type: messageType
      }
    });

  } catch (error) {
    console.error('[WhatsApp Send] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar mensaje'
    }, { status: 500 });
  }
}

/**
 * Valida los campos según el tipo de mensaje
 */
function validateMessageType(type: string, body: SendMessageBody): string | null {
  switch (type) {
    case 'text':
      if (!body.message || body.message.trim() === '') {
        return 'El campo "message" es requerido para mensajes de texto';
      }
      break;

    case 'image':
      if (!body.mediaUrl || body.mediaUrl.trim() === '') {
        return 'El campo "mediaUrl" es requerido para mensajes de imagen';
      }
      break;

    case 'file':
      if (!body.mediaUrl || body.mediaUrl.trim() === '') {
        return 'El campo "mediaUrl" es requerido para mensajes de archivo';
      }
      if (!body.filename || body.filename.trim() === '') {
        return 'El campo "filename" es requerido para mensajes de archivo';
      }
      break;

    default:
      return `Tipo de mensaje no válido: ${type}. Debe ser 'text', 'image' o 'file'`;
  }

  return null;
}

