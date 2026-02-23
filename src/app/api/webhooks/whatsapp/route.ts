/**
 * WEBHOOK ENDPOINT - WAHA (WhatsApp HTTP API)
 * 
 * Recibe eventos de WAHA:
 * - message: Mensajes entrantes
 * - session.status: Cambios de estado de conexión
 * - message.reaction: Reacciones (solo log por ahora)
 * 
 * Flujo para mensajes:
 * 1. Filtrar mensajes propios y grupos
 * 2. Extraer organizationId del nombre de sesión
 * 3. Buscar/crear conversación
 * 4. Guardar mensaje
 * 5. Si bot activo, procesar con AI
 * 6. Enviar respuesta si hay
 * 7. Guardar mensaje saliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { processMessage } from '@/integrations/whatsapp/services/ai-agent';
import { getOrganizationFromSession, sendWhatsAppMessage, getProfilePicture, getWahaConfig } from '@/lib/waha-sessions';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { normalizePhoneNumber } from '@/lib/utils/phone-formatter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Transcribe audio a texto usando OpenAI Whisper.
 * - Acepta datos base64 (WAHA Core: audio en message.body)
 * - O URL directa (WAHA Plus: media.url)
 * Retorna el texto transcrito o null si falla.
 */
async function transcribeAudioWithWhisper(
  base64Data: string | null,
  audioUrl: string | null,
  wahaApiKey?: string,    // Clave WAHA específica de la organización (multi-tenant)
  wahaBaseUrl?: string    // URL externa de WAHA (para reemplazar localhost interno de Docker)
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!base64Data && !audioUrl) return null;

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let audioBuffer: Buffer;
    let mimeType = 'audio/ogg';

    if (base64Data && base64Data.length > 100) {
      // WAHA Core: el body contiene el audio codificado en base64
      // WAHA a veces envía Data URIs: "data:audio/ogg;base64,<datos>" — extraer solo el base64
      let cleanBase64 = base64Data;
      if (cleanBase64.includes(';base64,')) {
        const parts = cleanBase64.split(';base64,');
        // Extraer mimetype del prefijo si está disponible ("data:audio/ogg")
        if (parts[0].startsWith('data:')) {
          mimeType = parts[0].replace('data:', '') || mimeType;
        }
        cleanBase64 = parts[1];
      }
      audioBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (audioUrl) {
      // WAHA Plus: descargar desde la URL
      // CRÍTICO: WAHA dentro de Docker envía URLs con "http://localhost:80" (su IP interna).
      // El servidor Next.js no puede acceder a esa URL — hay que reemplazarla por la URL pública.
      let resolvedUrl = audioUrl;
      if (wahaBaseUrl && (
        audioUrl.startsWith('http://localhost') ||
        audioUrl.startsWith('http://127.0.0.1') ||
        audioUrl.startsWith('https://localhost')
      )) {
        try {
          const urlObj = new URL(audioUrl);
          const baseObj = new URL(wahaBaseUrl);
          urlObj.protocol = baseObj.protocol;
          urlObj.hostname = baseObj.hostname;
          urlObj.port = baseObj.port || '';
          resolvedUrl = urlObj.toString();
          console.log('[Whisper] URL localhost → URL pública:', audioUrl.substring(0, 60), '→', resolvedUrl.substring(0, 60));
        } catch {
          console.warn('[Whisper] No se pudo reemplazar URL localhost, usando original');
        }
      }

      // Usar clave WAHA específica de la org; fallback a variable de entorno
      const headers: Record<string, string> = {};
      const apiKey = wahaApiKey || process.env.WAHA_API_KEY;
      if (apiKey) headers['X-Api-Key'] = apiKey;
      console.log('[Whisper] Descargando audio desde URL:', resolvedUrl.substring(0, 80) + '...', { hasApiKey: !!apiKey });
      const res = await fetch(resolvedUrl, { headers });
      if (!res.ok) {
        console.error('[Whisper] No se pudo descargar audio:', res.status, res.statusText);
        return null;
      }
      const contentType = res.headers.get('content-type');
      if (contentType) mimeType = contentType.split(';')[0];
      audioBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }

    const audioFile = new File([audioBuffer], 'audio.ogg', { type: mimeType });
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
    });

    return result.text?.trim() || null;
  } catch (err) {
    console.error('[Whisper] Error al transcribir audio:', err);
    return null;
  }
}

/**
 * Analiza el contenido de una imagen usando OpenAI GPT-4o-mini Vision.
 * Descarga la imagen desde WAHA (con autenticación), la codifica en base64
 * y solicita una descripción concisa en español.
 * Retorna la descripción o null si falla.
 */
async function analyzeImageWithVision(
  imageUrl: string,
  wahaApiKey?: string,
  mimetype?: string
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Descargar imagen desde WAHA con autenticación
    const headers: Record<string, string> = {};
    const apiKey = wahaApiKey || process.env.WAHA_API_KEY;
    if (apiKey) headers['X-Api-Key'] = apiKey;

    console.log('[Vision] Descargando imagen desde:', imageUrl.substring(0, 80) + '...');
    const imageRes = await fetch(imageUrl, { headers });
    if (!imageRes.ok) {
      console.error('[Vision] No se pudo descargar imagen:', imageRes.status, imageRes.statusText);
      return null;
    }

    const contentType = imageRes.headers.get('content-type');
    const mimeType = mimetype || contentType?.split(';')[0] || 'image/jpeg';
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: 'Describe brevemente qué muestra esta imagen en el contexto de un taller mecánico o servicio automotriz. Responde en español en 1-2 oraciones concisas.' }
        ]
      }],
      max_tokens: 150
    });

    const description = response.choices[0]?.message?.content?.trim() || null;
    if (description) {
      console.log('[Vision] ✅ Imagen analizada:', description.substring(0, 100));
    }
    return description;
  } catch (err: any) {
    console.error('[Vision] Error analizando imagen:', err?.message || err);
    return null;
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Verificación del webhook (para algunos providers)
 */
export async function GET(request: NextRequest) {
  console.log('[WAHA Webhook] GET request - Verificación');
  return NextResponse.json({ status: 'ok' });
}

/**
 * POST /api/webhooks/whatsapp
 * Recibe eventos de WAHA
 */
export async function POST(request: NextRequest) {
  // 🛡️ Rate limiting - OPCIONAL (fail-open si Redis no disponible)
  try {
    const rateLimitResponse = await rateLimitMiddleware.webhook(request);
    if (rateLimitResponse) {
      console.warn('[WAHA Webhook] 🚫 Rate limit exceeded');
      return rateLimitResponse;
    }
  } catch (rateLimitError: any) {
    // ⚠️ Si rate limiting falla (Redis no disponible, etc.), continuar sin limitar
    const errorMsg = rateLimitError?.message || 'Unknown error';
    if (errorMsg.includes('REDIS_NOT_AVAILABLE') || errorMsg.includes('Missing')) {
      console.warn('[WAHA Webhook] ⚠️ Rate limiting no disponible, continuando sin límites (fail-open)');
    } else {
      console.warn('[WAHA Webhook] ⚠️ Error en rate limiting, continuando sin límites:', errorMsg);
    }
    // Continuar sin bloquear el request
  }

  const startTime = Date.now();
  
  try {
    const body = await request.json();
    body._startTime = startTime; // Guardar timestamp para logs finales
    
    // LOG DETALLADO PARA DEBUG
    const messageId = body.payload?.id || 
                      body.id || 
                      body.payload?._data?.id?.id ||
                      body.payload?.messageId ||
                      body.messageId ||
                      body.payload?.key?.id ||
                      body.payload?._data?.key?.id;
    const eventType = body.event || body.type || body.eventType;
    
    console.log('='.repeat(60));
    console.log('[Webhook] 🔔 NUEVO EVENTO RECIBIDO');
    console.log('[Webhook] 📋 Event Type:', eventType);
    console.log('[Webhook] 🆔 Message ID:', messageId);
    console.log('[Webhook] ⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));
    
    console.log('[WAHA Webhook] Evento recibido:', body.event || body.type || 'unknown');

    // Manejar diferentes tipos de eventos
    
    switch (eventType) {
      case 'message':
        await handleMessageEvent(body);
        break;
      
      case 'message.any': {
        // WAHA NOWEB envía algunos tipos de media (imágenes, documentos) como message.any
        // en lugar de como message. Procesamos SOLO los entrantes (fromMe: false).
        // El constraint UNIQUE (provider_message_id) en la BD previene duplicados
        // si el mismo mensaje llega por ambos eventos.
        const anyPayload = body.payload || body.message || body.data || body;
        const anyFromMe = anyPayload?.fromMe === true || anyPayload?.fromMe === 'true' || anyPayload?.fromMe === 1;
        if (!anyFromMe) {
          console.log('[Webhook] 🔄 message.any ENTRANTE (WAHA NOWEB) — procesando como message...');
          await handleMessageEvent(body);
        } else {
          console.log('[Webhook] ⏭️ message.any ignorado (fromMe=true)');
          return NextResponse.json({ success: true, skipped: true, reason: 'message.any_own_ignored' });
        }
        break;
      }
      
      case 'session.status':
      case 'status':
        await handleSessionStatusEvent(body);
        break;
      
      case 'message.reaction':
        await handleReactionEvent(body);
        break;
      
      default:
        console.log('[WAHA Webhook] Evento no manejado:', eventType, body);
    }

    // Siempre retornar 200 para evitar reintentos de WAHA
    const processingTime = Date.now() - startTime;
    console.log('[Webhook] ⏱️ Tiempo total de procesamiento:', processingTime, 'ms');
    console.log('[Webhook] ✅ Evento procesado exitosamente');
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[WAHA Webhook] ❌ Error procesando evento:', error);
    console.log('[Webhook] ⏱️ Tiempo antes del error:', processingTime, 'ms');
    // Siempre retornar 200 incluso en caso de error
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 200 });
  }
}

/**
 * Maneja eventos de mensaje
 */
async function handleMessageEvent(body: any) {
  const startTime = Date.now();
  try {
    const eventMessageId = body.payload?.id || body.id || body.payload?._data?.id?.id || body.payload?.messageId || body.messageId;
    console.log('='.repeat(60));
    console.log('[Webhook] 📨 INICIANDO handleMessageEvent');
    console.log('[Webhook] 🆔 Message ID en handleMessageEvent:', eventMessageId);
    console.log('[Webhook] ⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));
    console.log('[WAHA Webhook] 📨 Procesando mensaje...');
    console.log('[WAHA Webhook] 📦 Body completo:', JSON.stringify(body, null, 2));
    console.log('[WAHA Webhook] 🔍 Estructura del mensaje:', {
      hasPayload: !!body.payload,
      hasMessage: !!body.message,
      hasData: !!body.data,
      payloadKeys: body.payload ? Object.keys(body.payload) : [],
      messageKeys: body.message ? Object.keys(body.message) : [],
      dataKeys: body.data ? Object.keys(body.data) : []
    });

    // 1. Extraer datos del mensaje
    const message = body.payload || body.message || body.data || body;
    const sessionName = body.session || message.session;
    
    // Guardar payload completo para resolver @lid desde remoteJidAlt
    const fullPayload = body.payload || body;
    
    // 2. Extraer messageId (ya se hizo deduplicación arriba, pero lo necesitamos para logs)
    const messageId = message?.id || message?.messageId || body.id || body.payload?.id;
    
    console.log('[WAHA Webhook] 📋 Mensaje extraído:', {
      hasMessage: !!message,
      messageId: messageId,
      sessionName,
      fromMe: message?.fromMe,
      from: message?.from,
      body: message?.body?.substring(0, 50)
    });
    
    // Validar que sea mensaje entrante válido
    if (!message || !sessionName) {
      console.log('[WAHA Webhook] ⚠️ Mensaje inválido o sin sesión');
      return;
    }

    // 3. Ignorar si fromMe es true (mensaje propio)
    // Verificar en múltiples ubicaciones posibles
    const isFromMe = 
      message.fromMe === true || 
      message.fromMe === 'true' ||
      message.fromMe === 1 ||
      message.key?.fromMe === true ||
      message.key?.fromMe === 'true' ||
      message._data?.key?.fromMe === true;
    
    if (isFromMe) {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje propio (fromMe=true)');
      return;
    }
    
    console.log('[WAHA Webhook] ✅ Mensaje es entrante, procesando...');

    // 4. Ignorar estados de WhatsApp (status@broadcast) - VERIFICAR PRIMERO
    // WAHA puede enviar eventos de estados aunque no los hayas enviado directamente
    const messageFrom = message.from || body.payload?.from || '';
    const messageTo = message.to || body.payload?.to || '';
    const chatId = message.chatId || messageFrom || messageTo;
    const participant = body.payload?.participant || message.participant;
    
    // Detectar si es un estado de WhatsApp
    const isStatusMessage = 
      messageFrom === 'status@broadcast' || 
      messageTo === 'status@broadcast' || 
      chatId === 'status@broadcast' ||
      messageFrom.includes('status@broadcast') || 
      messageTo.includes('status@broadcast') ||
      body.payload?._data?.broadcast === true ||
      body.payload?.source === 'status';
    
    if (isStatusMessage) {
      console.log('[WAHA Webhook] ⏭️ Ignorando estado de WhatsApp (status@broadcast)');
      console.log('[WAHA Webhook] 📋 From:', messageFrom, 'To:', messageTo, 'Participant:', participant);
      console.log('[WAHA Webhook] 📋 Broadcast:', body.payload?._data?.broadcast, 'Source:', body.payload?.source);
      return;
    }

    // 5. Ignorar si chatId contiene @g.us (grupo)
    if (chatId && chatId.includes('@g.us')) {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje de grupo');
      return;
    }
    
    // 5.1. Validar que sea un mensaje directo válido (debe tener @c.us, @s.whatsapp.net o @lid)
    const isValidDirectMessage = 
      chatId && 
      (chatId.includes('@c.us') || 
       chatId.includes('@s.whatsapp.net') ||
       chatId.includes('@lid') ||
       /^\d+@c\.us$/.test(chatId) ||
       /^\d+@s\.whatsapp\.net$/.test(chatId) ||
       /^\d+@lid$/.test(chatId));
    
    if (!isValidDirectMessage && chatId) {
      console.log('[WAHA Webhook] ⏭️ Ignorando mensaje no válido (no es directo):', chatId);
      return;
    }

    // 6. Obtener organizationId PRIMERO (necesario para resolver @lid)
    const organizationId = await getOrganizationFromSession(sessionName);
    if (!organizationId) {
      console.error('[WAHA Webhook] ❌ No se pudo obtener organizationId de sesión:', sessionName);
      return;
    }

    // 6.1. IMPORTANTE: Resolver número real del remitente (maneja @lid correctamente)
    // Pasar payload completo para extraer remoteJidAlt si está disponible
    const fromNumber = await resolveRealPhoneNumber(chatId, sessionName, organizationId, fullPayload);
    
    if (!fromNumber) {
      // No se pudo resolver el número real → NO crear conversación ficticia
      console.warn(`[WAHA Webhook] ⚠️ Ignorando mensaje de contacto no resuelto: ${chatId}`);
      console.warn(`[WAHA Webhook] ⚠️ Esto previene crear conversaciones ficticias con IDs de WhatsApp`);
      return;
    }
    
    console.log('[WAHA Webhook] 📱 Número del remitente resuelto:', fromNumber);

    // Obtener el estado de la sesión para verificar el número propio
    try {
      const { getSessionStatus } = await import('@/lib/waha-sessions');
      const sessionStatus = await getSessionStatus(sessionName, organizationId);
      const ownPhone = sessionStatus?.me?.id?.split('@')[0] || 
                       sessionStatus?.me?.phone ||
                       sessionStatus?.phone;
      
      console.log('[WAHA Webhook] 📱 Número de la sesión:', ownPhone);
      
      // Si el remitente es el mismo número que la sesión, ignorar (es un loop)
      if (ownPhone && fromNumber && (
        fromNumber === ownPhone ||
        fromNumber.includes(ownPhone) ||
        ownPhone.includes(fromNumber)
      )) {
        console.log('[WAHA Webhook] ⏭️ Ignorando mensaje loop (mismo número que la sesión)');
        return;
      }
    } catch (statusError) {
      console.warn('[WAHA Webhook] ⚠️ No se pudo verificar número de sesión:', statusError);
      // Continuar de todas formas
    }

    console.log('[WAHA Webhook] 📍 Organization ID:', organizationId);
    console.log('[WAHA Webhook] 📱 Chat ID:', chatId);

    // 7. Obtener cliente Supabase con service role (bypass RLS)
    const supabase = getSupabaseServiceClient();

    // 8. Usar número resuelto (ya validado en resolveRealPhoneNumber)
    const customerPhone = fromNumber;

    // 8.5. ✅ Verificar límites antes de crear conversación
    const { checkResourceLimit } = await import('@/lib/billing/check-limits');
    const limitCheck = await checkResourceLimit(organizationId, 'whatsapp_conversation', { useOrganizationId: true });
    
    if (!limitCheck.canCreate) {
      console.warn('[WAHA Webhook] ⚠️ Límite de WhatsApp alcanzado o feature deshabilitada:', limitCheck.error?.message);
      // No retornar error, solo loguear y continuar (el mensaje se guarda pero no se procesa con AI)
      // Esto permite que el mensaje se reciba pero no se cree conversación nueva
      return NextResponse.json({ 
        success: false, 
        error: limitCheck.error?.message || 'WhatsApp no está habilitado en tu plan',
        limit_reached: true
      }, { status: 403 });
    }

  // 9. Buscar o crear conversación (pasando sessionName para obtener nombre real)
    const { conversationId, isNewConversation } = await getOrCreateConversation(
      supabase,
      organizationId,
      customerPhone,
      sessionName // ✅ Agregar sessionName para obtener nombre real del contacto
    );
    
    // 9.1. Si es nueva conversación, obtener foto de perfil en background (no bloquear el flujo)
    if (isNewConversation) {
      console.log('[Webhook] 📸 Nueva conversación detectada, obteniendo foto de perfil...');
      getProfilePicture(customerPhone, sessionName, organizationId)
        .then(async (profilePicUrl) => {
          if (profilePicUrl) {
            await (supabase as any)
              .from('whatsapp_conversations')
              .update({ profile_picture_url: profilePicUrl })
              .eq('id', conversationId);
            console.log('[Webhook] ✅ Foto de perfil guardada');
          } else {
            console.log('[Webhook] ⚠️ No se pudo obtener foto de perfil');
          }
        })
        .catch(err => console.log('[Webhook] ⚠️ Error obteniendo foto de perfil:', err.message));
    }

    // 10. Detectar tipo de mensaje y multimedia
    // Revisar en múltiples ubicaciones: WAHA puede poner el tipo en payload.type o en _data.type
    const messageType = message.type ||
                        message.messageType ||
                        message._data?.type ||        // WAHA Core: tipo en _data
                        body.payload?._data?.type ||  // alternativa
                        'text';

    // Buscar media también en body.payload (WAHA puede enviarlo ahí)
    const payloadMedia = body.payload?.media || body.payload?._data?.message?.videoMessage || body.payload?._data?.message?.imageMessage || body.payload?._data?.message?.audioMessage || body.payload?._data?.message?.documentMessage;
    
    // Detectar si el body parece ser base64 de un archivo media
    // (WAHA Core puede no enviar hasMedia=true en algunas versiones)
    const bodyStr = typeof message.body === 'string' ? message.body : '';
    const bodyIsLikelyBase64 = bodyStr.length > 500 &&
      !bodyStr.includes(' ') &&
      /^[A-Za-z0-9+/=]+$/.test(bodyStr.substring(0, 100));
    const bodyIsDataUri = bodyStr.startsWith('data:') && bodyStr.includes(';base64,');

    // Log detallado para diagnóstico de multimedia
    console.log('[WAHA Webhook] 🔍 DIAGNÓSTICO MULTIMEDIA:', {
      messageType,
      hasMediaField: !!message.hasMedia,
      hasMediaUrl: !!message.mediaUrl,
      hasImage: !!message.image,
      hasAudio: !!message.audio,
      hasVideo: !!message.video,
      hasDocument: !!message.document,
      hasMimetype: !!message.mimetype,
      mimetype: message.mimetype,
      hasPayloadMedia: !!payloadMedia,
      payloadMediaKeys: payloadMedia ? Object.keys(payloadMedia) : [],
      bodyLength: bodyStr.length,
      bodyIsLikelyBase64,
      bodyIsDataUri,
      messageKeys: Object.keys(message),
      messageStructure: JSON.stringify(message, null, 2).substring(0, 1000)
    });

    const hasMedia = !!message.hasMedia ||
                     !!message._data?.hasMedia ||      // WAHA Core: flag en _data
                     !!message.mediaUrl ||
                     !!message.image ||
                     !!message.audio ||
                     !!message.document ||
                     !!message.video ||
                     !!payloadMedia ||
                     messageType === 'ptt' ||           // voice message explícito
                     messageType === 'audio' ||
                     messageType === 'image' ||
                     messageType === 'video' ||
                     messageType === 'document' ||
                     messageType === 'sticker' ||
                     (messageType !== 'text' && messageType !== 'chat') ||
                     bodyIsLikelyBase64 ||             // body parece base64 de media
                     bodyIsDataUri;                     // body es data URI (WAHA Core)

    // Extraer URL del media si existe
    let mediaUrl = null;
    let mediaType = null;

    if (hasMedia) {
      // WAHA Plus puede enviar el media en diferentes formatos
      // Buscar en múltiples ubicaciones del payload
      mediaUrl = message.mediaUrl || 
                 message.media?.url ||
                 message.image?.url ||
                 message.audio?.url ||
                 message.document?.url ||
                 message.video?.url ||
                 message._data?.mediaUrl ||
                 message.body?.mediaUrl ||
                 body.payload?.media?.url || // ✅ Buscar también en body.payload.media
                 body.payload?.mediaUrl ||   // ✅ Y en body.payload.mediaUrl
                 body.payload?._data?.message?.videoMessage?.url || // ✅ Video en _data.message
                 body.payload?._data?.message?.imageMessage?.url || // ✅ Imagen en _data.message
                 body.payload?._data?.message?.audioMessage?.url || // ✅ Audio en _data.message
                 body.payload?._data?.message?.documentMessage?.url; // ✅ Documento en _data.message

      // Reescribir URLs localhost (internas de Docker) por la URL pública de WAHA.
      // WAHA dentro de Docker envía: "http://localhost:80/api/files/..." (inaccessible desde Next.js)
      // Necesitamos: "https://waha-erp-eagles.easypanel.host/api/files/..."
      if (mediaUrl && (
        mediaUrl.startsWith('http://localhost') ||
        mediaUrl.startsWith('http://127.0.0.1') ||
        mediaUrl.startsWith('https://localhost')
      )) {
        try {
          const wahaConf = await getWahaConfig(organizationId);
          const urlObj = new URL(mediaUrl);
          const baseObj = new URL(wahaConf.url);
          urlObj.protocol = baseObj.protocol;
          urlObj.hostname = baseObj.hostname;
          urlObj.port = baseObj.port || '';
          const rewrittenUrl = urlObj.toString();
          console.log('[WAHA Webhook] 🔗 Media URL reescrita (localhost → pública):', rewrittenUrl.substring(0, 80));
          mediaUrl = rewrittenUrl;
        } catch (rewriteErr: any) {
          console.warn('[WAHA Webhook] ⚠️ No se pudo reescribir URL media:', rewriteErr.message);
        }
      }

      // Detectar tipo de media (verificar también en payload.media.mimetype y _data.message)
      // Si el body es un data URI, extraer el mimetype del prefijo
      const dataUriMime = bodyIsDataUri ? (bodyStr.match(/^data:([^;]+);/) || [])[1] : undefined;
      const mimetype = dataUriMime ||
                       message.mimetype ||
                       message.media?.mimetype ||
                       body.payload?.media?.mimetype ||
                       body.payload?._data?.message?.videoMessage?.mimetype ||
                       body.payload?._data?.message?.imageMessage?.mimetype ||
                       body.payload?._data?.message?.audioMessage?.mimetype ||
                       body.payload?._data?.message?.documentMessage?.mimetype;

      // Detectar tipo también por la presencia de objetos específicos
      // Revisar tanto message.type como message._data?.type para cubrir todas las versiones de WAHA
      const rawType = message.type || message._data?.type || '';
      if (rawType === 'image' || message.image || body.payload?._data?.message?.imageMessage || mimetype?.startsWith('image/')) {
        mediaType = 'image';
      } else if (rawType === 'audio' || rawType === 'ptt' || message.audio || body.payload?._data?.message?.audioMessage || mimetype?.startsWith('audio/')) {
        mediaType = 'audio';
      } else if (rawType === 'video' || message.video || body.payload?._data?.message?.videoMessage || mimetype?.startsWith('video/')) {
        mediaType = 'video';
      } else if (rawType === 'document' || message.document || body.payload?._data?.message?.documentMessage || mimetype?.startsWith('application/')) {
        mediaType = 'document';
      } else if (rawType === 'sticker') {
        mediaType = 'image'; // los stickers se tratan como imágenes
      } else if (bodyIsLikelyBase64 || bodyIsDataUri) {
        // Fallback: body parece ser media pero sin tipo explícito
        // Intentar detectar por mimetype o asumir audio (lo más común)
        mediaType = mimetype?.startsWith('image/') ? 'image' :
                    mimetype?.startsWith('video/') ? 'video' :
                    'audio'; // Default: asumir audio para base64 sin tipo
      }
      
      console.log('[WAHA Webhook] 📎 Media detectado:', {
        mediaType,
        mediaUrl: mediaUrl ? mediaUrl.substring(0, 100) + '...' : null,
        mimetype: mimetype,
        originalType: message.type,
        hasMediaUrl: !!mediaUrl,
        mediaLocation: message.media ? 'message.media' : 
                      body.payload?.media ? 'payload.media' : 
                      body.payload?._data?.message?.videoMessage ? '_data.message.videoMessage' :
                      body.payload?._data?.message?.imageMessage ? '_data.message.imageMessage' :
                      'unknown'
      });
    } else {
      console.log('[WAHA Webhook] ⚠️ NO se detectó multimedia en el mensaje');
    }

    // Construir texto del mensaje según el tipo de contenido.
    // CRÍTICO: message.body puede contener datos base64 en WAHA Core (audio, imagen, etc.).
    // La decisión de usar o no message.body se basa en hasMedia (no en messageType,
    // porque messageType puede quedar en 'text' si el campo type no está en el payload top-level).
    let messageText = '';

    if (!hasMedia) {
      // Mensaje de texto puro: extraer normalmente
      messageText = message.text || message.body || message.content || message.caption || '';
    } else {
      // Mensaje con media: NUNCA usar message.body (puede ser base64 del archivo).
      // Solo usar caption o text explícitos.
      messageText = message.caption || message.text || '';
    }

    // Indicador descriptivo por tipo de media cuando no hay texto/caption
    if (!messageText) {
      if (mediaType === 'audio') {
        messageText = '[Audio recibido]';
      } else if (mediaType === 'image') {
        messageText = '[Imagen recibida]';
      } else if (mediaType === 'video') {
        messageText = '[Video recibido]';
      } else if (mediaType === 'document') {
        const filename = message.filename || message.document?.filename || '';
        messageText = filename ? `[Documento recibido: ${filename}]` : '[Documento recibido]';
      } else if (hasMedia) {
        messageText = '[Archivo recibido]';
      }
    }

    // Fallback final: si el mensaje sigue vacío, evitar llamar al AI con string vacío
    if (!messageText) {
      messageText = '[Mensaje recibido]';
    }

    // Transcripción de audio con Whisper (si OPENAI_API_KEY está configurada)
    if (mediaType === 'audio') {
      console.log('[WAHA Webhook] 🎤 Intentando transcripción con Whisper...');
      const base64Body = (message.body && typeof message.body === 'string' && message.body.length > 100)
        ? message.body
        : null;

      // Obtener configuración WAHA para descargar el audio:
      // - wahaApiKey: para autenticar la descarga (clave org-específica)
      // - wahaBaseUrl: para reemplazar URLs "http://localhost:80" que WAHA envía internamente
      //   (WAHA dentro de Docker genera URLs con su IP interna, que Next.js no puede acceder)
      let wahaApiKeyForAudio: string | undefined;
      let wahaBaseUrlForAudio: string | undefined;
      if (mediaUrl) {
        try {
          const wahaConf = await getWahaConfig(organizationId);
          wahaApiKeyForAudio = wahaConf.key;
          wahaBaseUrlForAudio = wahaConf.url;
        } catch {
          // Fallback: transcribeAudioWithWhisper usará process.env.WAHA_API_KEY
        }
      }

      const transcription = await transcribeAudioWithWhisper(base64Body, mediaUrl, wahaApiKeyForAudio, wahaBaseUrlForAudio);
      if (transcription) {
        console.log('[WAHA Webhook] ✅ Audio transcrito:', transcription.substring(0, 100));
        messageText = transcription;
      } else {
        console.log('[WAHA Webhook] ⚠️ Transcripción no disponible, usando placeholder');
        if (messageText === '[Audio recibido]') {
          messageText = '[Audio recibido - escribe tu consulta para que pueda ayudarte]';
        }
      }
    }

    // Análisis de imagen con GPT-4o-mini Vision (si OPENAI_API_KEY está configurada)
    if (mediaType === 'image' && mediaUrl) {
      console.log('[WAHA Webhook] 🖼️ Intentando análisis de imagen con Vision...');
      try {
        const wahaConf = await getWahaConfig(organizationId);
        const imageDescription = await analyzeImageWithVision(mediaUrl, wahaConf.key, undefined);
        if (imageDescription) {
          // Combinar descripción con caption si lo hubiera
          const captionPrefix = message.caption ? `${message.caption} — ` : '';
          messageText = `${captionPrefix}[Imagen: ${imageDescription}]`;
          console.log('[WAHA Webhook] ✅ Imagen descrita:', messageText.substring(0, 120));
        } else {
          console.log('[WAHA Webhook] ⚠️ No se pudo analizar imagen, usando placeholder');
        }
      } catch (visionErr: any) {
        console.warn('[WAHA Webhook] ⚠️ Error en Vision, usando placeholder:', visionErr.message);
      }
    }

    // Reutilizar messageId ya extraído arriba
    const timestamp = message.timestamp 
      ? new Date(message.timestamp * 1000 || message.timestamp)
      : new Date();

    // 11. GUARDAR MENSAJE EN BD ANTES DE PROCESAR CON AI
    // Si es duplicado, el constraint UNIQUE (provider_message_id) lanzará error 23505
    const finalMessageId = messageId || `waha_${Date.now()}`;
    
    try {
      const { data: savedMessage, error: saveError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          organization_id: organizationId,
          direction: 'inbound',
          from_number: customerPhone,
          to_number: '', // Se completará con el número del negocio
          body: messageText,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          status: 'delivered',
          provider: 'waha',
          provider_message_id: finalMessageId,
          created_at: timestamp.toISOString()
        } as any)
        .select()
        .single();

      if (saveError) {
        // Código 23505 = unique_violation en PostgreSQL
        if (saveError.code === '23505') {
          console.log('='.repeat(60));
          console.log('[Webhook] ⏭️ DUPLICADO BLOQUEADO POR CONSTRAINT BD');
          console.log('[Webhook] 🆔 Message ID:', finalMessageId);
          console.log('[Webhook] ℹ️ Este mensaje ya existe en la BD');
          console.log('='.repeat(60));
          return NextResponse.json({ 
            success: true, 
            skipped: true, 
            reason: 'duplicate_blocked_by_db_constraint',
            messageId: finalMessageId
          });
        }
        
        // Si es otro error, loguearlo y lanzar
        console.error('[Webhook] ❌ Error guardando mensaje:', saveError);
        throw saveError;
      }

      if (savedMessage) {
        console.log('[Webhook] ✅ Mensaje guardado en BD:', (savedMessage as any).id);
      }
      
      // Actualizar conversación - obtener count actual y sumar 1
      try {
        await (supabase as any).rpc('increment_conversation_message_count', {
          conversation_id: conversationId
        });
        
        // Actualizar last_message en la conversación (después de RPC)
        await (supabase as any)
          .from('whatsapp_conversations')
          .update({
            last_message: messageText.substring(0, 150),
            last_message_at: timestamp.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
        
        console.log('[Webhook] ✅ Conversación actualizada con mensaje entrante');
      } catch (rpcError) {
        // Si la función RPC no existe, hacer update manual
        const { data: conv } = await supabase
          .from('whatsapp_conversations')
          .select('messages_count')
          .eq('id', conversationId)
          .single();

        await (supabase as any)
          .from('whatsapp_conversations')
          .update({
            last_message: messageText.substring(0, 150),
            last_message_at: timestamp.toISOString(),
            messages_count: ((conv as any)?.messages_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
        
        console.log('[Webhook] ✅ Conversación actualizada con mensaje entrante');
      }
      
    } catch (err: any) {
      if (err?.code === '23505') {
        console.log('='.repeat(60));
        console.log('[Webhook] ⏭️ Duplicado detectado en catch:', finalMessageId);
        console.log('[Webhook] ℹ️ Este mensaje ya existe en la BD');
        console.log('='.repeat(60));
        return NextResponse.json({ 
          success: true, 
          skipped: true, 
          reason: 'duplicate_blocked_by_db_constraint',
          messageId: finalMessageId
        });
      }
      throw err;
    }

    // 12. Verificar si el bot está activo en la conversación
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('is_bot_active')
      .eq('id', conversationId)
      .single();

    if (!conversation || !(conversation as any).is_bot_active) {
      console.log('[WAHA Webhook] ⏸️ Bot inactivo para esta conversación');
      return;
    }

    // 13. Cargar configuración AI para logging (debugging)
    console.log('[WAHA Webhook] 🔍 Verificando configuración AI...');
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('ai_agent_config')
      .select('id, enabled, provider, model, system_prompt, personality, language')
      .eq('organization_id', organizationId)
      .single();

    if (aiConfigError || !aiConfig) {
      console.error('[WAHA Webhook] ❌ No se encontró configuración AI:', {
        error: aiConfigError?.message,
        code: aiConfigError?.code,
        organizationId
      });
      return;
    }

    const config = aiConfig as any;
    console.log('[WAHA Webhook] 📋 Configuración AI cargada:', {
      id: config.id,
      enabled: config.enabled,
      provider: config.provider,
      model: config.model,
      personality: config.personality,
      language: config.language,
      systemPromptLength: config.system_prompt?.length || 0,
      systemPromptPreview: config.system_prompt?.substring(0, 100) + '...'
    });

    if (!config.enabled) {
      console.log('[WAHA Webhook] ⏸️ AI Agent deshabilitado en configuración');
      return;
    }

    // 14. Procesar mensaje con AI Agent
    console.log('[WAHA Webhook] 🤖 Procesando con AI Agent...');
    console.log('[Webhook] 🤖 ANTES de llamar a AI - messageId:', finalMessageId);
    const aiResult = await processMessage({
      organizationId,
      conversationId,
      customerMessage: messageText,
      customerPhone: customerPhone,
      useServiceClient: true // Usar service client para bypass RLS
    });
    console.log('[Webhook] 🤖 DESPUÉS de AI - messageId:', finalMessageId, '- Respuesta:', aiResult.success ? 'SÍ' : 'NO');

    // 15. Si AI responde, enviar respuesta
    if (aiResult.success && aiResult.response) {
      console.log('[WAHA Webhook] ✅ AI generó respuesta, enviando...');
      
      try {
        console.log('[Webhook] 📤 ENVIANDO respuesta - messageId:', finalMessageId);
        // ✅ Usar chatId completo (incluye @lid, @c.us, etc.) en lugar de solo el número
        const sendResult = await sendWhatsAppMessage(
          sessionName,
          chatId,  // Usar chatId completo con @lid incluido
          aiResult.response,
          organizationId
        );

        if (sendResult) {
        // 16. Guardar mensaje saliente
        await saveOutgoingMessage(
          supabase,
          conversationId,
          organizationId,
          {
              messageId: sendResult.id || sendResult.messageId || `out_${Date.now()}`,
            to: customerPhone,
            body: aiResult.response,
            timestamp: new Date()
          }
        );
        console.log('[WAHA Webhook] ✅ Respuesta enviada y guardada');
        console.log('='.repeat(60));
        console.log(`[Webhook] ✅✅✅ MENSAJE PROCESADO COMPLETAMENTE`);
        console.log(`[Webhook] 🆔 Message ID: ${finalMessageId}`);
        console.log(`[Webhook] 📤 Respuesta enviada: SÍ`);
        console.log(`[Webhook] ⏱️ Tiempo total: ${Date.now() - startTime}ms`);
        console.log('='.repeat(60));
        }
      } catch (sendError: any) {
        console.error('[WAHA Webhook] ❌ Error enviando respuesta:', sendError.message);
        console.log('='.repeat(60));
        console.log(`[Webhook] ❌ ERROR AL ENVIAR RESPUESTA`);
        console.log(`[Webhook] 🆔 Message ID: ${finalMessageId}`);
        console.log(`[Webhook] ⚠️ Error: ${sendError.message}`);
        console.log(`[Webhook] ⏱️ Tiempo total: ${Date.now() - startTime}ms`);
        console.log('='.repeat(60));
      }
    } else {
      console.log('[WAHA Webhook] ⚠️ AI no generó respuesta:', aiResult.error);
      console.log('='.repeat(60));
      console.log(`[Webhook] ✅✅✅ MENSAJE PROCESADO COMPLETAMENTE`);
      console.log(`[Webhook] 🆔 Message ID: ${finalMessageId}`);
      console.log(`[Webhook] 📤 Respuesta enviada: NO`);
      console.log(`[Webhook] ⚠️ Razón: ${aiResult.error || 'AI no generó respuesta'}`);
      console.log(`[Webhook] ⏱️ Tiempo total: ${Date.now() - startTime}ms`);
      console.log('='.repeat(60));
    }

  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error en handleMessageEvent:', error);
    throw error;
  }
}

/**
 * Maneja eventos de cambio de estado de sesión
 */
async function handleSessionStatusEvent(body: any) {
  try {
    console.log('[WAHA Webhook] 🔄 Procesando cambio de estado de sesión...');

    const sessionName = body.session || body.payload?.session;
    const status = body.status || body.payload?.status || body.data?.status;

    if (!sessionName || !status) {
      console.log('[WAHA Webhook] ⚠️ Evento de estado incompleto');
      return;
    }

    // Obtener organizationId desde la sesión (multi-tenant)
    const organizationId = await getOrganizationFromSession(sessionName);
    if (!organizationId) {
      console.error('[WAHA Webhook] ❌ No se pudo obtener organizationId de sesión:', sessionName);
      return;
    }

    console.log('[WAHA Webhook] 📍 Organization ID:', organizationId);
    console.log('[WAHA Webhook] 📊 Nuevo estado:', status);

    // Actualizar campo whatsapp_connected en ai_agent_config
    const supabase = getSupabaseServiceClient();
    const isConnected = status === 'WORKING' || status === 'connected';

    const { error } = await (supabase as any)
      .from('ai_agent_config')
      .update({ 
        whatsapp_connected: isConnected,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[WAHA Webhook] ❌ Error actualizando whatsapp_connected:', error);
    } else {
      console.log('[WAHA Webhook] ✅ whatsapp_connected actualizado:', isConnected);
    }

  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error en handleSessionStatusEvent:', error);
    throw error;
  }
}

/**
 * Maneja eventos de reacción (solo log por ahora)
 */
async function handleReactionEvent(body: any) {
  try {
    console.log('[WAHA Webhook] 😊 Reacción recibida:', {
      session: body.session,
      messageId: body.messageId || body.id,
      reaction: body.reaction || body.emoji
    });
    // Por ahora solo logueamos, no procesamos reacciones
  } catch (error) {
    console.error('[WAHA Webhook] ❌ Error en handleReactionEvent:', error);
    // No lanzar error, solo loguear
  }
}

// Función extractOrganizationId eliminada - ahora se usa getOrganizationFromSession de waha-sessions.ts

/**
 * Extrae número de teléfono del chatId (DEPRECATED - usar resolveRealPhoneNumber)
 * Formato: 5214491234567@c.us, @s.whatsapp.net o @lid -> 5214491234567
 * ⚠️ Esta función NO resuelve @lid correctamente, solo normaliza números directos
 */
function extractPhoneNumber(chatId: string): string | null {
  if (!chatId) return null;
  
  // Remover @c.us, @s.whatsapp.net o @lid
  const phoneDigits = chatId.replace(/@[^@]+$/, '');
  
  if (!phoneDigits || phoneDigits.length < 10) {
    return null;
  }
  
  // ✅ NORMALIZAR número antes de retornar para evitar duplicados
  // Esto asegura que números mexicanos siempre tengan formato: 52 + 1 + 10 dígitos = 13 dígitos
  const normalized = normalizePhoneNumber(phoneDigits);
  
  if (!normalized || normalized.length < 10) {
    return null;
  }
  
  return normalized;
}

/**
 * Valida si un string parece ser un número de teléfono real.
 * Los números reales de LATAM empiezan con el código de país.
 */
function isValidPhoneNumber(number: string): boolean {
  if (!number) return false;

  // Códigos de país LATAM conocidos
  const validPrefixes = [
    '52',   // México
    '57',   // Colombia
    '54',   // Argentina
    '56',   // Chile
    '51',   // Perú
    '55',   // Brasil
    '593',  // Ecuador
    '598',  // Uruguay
    '506',  // Costa Rica
    '507',  // Panamá
    '1',    // USA/Canadá
  ];

  return validPrefixes.some(prefix => number.startsWith(prefix)) && number.length >= 10 && number.length <= 15;
}

/**
 * Resuelve el número real de un contacto en WAHA.
 * 
 * Estrategia:
 * 1. Si es @c.us → usar directamente (ya es número real)
 * 2. Si es @s.whatsapp.net → usar directamente (ya es número real)
 * 3. Si es @lid → buscar primero en payload._data.key.remoteJidAlt (más rápido)
 * 4. Si no existe remoteJidAlt → llamar API de WAHA (fallback)
 * 5. Si nada funciona → retornar null
 * 
 * @param chatId - ID del chat (ej: 93832184119502@lid o 5214491698635@c.us)
 * @param sessionName - Nombre de la sesión WAHA
 * @param organizationId - ID de la organización (para obtener configuración WAHA)
 * @param payload - Payload completo del mensaje (para extraer _data.key.remoteJidAlt)
 * @returns string | null - El número real normalizado, o null si no se resuelve
 */
async function resolveRealPhoneNumber(
  chatId: string,
  sessionName: string,
  organizationId: string,
  payload?: any
): Promise<string | null> {
  if (!chatId) {
    console.warn('[WAHA Webhook] ⚠️ resolveRealPhoneNumber: chatId vacío');
    return null;
  }

  // 1. Si es @c.us, el chatId ya contiene el número real
  if (chatId.includes('@c.us')) {
    const rawNumber = chatId.replace('@c.us', '');
    const normalized = normalizePhoneNumber(rawNumber);
    
    if (normalized && isValidPhoneNumber(normalized)) {
      console.log(`[WAHA Webhook] ✅ Número real directo (@c.us): ${normalized}`);
      return normalized;
    } else {
      console.warn(`[WAHA Webhook] ⚠️ Número @c.us no válido después de normalizar: ${rawNumber} → ${normalized}`);
      return null;
    }
  }

  // 2. Si es @s.whatsapp.net, también es número real
  if (chatId.includes('@s.whatsapp.net')) {
    const rawNumber = chatId.replace('@s.whatsapp.net', '');
    const normalized = normalizePhoneNumber(rawNumber);
    
    if (normalized && isValidPhoneNumber(normalized)) {
      console.log(`[WAHA Webhook] ✅ Número real directo (@s.whatsapp.net): ${normalized}`);
      return normalized;
    } else {
      console.warn(`[WAHA Webhook] ⚠️ Número @s.whatsapp.net no válido después de normalizar: ${rawNumber} → ${normalized}`);
      return null;
    }
  }

  // 3. Si es @lid, buscar primero en remoteJidAlt (más rápido y confiable)
  if (chatId.includes('@lid')) {
    // 3A. Intentar extraer de payload._data.key.remoteJidAlt (WAHA ya envía el número real aquí)
    const remoteJidAlt = payload?._data?.key?.remoteJidAlt;
    
    if (remoteJidAlt) {
      // remoteJidAlt viene como "5214491698635@s.whatsapp.net" o "5214491698635@c.us"
      const rawNumber = remoteJidAlt
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '');
      
      const normalized = normalizePhoneNumber(rawNumber);
      
      if (normalized && isValidPhoneNumber(normalized)) {
        console.log(`[WAHA Webhook] ✅ Número real desde remoteJidAlt: ${chatId} → ${normalized}`);
        return normalized;
      } else {
        console.warn(`[WAHA Webhook] ⚠️ remoteJidAlt inválido después de normalizar: ${remoteJidAlt} → ${normalized}`);
      }
    } else {
      console.log(`[WAHA Webhook] 🔍 remoteJidAlt no disponible en payload para ${chatId}, intentando API...`);
    }
    
    // 3B. Si no existe remoteJidAlt, intentar con la API de WAHA (fallback)
    try {
      console.log(`[WAHA Webhook] 🔍 Resolviendo contacto @lid via WAHA API: ${chatId}...`);
      
      // Obtener configuración de WAHA
      const { url: wahaUrl, key: wahaApiKey } = await getWahaConfig(organizationId);
      
      if (!wahaUrl || !wahaApiKey) {
        console.warn(`[WAHA Webhook] ⚠️ Config WAHA no disponible para resolver ${chatId}`);
        return null;
      }
      
      // Intentar diferentes endpoints de WAHA según la versión
      const endpoints = [
        `${wahaUrl}/api/${sessionName}/contacts/${encodeURIComponent(chatId)}`,
        `${wahaUrl}/api/sessions/${sessionName}/contacts/${encodeURIComponent(chatId)}`,
        `${wahaUrl}/api/v1/sessions/${sessionName}/contacts/${encodeURIComponent(chatId)}`,
      ];

      let contactData: any = null;
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`[WAHA Webhook] 📞 Llamando a WAHA: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': wahaApiKey,
            },
            // Timeout de 5 segundos para evitar bloqueos
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            contactData = await response.json();
            console.log(`[WAHA Webhook] ✅ Contacto resuelto desde: ${endpoint}`);
            break;
          } else if (response.status !== 404) {
            // Si es 404, intentar siguiente endpoint
            // Si es otro error, loguear pero continuar
            console.warn(`[WAHA Webhook] ⚠️ Error ${response.status} en ${endpoint}, intentando siguiente...`);
          }
        } catch (endpointError: any) {
          lastError = endpointError;
          console.warn(`[WAHA Webhook] ⚠️ Error en endpoint ${endpoint}:`, endpointError.message);
          // Continuar con siguiente endpoint
        }
      }

      if (!contactData) {
        console.warn(`[WAHA Webhook] ⚠️ WAHA no resolvió contacto ${chatId} desde ningún endpoint`, lastError?.message);
        return null;
      }

      // WAHA retorna el número real en diferentes campos según la versión
      const realNumber =
        contactData.phoneNumber ||
        contactData.phone ||
        contactData.id?.replace('@c.us', '')?.replace('@s.whatsapp.net', '') ||
        contactData.number ||
        contactData.contact?.phoneNumber ||
        contactData.contact?.phone;

      if (!realNumber) {
        console.warn(`[WAHA Webhook] ⚠️ WAHA no retornó número para ${chatId}:`, JSON.stringify(contactData).substring(0, 200));
        return null;
      }

      const normalized = normalizePhoneNumber(realNumber);
      
      if (!normalized || !isValidPhoneNumber(normalized)) {
        console.warn(`[WAHA Webhook] ⚠️ Número resuelto de @lid no es válido: ${realNumber} → ${normalized}`);
        return null;
      }

      console.log(`[WAHA Webhook] ✅ Resuelto via API: ${chatId} → ${normalized}`);
      return normalized;
    } catch (error: any) {
      console.error(`[WAHA Webhook] ❌ Error resolviendo contacto ${chatId} via API:`, error.message);
      return null;
    }
  }

  // 4. Si no tiene sufijo conocido, intentar normalizar directamente
  const normalized = normalizePhoneNumber(chatId);

  // Validar que parece un número real (debe empezar con código de país)
  if (normalized && isValidPhoneNumber(normalized)) {
    console.log(`[WAHA Webhook] ✅ Número normalizado sin sufijo: ${normalized}`);
    return normalized;
  }

  console.warn(`[WAHA Webhook] ⚠️ chatId no reconocido o no válido: ${chatId} (normalizado: ${normalized})`);
  return null;
}

/**
 * Busca o crea una conversación
 */
async function getOrCreateConversation(
  supabase: any,
  organizationId: string,
  customerPhone: string,
  sessionName: string
): Promise<{ conversationId: string; isNewConversation: boolean }> {
  // ✅ Obtener nombre real del contacto desde WAHA ANTES de buscar/crear cliente
  let contactName: string | null = null;
  try {
    const { getContactName } = await import('@/lib/waha-sessions');
    contactName = await getContactName(customerPhone, sessionName, organizationId);
    console.log('[WAHA Webhook] 📛 Nombre del contacto obtenido:', contactName || 'No disponible');
  } catch (contactError: any) {
    console.warn('[WAHA Webhook] ⚠️ Error obteniendo nombre del contacto:', contactError.message);
    // Continuar de todas formas, usar fallback "Cliente WhatsApp"
  }

  // Buscar conversación existente
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id, is_bot_active, customer_name')
    .eq('organization_id', organizationId)
    .eq('customer_phone', customerPhone)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log('[WAHA Webhook] ✅ Conversación existente encontrada:', existing.id);
    
    // ✅ Si el nombre en la conversación es genérico y tenemos nombre real, actualizar
    if (existing.customer_name === 'Cliente WhatsApp' && contactName) {
      const { error: updateConvError } = await supabase
        .from('whatsapp_conversations')
        .update({ customer_name: contactName })
        .eq('id', existing.id);
      
      if (!updateConvError) {
        console.log('[WAHA Webhook] ✅ Nombre en conversación actualizado:', contactName);
      } else {
        console.warn('[WAHA Webhook] ⚠️ Error actualizando nombre en conversación:', updateConvError);
      }
    }
    
    return { conversationId: existing.id, isNewConversation: false };
  }

  // Buscar cliente existente por teléfono
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('phone', customerPhone)
    .maybeSingle();

  let customerId: string;
  let customerName: string;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    
    // ✅ Si el nombre actual es genérico, actualizar con nombre real
    if (existingCustomer.name === 'Cliente WhatsApp' && contactName) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ name: contactName })
        .eq('id', existingCustomer.id);
      
      if (!updateError) {
        console.log('[WAHA Webhook] ✅ Nombre actualizado de genérico a real:', contactName);
        customerName = contactName;
      } else {
        console.warn('[WAHA Webhook] ⚠️ Error actualizando nombre del cliente:', updateError);
        customerName = existingCustomer.name || contactName || 'Cliente WhatsApp';
      }
    } else {
      customerName = existingCustomer.name || contactName || 'Cliente WhatsApp';
    }
  } else {
    // ✅ Crear nuevo cliente con nombre real si está disponible
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        organization_id: organizationId,
        name: contactName || 'Cliente WhatsApp', // ✅ Usar nombre real obtenido
        phone: customerPhone
      })
      .select('id')
      .single();

    if (customerError || !newCustomer) {
      console.error('[WAHA Webhook] ❌ Error creando cliente:', customerError);
      throw new Error('No se pudo crear cliente');
    }

    customerId = newCustomer.id;
    customerName = contactName || 'Cliente WhatsApp';
  }

  // Crear nueva conversación
  const { data: newConv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      customer_phone: customerPhone,
      customer_name: customerName,
      status: 'active',
      is_bot_active: true, // Activar bot por defecto
      messages_count: 0,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error || !newConv) {
    console.error('[WAHA Webhook] ❌ Error creando conversación:', error);
    throw new Error('No se pudo crear conversación');
  }

  console.log('[WAHA Webhook] ✅ Nueva conversación creada:', newConv.id);
  return { conversationId: newConv.id, isNewConversation: true };
}

/**
 * Guarda mensaje entrante en la base de datos
 */
async function saveIncomingMessage(
  supabase: any,
  conversationId: string,
  organizationId: string,
  message: {
    messageId: string;
    from: string;
    body: string;
    timestamp: Date;
    mediaUrl?: string | null;
    mediaType?: string | null;
  }
): Promise<void> {
  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      direction: 'inbound',
      from_number: message.from,
      to_number: '', // Se completará con el número del negocio
      body: message.body,
      media_url: message.mediaUrl,
      media_type: message.mediaType, // 'image', 'audio', 'video', 'document' o null
      status: 'delivered',
      provider: 'waha',
      provider_message_id: message.messageId,
      created_at: message.timestamp.toISOString()
    });

  // Actualizar conversación - obtener count actual y sumar 1
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('messages_count')
    .eq('id', conversationId)
    .single();

  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message: message.body.substring(0, 150),
      last_message_at: message.timestamp.toISOString(),
      messages_count: (conv?.messages_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  console.log('[Webhook] ✅ Conversación actualizada con mensaje entrante');
}

/**
 * Guarda mensaje saliente en la base de datos
 */
async function saveOutgoingMessage(
  supabase: any,
  conversationId: string,
  organizationId: string,
  message: {
    messageId: string;
    to: string;
    body: string;
    timestamp: Date;
  }
): Promise<void> {
  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      direction: 'outbound',
      from_number: '', // Se completará con el número del negocio
      to_number: message.to,
      body: message.body,
      status: 'sent',
      provider: 'waha',
      provider_message_id: message.messageId,
      created_at: message.timestamp.toISOString()
    });

  // Actualizar conversación - obtener count actual y sumar 1
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('messages_count')
    .eq('id', conversationId)
    .single();

  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message: message.body.substring(0, 150),
      last_message_at: message.timestamp.toISOString(),
      messages_count: (conv?.messages_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  console.log('[Webhook] ✅ Conversación actualizada con mensaje saliente');
}

