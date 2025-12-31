/**
 * DIAGNÓSTICO DE BOT DE WHATSAPP
 * 
 * Verifica todos los puntos críticos para que el bot responda:
 * 1. AI Agent enabled en ai_agent_config
 * 2. OPENAI_API_KEY configurada
 * 3. Webhook llegando (últimos logs)
 * 4. is_bot_active en conversación
 * 
 * Basado en: /mnt/skills/user/eagles-erp-developer/references/whatsapp.md líneas 651-671
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organizationId'
      }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const diagnostics: any = {
      organizationId,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // 1️⃣ VERIFICAR AI AGENT ENABLED
    console.log('[Diagnose] 🔍 Verificando AI Agent config...');
    const { data: aiConfig, error: aiConfigError } = await supabase
      .from('ai_agent_config')
      .select('id, enabled, provider, model, organization_id')
      .eq('organization_id', organizationId)
      .single();

    if (aiConfigError) {
      diagnostics.checks.aiAgentConfig = {
        status: 'error',
        error: aiConfigError.message,
        code: aiConfigError.code,
        enabled: false
      };
    } else if (!aiConfig) {
      diagnostics.checks.aiAgentConfig = {
        status: 'not_found',
        enabled: false,
        message: 'No se encontró configuración AI para esta organización'
      };
    } else {
      diagnostics.checks.aiAgentConfig = {
        status: 'ok',
        enabled: aiConfig.enabled,
        provider: aiConfig.provider,
        model: aiConfig.model,
        configId: aiConfig.id
      };
    }

    // 2️⃣ VERIFICAR OPENAI_API_KEY
    console.log('[Diagnose] 🔍 Verificando OPENAI_API_KEY...');
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    diagnostics.checks.apiKeys = {
      openai: {
        configured: !!openaiKey,
        length: openaiKey ? openaiKey.length : 0,
        preview: openaiKey ? `${openaiKey.substring(0, 7)}...${openaiKey.substring(openaiKey.length - 4)}` : null
      },
      anthropic: {
        configured: !!anthropicKey,
        length: anthropicKey ? anthropicKey.length : 0,
        preview: anthropicKey ? `${anthropicKey.substring(0, 7)}...${anthropicKey.substring(anthropicKey.length - 4)}` : null
      },
      status: (!!openaiKey || !!anthropicKey) ? 'ok' : 'missing',
      message: (!!openaiKey || !!anthropicKey) 
        ? 'API key configurada' 
        : '❌ OPENAI_API_KEY o ANTHROPIC_API_KEY no configurada'
    };

    // 3️⃣ VERIFICAR WEBHOOK (últimos mensajes recibidos)
    console.log('[Diagnose] 🔍 Verificando webhook (últimos mensajes)...');
    const { data: recentMessages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, from_number, body, created_at, status')
      .eq('organization_id', organizationId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      diagnostics.checks.webhook = {
        status: 'error',
        error: messagesError.message
      };
    } else {
      diagnostics.checks.webhook = {
        status: 'ok',
        recentMessagesCount: recentMessages?.length || 0,
        lastMessage: recentMessages && recentMessages.length > 0 ? {
          id: recentMessages[0].id,
          from: recentMessages[0].from_number,
          body: recentMessages[0].body?.substring(0, 100),
          createdAt: recentMessages[0].created_at,
          status: recentMessages[0].status
        } : null,
        recentMessages: recentMessages?.map(m => ({
          id: m.id,
          from: m.from_number,
          createdAt: m.created_at
        })) || []
      };
    }

    // 4️⃣ VERIFICAR CONVERSACIONES CON BOT ACTIVO
    console.log('[Diagnose] 🔍 Verificando conversaciones con bot activo...');
    const { data: conversations, error: conversationsError } = await supabase
      .from('whatsapp_conversations')
      .select('id, customer_phone, is_bot_active, assigned_to, status, messages_count, last_message_at')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(10);

    if (conversationsError) {
      diagnostics.checks.conversations = {
        status: 'error',
        error: conversationsError.message
      };
    } else {
      const activeBotConversations = conversations?.filter(c => c.is_bot_active && !c.assigned_to) || [];
      const humanAssignedConversations = conversations?.filter(c => c.assigned_to) || [];
      const botInactiveConversations = conversations?.filter(c => !c.is_bot_active) || [];

      diagnostics.checks.conversations = {
        status: 'ok',
        totalActive: conversations?.length || 0,
        botActive: activeBotConversations.length,
        humanAssigned: humanAssignedConversations.length,
        botInactive: botInactiveConversations.length,
        botActiveConversations: activeBotConversations.map(c => ({
          id: c.id,
          phone: c.customer_phone,
          messagesCount: c.messages_count,
          lastMessageAt: c.last_message_at
        })),
        sampleConversations: conversations?.slice(0, 3).map(c => ({
          id: c.id,
          phone: c.customer_phone,
          isBotActive: c.is_bot_active,
          assignedTo: c.assigned_to,
          messagesCount: c.messages_count
        })) || []
      };
    }

    // 5️⃣ VERIFICAR SESIÓN WAHA
    console.log('[Diagnose] 🔍 Verificando sesión WAHA...');
    const { data: sessionConfig, error: sessionError } = await supabase
      .from('ai_agent_config')
      .select('whatsapp_session_name')
      .eq('organization_id', organizationId)
      .single();

    if (sessionError || !sessionConfig) {
      diagnostics.checks.wahaSession = {
        status: 'error',
        error: sessionError?.message || 'No se encontró sesión'
      };
    } else {
      diagnostics.checks.wahaSession = {
        status: 'ok',
        sessionName: sessionConfig.whatsapp_session_name
      };
    }

    // 📊 RESUMEN GENERAL
    const allChecks = [
      diagnostics.checks.aiAgentConfig?.status === 'ok' && diagnostics.checks.aiAgentConfig?.enabled,
      diagnostics.checks.apiKeys?.status === 'ok',
      diagnostics.checks.webhook?.status === 'ok',
      diagnostics.checks.conversations?.status === 'ok' && diagnostics.checks.conversations?.botActive > 0,
      diagnostics.checks.wahaSession?.status === 'ok'
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;

    diagnostics.summary = {
      passedChecks,
      totalChecks,
      status: passedChecks === totalChecks ? 'ok' : 'issues',
      issues: [
        !(diagnostics.checks.aiAgentConfig?.enabled) && 'AI Agent no está habilitado',
        diagnostics.checks.apiKeys?.status !== 'ok' && 'API key no configurada',
        diagnostics.checks.webhook?.status !== 'ok' && 'Problema con webhook',
        diagnostics.checks.conversations?.botActive === 0 && 'No hay conversaciones con bot activo',
        diagnostics.checks.wahaSession?.status !== 'ok' && 'Sesión WAHA no configurada'
      ].filter(Boolean)
    };

    return NextResponse.json({
      success: true,
      diagnostics
    });

  } catch (error: any) {
    console.error('[Diagnose] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/diagnose
 * Diagnóstico específico para un número de teléfono
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organizationId'
      }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'phoneNumber es requerido'
      }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    
    // Normalizar número de teléfono (remover @c.us si existe)
    const normalizedPhone = phoneNumber.replace('@c.us', '').replace('@s.whatsapp.net', '');

    // Buscar conversación específica
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_phone', normalizedPhone)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró conversación activa para este número',
        phoneNumber: normalizedPhone
      }, { status: 404 });
    }

    // Buscar últimos mensajes de esta conversación
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Verificar configuración AI
    const { data: aiConfig } = await supabase
      .from('ai_agent_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    return NextResponse.json({
      success: true,
      phoneNumber: normalizedPhone,
      conversation: {
        id: conversation.id,
        isBotActive: conversation.is_bot_active,
        assignedTo: conversation.assigned_to,
        status: conversation.status,
        messagesCount: conversation.messages_count,
        lastMessageAt: conversation.last_message_at
      },
      aiConfig: aiConfig ? {
        enabled: aiConfig.enabled,
        provider: aiConfig.provider,
        model: aiConfig.model
      } : null,
      recentMessages: messages?.map(m => ({
        id: m.id,
        direction: m.direction,
        body: m.body?.substring(0, 100),
        createdAt: m.created_at,
        status: m.status
      })) || [],
      diagnosis: {
        botShouldRespond: conversation.is_bot_active && !conversation.assigned_to && aiConfig?.enabled,
        reasons: [
          !conversation.is_bot_active && 'Bot inactivo en esta conversación',
          conversation.assigned_to && 'Conversación asignada a humano',
          !aiConfig?.enabled && 'AI Agent deshabilitado',
          !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && 'API key no configurada'
        ].filter(Boolean)
      }
    });

  } catch (error: any) {
    console.error('[Diagnose POST] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
