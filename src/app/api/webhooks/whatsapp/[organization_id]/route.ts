/**
 * WEBHOOK ENDPOINT - WhatsApp Integration
 * 
 * Este es el endpoint principal que recibe mensajes de WhatsApp
 * desde Twilio, Meta o Evolution API.
 * 
 * Flujo:
 * 1. Recibe mensaje (POST)
 * 2. Auto-detecta provider
 * 3. Parsea mensaje
 * 4. Procesa con IA
 * 5. Envía respuesta
 * 
 * También maneja verificación de webhooks de Meta (GET)
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/integrations/whatsapp/services/webhook-handler';
import { getSupabaseServerClient } from '@/integrations/whatsapp/utils/supabase-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ==========================================
// DETECTAR PROVIDER
// ==========================================

function detectProvider(body: any, headers: Headers): string {
  // 1. Meta WhatsApp Business API
  if (body.object === 'whatsapp_business_account' && body.entry) {
    return 'meta';
  }

  // 2. Twilio
  if (body.From && body.From.startsWith('whatsapp:')) {
    return 'twilio';
  }

  // 3. Evolution API
  if (body.key?.remoteJid && body.key?.fromMe !== undefined) {
    return 'evolution';
  }

  // 4. Header personalizado (fallback)
  const providerHeader = headers.get('x-whatsapp-provider');
  if (providerHeader) {
    return providerHeader.toLowerCase();
  }

  throw new Error('Provider desconocido');
}

// ==========================================
// VERIFICAR WEBHOOK (Seguridad)
// ==========================================

async function verifyWebhook(
  provider: string,
  body: any,
  headers: Headers,
  organizationId: string
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();

  // Obtener configuración de WhatsApp
  const { data: config, error } = await supabase
    .from('whatsapp_config')
    .select('settings')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .single();

  if (error || !config) {
    console.error('❌ Config no encontrada:', error);
    return false;
  }

  try {
    switch (provider) {
      case 'twilio':
        return verifyTwilioSignature(body, headers, config.settings);
      
      case 'meta':
        return verifyMetaSignature(body, headers, config.settings);
      
      case 'evolution':
        return verifyEvolutionApiKey(headers, config.settings);
      
      default:
        console.warn('⚠️ Verificación no implementada para:', provider);
        return true; // Permitir por ahora en desarrollo
    }
  } catch (error) {
    console.error('❌ Error verificando webhook:', error);
    return false;
  }
}

function verifyTwilioSignature(
  body: any,
  headers: Headers,
  settings: any
): boolean {
  // TODO: Implementar verificación de firma Twilio
  // Por ahora permitimos en desarrollo
  const twilioSignature = headers.get('x-twilio-signature');
  if (!twilioSignature) {
    console.warn('⚠️ No hay firma Twilio, permitiendo en dev');
    return true;
  }
  return true;
}

function verifyMetaSignature(
  body: any,
  headers: Headers,
  settings: any
): boolean {
  // TODO: Implementar verificación de firma Meta (X-Hub-Signature-256)
  const signature = headers.get('x-hub-signature-256');
  if (!signature) {
    console.warn('⚠️ No hay firma Meta, permitiendo en dev');
    return true;
  }
  return true;
}

function verifyEvolutionApiKey(headers: Headers, settings: any): boolean {
  const apiKey = headers.get('apikey');
  if (!apiKey || apiKey !== settings.api_key) {
    console.error('❌ API Key inválida');
    return false;
  }
  return true;
}

// ==========================================
// GET HANDLER - Verificación de Meta
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: { organization_id: string } }
) {
  console.log('📥 GET request recibido (verificación Meta)');

  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('🔍 Params:', { mode, token: token?.substring(0, 10) + '...', challenge });

  // Verificación de webhook de Meta
  if (mode === 'subscribe' && token) {
    const supabase = await getSupabaseServerClient();
    
    // Obtener el verify token de la configuración
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('settings')
      .eq('organization_id', params.organization_id)
      .eq('provider', 'meta')
      .single();

    const expectedToken = config?.settings?.webhook_verify_token;

    if (token === expectedToken) {
      console.log('✅ Webhook verificado correctamente');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error('❌ Token inválido');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('OK', { status: 200 });
}

// ==========================================
// POST HANDLER - Recibir Mensajes
// ==========================================

export async function POST(
  request: NextRequest,
  { params }: { params: { organization_id: string } }
) {
  const organizationId = params.organization_id;
  
  console.log('\n' + '='.repeat(60));
  console.log('📥 WEBHOOK RECIBIDO');
  console.log('🏢 Organization:', organizationId);
  console.log('='.repeat(60));

  // Declarar body fuera del try para que esté disponible en el catch
  let body: any = null;

  try {
    // 1️⃣ PARSEAR BODY
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    } else {
      body = await request.text();
      try {
        body = JSON.parse(body);
      } catch {
        console.error('❌ No se pudo parsear el body');
      }
    }

    console.log('📦 Body recibido:', JSON.stringify(body, null, 2).substring(0, 500));

    // 2️⃣ DETECTAR PROVIDER
    const provider = detectProvider(body, request.headers);
    console.log('🔍 Provider detectado:', provider);

    // 3️⃣ VERIFICAR WEBHOOK (Seguridad)
    const isValid = await verifyWebhook(
      provider,
      body,
      request.headers,
      organizationId
    );

    if (!isValid) {
      console.error('❌ Webhook no válido');
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 403 }
      );
    }

    console.log('✅ Webhook verificado');

    // 4️⃣ VERIFICAR QUE LA ORGANIZACIÓN TENGA WHATSAPP ACTIVO
    const supabase = await getSupabaseServerClient();
    
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (configError || !whatsappConfig) {
      console.error('❌ WhatsApp no configurado o inactivo:', configError);
      return NextResponse.json(
        { error: 'WhatsApp not configured' },
        { status: 404 }
      );
    }

    console.log('✅ Config WhatsApp encontrada');

    // 5️⃣ VERIFICAR QUE TENGA AI AGENT CONFIGURADO
    const { data: aiConfig, error: aiError } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .single();

    if (aiError || !aiConfig) {
      console.error('❌ AI Agent no configurado:', aiError);
      return NextResponse.json(
        { error: 'AI Agent not configured' },
        { status: 404 }
      );
    }

    console.log('✅ AI Agent configurado');

    // 6️⃣ PROCESAR MENSAJE
    console.log('🤖 Procesando mensaje con webhook-handler...');
    
    await handleIncomingMessage(
      body,
      provider,
      organizationId
    );

    console.log('✅ Mensaje procesado exitosamente');
    console.log('='.repeat(60) + '\n');

    // 7️⃣ RESPONDER CON 200 OK
    // Es importante responder rápido para no hacer timeout
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('❌ ERROR PROCESANDO WEBHOOK:', error);
    console.log('='.repeat(60) + '\n');

    // Log del error en base de datos (opcional)
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from('webhook_errors').insert({
        organization_id: organizationId,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : null,
        request_body: body ? JSON.stringify(body) : null,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('No se pudo guardar el error:', logError);
    }

    // Siempre devolver 200 para que el provider no reintente
    // Los errores los manejamos internamente
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    );
  }
}

// ==========================================
// HEALTH CHECK
// ==========================================

export async function HEAD(
  request: NextRequest,
  { params }: { params: { organization_id: string } }
) {
  return new NextResponse(null, { status: 200 });
}
