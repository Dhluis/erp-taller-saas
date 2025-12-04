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
import { getOrganizationSession, sendWhatsAppMessage } from '@/lib/waha-sessions';

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
    console.log('[WhatsApp Send] 🚀 Iniciando envío de mensaje...');
    
    // 1. Validar autenticación
    console.log('[WhatsApp Send] 🔍 Obteniendo contexto de tenant...');
    const tenantContext = await getTenantContext(request);
    if (!tenantContext) {
      console.error('[WhatsApp Send] ❌ No se pudo obtener contexto de tenant');
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    console.log(`[WhatsApp Send] ✅ Contexto obtenido:`, {
      organizationId,
      workshopId: tenantContext.workshopId,
      userId: tenantContext.userId
    });

    // 2. Parsear body
    console.log('[WhatsApp Send] 📥 Parseando body del request...');
    const body: SendMessageBody = await request.json();
    console.log('[WhatsApp Send] 📦 Body recibido:', {
      conversationId: body.conversationId,
      to: body.to,
      messageLength: body.message?.length || 0,
      type: body.type
    });

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
      console.log(`[WhatsApp Send] 🔍 Validando conversación: ${body.conversationId} para organización: ${organizationId}`);
      
      // Primero verificar si la conversación existe (sin filtrar por organizationId)
      const { data: convCheck, error: checkError } = await supabase
        .from('whatsapp_conversations')
        .select('id, organization_id, customer_phone')
        .eq('id', body.conversationId)
        .single();

      console.log(`[WhatsApp Send] 🔍 Verificación inicial de conversación:`, {
        convCheck,
        checkError,
        conversationId: body.conversationId
      });

      if (checkError || !convCheck) {
        console.error(`[WhatsApp Send] ❌ Conversación no existe:`, {
          checkError,
          conversationId: body.conversationId
        });
        return NextResponse.json({
          success: false,
          error: `Conversación no encontrada: ${body.conversationId}`
        }, { status: 404 });
      }

      // Verificar que pertenece a la organización correcta
      if (convCheck.organization_id !== organizationId) {
        console.error(`[WhatsApp Send] ❌ OrganizationId no coincide:`, {
          conversationOrgId: convCheck.organization_id,
          userOrgId: organizationId,
          conversationId: body.conversationId
        });
        return NextResponse.json({
          success: false,
          error: `La conversación pertenece a otra organización. Conversación: ${convCheck.organization_id}, Usuario: ${organizationId}`
        }, { status: 403 });
      }

      console.log(`[WhatsApp Send] ✅ Conversación validada:`, convCheck);

      // Si hay conversationId, usar el teléfono de la conversación si no se proporciona 'to'
      if (!body.to && convCheck.customer_phone) {
        body.to = convCheck.customer_phone;
        console.log(`[WhatsApp Send] 📞 Usando teléfono de la conversación: ${body.to}`);
      }
    } else {
      console.log(`[WhatsApp Send] ⚠️ No se proporcionó conversationId, enviando sin validación`);
    }

    // 7. Obtener sesión de la organización
    console.log(`[WhatsApp Send] 🔍 ===== OBTENIENDO SESIÓN =====`);
    console.log(`[WhatsApp Send] 🔍 organizationId: ${organizationId}`);
    let sessionName: string;
    try {
      sessionName = await getOrganizationSession(organizationId);
      console.log(`[WhatsApp Send] ✅ Sesión obtenida: "${sessionName}"`);
      console.log(`[WhatsApp Send] 📊 Validando sesión:`, {
        sessionName,
        type: typeof sessionName,
        length: sessionName?.length,
        isDefault: sessionName === 'default',
        isEmpty: !sessionName || sessionName.trim() === '',
        isValid: sessionName && sessionName !== 'default' && sessionName.trim() !== ''
      });
    } catch (sessionError: any) {
      console.error(`[WhatsApp Send] ❌ Error obteniendo sesión:`, {
        error: sessionError.message,
        stack: sessionError.stack,
        organizationId
      });
      return NextResponse.json({
        success: false,
        error: `Error obteniendo sesión de WhatsApp: ${sessionError.message}`
      }, { status: 500 });
    }
    
    // Validación estricta del nombre de sesión
    if (!sessionName || sessionName.trim() === '' || sessionName === 'default') {
      console.error(`[WhatsApp Send] ❌ Sesión inválida o por defecto:`, {
        sessionName,
        type: typeof sessionName,
        length: sessionName?.length,
        isEmpty: !sessionName || sessionName.trim() === '',
        isDefault: sessionName === 'default'
      });
      return NextResponse.json({
        success: false,
        error: `Sesión de WhatsApp no configurada para esta organización. Por favor, configura la sesión primero. Sesión recibida: "${sessionName}"`
      }, { status: 500 });
    }

    console.log(`[WhatsApp Send] ✅ Sesión validada correctamente: "${sessionName}"`);

    // 8. Enviar mensaje según el tipo
    let sendResult: any;
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
        
        console.log(`[WhatsApp Send] 📤 Enviando mensaje de texto a ${body.to}`);
        sendResult = await sendWhatsAppMessage(sessionName, body.to, body.message, organizationId);
        messageBody = body.message;
        messageId = sendResult?.id || sendResult?.messageId || `text_${Date.now()}`;
        break;

      case 'image':
        // Por ahora solo soportamos texto, imágenes se pueden agregar después
        return NextResponse.json({
          success: false,
          error: 'Envío de imágenes aún no implementado con el nuevo sistema multi-tenant'
        }, { status: 501 });

      case 'file':
        // Por ahora solo soportamos texto, archivos se pueden agregar después
        return NextResponse.json({
          success: false,
          error: 'Envío de archivos aún no implementado con el nuevo sistema multi-tenant'
        }, { status: 501 });

      default:
        return NextResponse.json({
          success: false,
          error: `Tipo de mensaje no soportado: ${messageType}`
        }, { status: 400 });
    }

    // 9. Verificar resultado del envío
    if (!sendResult) {
      console.error('[WhatsApp Send] ❌ Error enviando mensaje: sin resultado');
      return NextResponse.json({
        success: false,
        error: 'Error desconocido al enviar mensaje'
      }, { status: 500 });
    }

    console.log(`[WhatsApp Send] ✅ Mensaje enviado exitosamente: ${messageId}`);
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


