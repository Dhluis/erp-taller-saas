/**
 * TEST AGENT ENDPOINT
 * 
 * Endpoint para probar el agente de IA de WhatsApp sin necesidad
 * de recibir webhooks reales.
 * 
 * POST: Procesa un mensaje de prueba con el AI Agent
 * GET: Health check del servicio
 */

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/integrations/whatsapp/utils/supabase-server-helpers';
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
    // Debug: Log todas las variables de entorno relacionadas con OpenAI
    console.log('\n' + '='.repeat(60));
    console.log('[TestAgent] 🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO');
    console.log('='.repeat(60));
    console.log('[TestAgent] NODE_ENV:', process.env.NODE_ENV);
    console.log('[TestAgent] OPENAI_API_KEY presente:', !!process.env.OPENAI_API_KEY);
    console.log('[TestAgent] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
    console.log('[TestAgent] OPENAI_API_KEY primeros 20 chars:', process.env.OPENAI_API_KEY?.substring(0, 20) || 'NO ENCONTRADA');
    
    // Verificar todas las variables que contengan "OPENAI" o "AI"
    const allEnvKeys = Object.keys(process.env).filter(key => 
      key.toUpperCase().includes('OPENAI') || 
      key.toUpperCase().includes('ANTHROPIC') ||
      key.toUpperCase().includes('AI')
    );
    console.log('[TestAgent] Variables relacionadas encontradas:', allEnvKeys);
    console.log('='.repeat(60) + '\n');
    
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
    // DEBUG: Verificar variables de entorno al inicio del POST
    console.log('\n' + '='.repeat(60));
    console.log('[TestAgent POST] 🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO');
    console.log('='.repeat(60));
    console.log('[TestAgent POST] process.env.OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
    console.log('[TestAgent POST] process.env.OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
    console.log('[TestAgent POST] process.env.OPENAI_API_KEY primeros 20:', process.env.OPENAI_API_KEY?.substring(0, 20) || 'NO ENCONTRADA');
    console.log('[TestAgent POST] Todas las variables OPENAI:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
    console.log('='.repeat(60) + '\n');
    
    // 1️⃣ OBTENER CONTEXTO DEL TENANT
    const tenantContext = await getTenantContext(request);
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
        // Usar un UUID temporal válido para la prueba
        finalConversationId = randomUUID();
      } else {
        finalConversationId = tempConversation.id;
        console.log('📝 Conversación temporal creada:', finalConversationId);
      }
    }

    // 5️⃣ VERIFICAR API KEY ANTES DE PROCESAR
    if (!process.env.OPENAI_API_KEY) {
      console.error('[TestAgent POST] ❌ OPENAI_API_KEY no está disponible en process.env');
      console.error('[TestAgent POST] Verificando si existe en el archivo...');
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY no está configurada. Por favor, verifica tu archivo .env.local y reinicia el servidor completamente.',
        debug: {
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
          nodeEnv: process.env.NODE_ENV,
          allOpenAIVars: Object.keys(process.env).filter(k => k.includes('OPENAI'))
        }
      }, { status: 500 });
    }
    
    // 5️⃣ PROCESAR MENSAJE CON AI AGENT
    console.log('🤖 Procesando con AI Agent...');
    console.log('⚠️ Modo prueba: Verificación de horarios deshabilitada');
    console.log('🔑 API Key presente:', !!process.env.OPENAI_API_KEY);
    
    const startTime = Date.now();
    const result = await processMessage({
      conversationId: finalConversationId,
      organizationId,
      customerMessage: message,
      customerPhone: '+521234567890', // Número de prueba
      skipBusinessHoursCheck: true // Saltar verificación de horarios en pruebas
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

