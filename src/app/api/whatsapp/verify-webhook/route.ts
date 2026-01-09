/**
 * GET /api/whatsapp/verify-webhook
 * Verifica el estado actual del webhook configurado en WAHA
 * Útil para debugging y verificación manual
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrganizationSession, getWahaConfig, getSessionStatus } from '@/lib/waha-sessions';
import { getAppUrl } from '@/lib/utils/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[Verify Webhook] 🔍 Iniciando verificación de webhook...');
    
    // Obtener usuario autenticado
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('[Verify Webhook] Usuario no autenticado');
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 });
    }

    // Obtener organizationId del perfil del usuario
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', authUser.id)
      .single();
    
    if (profileError || !userProfile || !userProfile.organization_id) {
      console.error('[Verify Webhook] Error obteniendo perfil:', profileError);
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 403 });
    }
    
    const organizationId = userProfile.organization_id;
    console.log('[Verify Webhook] 🏢 Organization ID:', organizationId);

    // Obtener nombre de sesión
    let sessionName: string;
    try {
      sessionName = await getOrganizationSession(organizationId);
      console.log('[Verify Webhook] 📝 Session Name:', sessionName);
    } catch (sessionError: any) {
      console.error('[Verify Webhook] ❌ Error obteniendo sesión:', sessionError);
      return NextResponse.json({
        success: false,
        error: `Error obteniendo sesión: ${sessionError.message}`,
        sessionName: null
      }, { status: 500 });
    }

    // Obtener configuración WAHA
    let wahaConfig: { url: string; key: string };
    try {
      wahaConfig = await getWahaConfig(organizationId);
      console.log('[Verify Webhook] ✅ Configuración WAHA obtenida');
    } catch (configError: any) {
      console.error('[Verify Webhook] ❌ Error obteniendo configuración WAHA:', configError);
      return NextResponse.json({
        success: false,
        error: `Error obteniendo configuración WAHA: ${configError.message}`,
        sessionName
      }, { status: 500 });
    }

    // 🔍 Verificar estado actual del webhook en WAHA
    console.log('[Verify Webhook] 🔍 Consultando sesión en WAHA...');
    const sessionResponse = await fetch(
      `${wahaConfig.url}/api/sessions/${sessionName}`,
      {
        headers: {
          'X-Api-Key': wahaConfig.key,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text().catch(() => 'Error desconocido');
      console.error('[Verify Webhook] ❌ Error consultando sesión en WAHA:', {
        status: sessionResponse.status,
        error: errorText
      });
      
      return NextResponse.json({
        success: false,
        error: 'Sesión no encontrada en WAHA',
        sessionName,
        wahaError: errorText,
        wahaStatus: sessionResponse.status
      }, { status: 404 });
    }

    const sessionData = await sessionResponse.json();
    console.log('[Verify Webhook] ✅ Sesión encontrada en WAHA');

    // Verificar webhooks configurados (fail-fast si no está configurada)
    const webhooks = sessionData.config?.webhooks || [];
    // ✅ Usar getAppUrl() que maneja automáticamente la limpieza y fallbacks
    const expectedUrl = `${getAppUrl()}/api/webhooks/whatsapp`;
    
    const webhookConfigured = webhooks.some((wh: any) => {
      const whUrl = wh.url || '';
      return whUrl === expectedUrl || whUrl.replace(/\/$/, '') === expectedUrl.replace(/\/$/, '');
    });

    // Obtener estado de la sesión
    let sessionStatus: any = null;
    try {
      const statusResult = await getSessionStatus(sessionName, organizationId);
      sessionStatus = {
        status: statusResult.status,
        exists: statusResult.exists,
        phone: statusResult.me?.id?.split('@')[0] || statusResult.me?.phone || null
      };
    } catch (statusError: any) {
      console.warn('[Verify Webhook] ⚠️ Error obteniendo estado de sesión:', statusError.message);
      sessionStatus = {
        error: statusError.message
      };
    }

    const result = {
      success: true,
      sessionName,
      webhookConfigured,
      expectedWebhookUrl: expectedUrl,
      currentWebhooks: webhooks.map((wh: any) => ({
        url: wh.url,
        events: wh.events || [],
        downloadMedia: wh.downloadMedia || false,
        downloadMediaOnMessage: wh.downloadMediaOnMessage || false
      })),
      sessionStatus: sessionStatus?.status || sessionData.status,
      sessionExists: sessionStatus?.exists ?? true,
      sessionPhone: sessionStatus?.phone || null,
      advice: webhookConfigured 
        ? '✅ Webhook está correctamente configurado'
        : '⚠️ Webhook NO está configurado. Usa la acción "update_webhook" para actualizarlo',
      details: {
        wahaUrl: wahaConfig.url,
        hasWebhookConfig: !!sessionData.config?.webhooks,
        webhookCount: webhooks.length
      }
    };

    console.log('[Verify Webhook] ✅ Verificación completada:', {
      webhookConfigured,
      webhookCount: webhooks.length,
      sessionStatus: sessionStatus?.status
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Verify Webhook] ❌ Error verificando webhook:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/verify-webhook
 * Versión POST para compatibilidad (mismo comportamiento que GET)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

