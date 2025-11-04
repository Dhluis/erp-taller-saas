/**
 * TEST AGENT ENDPOINT
 * 
 * Endpoint para probar el agente de IA de WhatsApp sin necesidad
 * de recibir webhooks reales.
 * 
 * POST: Procesa un mensaje de prueba con el AI Agent
 * GET: Health check del servicio
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/integrations/whatsapp/utils/supabase-helpers';
import { processMessage } from '@/integrations/whatsapp/services/ai-agent';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/test-agent
 * Health check del servicio
 */
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Verificar conexión a Supabase
    const { error: healthError } = await supabase
      .from('ai_agent_config')
      .select('id')
      .limit(1);

    if (healthError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: healthError.message
      }, { status: 500 });
    }

    // Verificar variables de entorno de AI
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        openai: hasOpenAI ? 'configured' : 'not_configured',
        anthropic: hasAnthropic ? 'configured' : 'not_configured'
      },
      message: 'AI Agent test endpoint is ready'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/test-agent
 * Procesa un mensaje de prueba con el AI Agent
 * 
 * Body:
 * {
 *   "message": "Hola, quiero agendar una cita",
 *   "conversationId": "optional-conversation-id",
 *   "organizationId": "optional-org-id" // Si no se proporciona, usa la del tenant
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1️⃣ OBTENER CONTEXTO DEL TENANT
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    // 2️⃣ PARSEAR BODY
    const body = await request.json();
    const {
      message,
      conversationId,
      organizationId: providedOrgId
    } = body;

    // Validar que hay mensaje
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'El campo "message" es requerido y debe ser un string'
      }, { status: 400 });
    }

    // Usar organizationId proporcionado o el del tenant
    const organizationId = providedOrgId || tenantContext.organizationId;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST AGENT - Procesando mensaje de prueba');
    console.log('='.repeat(60));
    console.log('📝 Mensaje:', message);
    console.log('🏢 Organization:', organizationId);
    console.log('💬 Conversation ID:', conversationId || 'nueva');

    // 3️⃣ VERIFICAR CONFIGURACIÓN DE AI AGENT
    const supabase = await getSupabaseServerClient();
    
    const { data: aiConfig, error: configError } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .single();

    if (configError || !aiConfig) {
      console.error('❌ AI Agent no configurado:', configError);
      return NextResponse.json({
        success: false,
        error: 'AI Agent no está configurado o habilitado para esta organización',
        details: configError?.message
      }, { status: 404 });
    }

    console.log('✅ AI Agent configurado');
    console.log('   Provider:', aiConfig.provider);
    console.log('   Model:', aiConfig.model);

    // 4️⃣ CREAR CONVERSACIÓN TEMPORAL SI NO EXISTE
    let finalConversationId = conversationId;

    if (!finalConversationId) {
      // Crear conversación temporal para la prueba
      const { data: tempConversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          organization_id: organizationId,
          customer_phone: '+521234567890', // Número de prueba
          customer_name: 'Cliente de Prueba',
          status: 'active',
          is_bot_active: true,
          messages_count: 0,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (convError || !tempConversation) {
        console.error('⚠️ No se pudo crear conversación temporal, usando conversación virtual');
        // Usar un ID temporal para la prueba
        finalConversationId = `test-${Date.now()}`;
      } else {
        finalConversationId = tempConversation.id;
        console.log('📝 Conversación temporal creada:', finalConversationId);
      }
    }

    // 5️⃣ PROCESAR MENSAJE CON AI AGENT
    console.log('🤖 Procesando con AI Agent...');
    
    const startTime = Date.now();
    const result = await processMessage({
      conversationId: finalConversationId,
      organizationId,
      customerMessage: message,
      customerPhone: '+521234567890' // Número de prueba
    });
    const processingTime = Date.now() - startTime;

    console.log('⏱️ Tiempo de procesamiento:', processingTime, 'ms');

    if (!result.success) {
      console.error('❌ Error procesando mensaje:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Error procesando mensaje',
        processingTime
      }, { status: 500 });
    }

    console.log('✅ Respuesta generada');
    console.log('📤 Respuesta:', result.response?.substring(0, 100) + '...');
    console.log('🔧 Funciones llamadas:', result.functionsCalled || 'ninguna');
    console.log('='.repeat(60) + '\n');

    // 6️⃣ RESPUESTA
    return NextResponse.json({
      success: true,
      data: {
        response: result.response,
        functionsCalled: result.functionsCalled || [],
        conversationId: finalConversationId,
        processingTime,
        config: {
          provider: aiConfig.provider,
          model: aiConfig.model,
          temperature: aiConfig.temperature,
          maxTokens: aiConfig.max_tokens
        }
      }
    });

  } catch (error) {
    console.error('❌ ERROR EN TEST AGENT:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.stack : undefined)
        : undefined
    }, { status: 500 });
  }
}

