/**
 * POST /api/whatsapp/force-webhook
 * Fuerza la actualización del webhook de una sesión
 * Endpoint de debug/administración con logging detallado
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrganizationSession, getWahaConfig, updateSessionWebhook } from '@/lib/waha-sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 [Force Webhook] INICIANDO ACTUALIZACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Obtener usuario autenticado
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('[Force Webhook] Usuario no autenticado');
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
      console.error('[Force Webhook] Error obteniendo perfil:', profileError);
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 403 });
    }
    
    const organizationId = userProfile.organization_id;
    console.log('🏢 Organization ID:', organizationId);

    // Obtener nombre de sesión
    let sessionName: string;
    try {
      sessionName = await getOrganizationSession(organizationId);
      console.log('📱 Session Name:', sessionName);
    } catch (sessionError: any) {
      console.error('[Force Webhook] ❌ Error obteniendo sesión:', sessionError);
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
      console.log('🌐 WAHA URL:', wahaConfig.url);
      console.log('🔑 WAHA Key length:', wahaConfig.key.length);
    } catch (configError: any) {
      console.error('[Force Webhook] ❌ Error obteniendo configuración WAHA:', configError);
      return NextResponse.json({
        success: false,
        error: `Error obteniendo configuración WAHA: ${configError.message}`,
        sessionName
      }, { status: 500 });
    }

    // URL del webhook (fail-fast si no está configurada)
    const webhookUrl = (() => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      
      if (!appUrl) {
        console.error('[WhatsApp Config] ❌ NEXT_PUBLIC_APP_URL no está configurada');
        throw new Error(
          'NEXT_PUBLIC_APP_URL es requerida para configurar webhooks de WhatsApp. ' +
          'Configúrala en .env.local o en Vercel'
        );
      }
      
      return `${appUrl}/api/webhooks/whatsapp`;
    })();
    
    console.log('📍 Webhook URL completa:', webhookUrl);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Actualizar webhook usando la función auxiliar
    console.log('📤 Actualizando webhook en WAHA...');
    try {
      await updateSessionWebhook(sessionName, organizationId);
      console.log('✅ Webhook actualizado exitosamente');
    } catch (updateError: any) {
      console.error('❌ Error actualizando webhook:', {
        message: updateError.message,
        stack: updateError.stack
      });
      return NextResponse.json({
        success: false,
        error: `Error actualizando webhook: ${updateError.message}`,
        details: process.env.NODE_ENV === 'development' ? updateError.stack : undefined
      }, { status: 500 });
    }

    // Verificar que se configuró correctamente
    console.log('🔍 Verificando configuración actualizada...');
    try {
      const verifyResponse = await fetch(`${wahaConfig.url}/api/sessions/${sessionName}`, {
        headers: {
          'X-Api-Key': wahaConfig.key,
          'Content-Type': 'application/json'
        }
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text().catch(() => 'Error desconocido');
        console.error('⚠️ No se pudo verificar la sesión:', {
          status: verifyResponse.status,
          error: errorText
        });
        
        return NextResponse.json({
          success: true,
          message: 'Webhook actualizado pero no se pudo verificar',
          webhookUrl,
          warning: 'No se pudo verificar la configuración actualizada'
        });
      }

      const sessionData = await verifyResponse.json();
      const webhooks = sessionData.config?.webhooks || [];
      
      const webhookConfigured = webhooks.some((wh: any) => {
        const whUrl = wh.url || '';
        return whUrl === webhookUrl || whUrl.replace(/\/$/, '') === webhookUrl.replace(/\/$/, '');
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ VERIFICACIÓN COMPLETADA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Webhooks configurados:', webhooks.length);
      console.log('✅ Webhook correcto:', webhookConfigured ? 'SÍ' : 'NO');
      console.log('📋 Detalles:', JSON.stringify(webhooks, null, 2));
      console.log('🔌 Estado de sesión:', sessionData.status || 'N/A');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return NextResponse.json({
        success: true,
        message: 'Webhook actualizado correctamente',
        webhookUrl,
        webhookConfigured,
        webhooksConfigured: webhooks.length,
        sessionData: {
          status: sessionData.status || 'N/A',
          webhooks: webhooks.map((wh: any) => ({
            url: wh.url,
            events: wh.events || [],
            downloadMedia: wh.downloadMedia || false,
            downloadMediaOnMessage: wh.downloadMediaOnMessage || false
          }))
        },
        verification: {
          passed: webhookConfigured,
          expectedUrl: webhookUrl,
          foundUrl: webhooks.find((wh: any) => wh.url)?.url || null
        }
      });

    } catch (verifyError: any) {
      console.error('⚠️ Error durante verificación:', {
        message: verifyError.message,
        stack: verifyError.stack
      });
      
      // Aun si falla la verificación, el webhook podría haberse actualizado correctamente
      return NextResponse.json({
        success: true,
        message: 'Webhook actualizado (verificación falló)',
        webhookUrl,
        warning: `Error durante verificación: ${verifyError.message}`
      });
    }

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR EN FORCE WEBHOOK');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * GET /api/whatsapp/force-webhook
 * Verificar que el endpoint existe
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Force webhook endpoint is active',
    timestamp: new Date().toISOString(),
    endpoint: '/api/whatsapp/force-webhook'
  });
}

