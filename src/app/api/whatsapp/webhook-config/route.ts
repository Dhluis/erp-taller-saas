import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getOrganizationSession, getSessionStatus, updateSessionWebhook } from '@/lib/waha-sessions';

/**
 * GET /api/whatsapp/webhook-config
 * Obtiene la configuración actual del webhook de WAHA
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organization_id'
      }, { status: 401 });
    }

    const sessionName = await getOrganizationSession(organizationId);
    const status = await getSessionStatus(sessionName, organizationId);

    // Obtener configuración completa de WAHA
    const { getWahaConfig } = await import('@/lib/waha-sessions');
    const { url, key } = await getWahaConfig(organizationId);

    const response = await fetch(`${url}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': key }
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Error obteniendo configuración: ${response.status}`
      }, { status: response.status });
    }

    const sessionData = await response.json();
    const webhookConfig = sessionData.config?.webhooks?.[0] || null;

    return NextResponse.json({
      success: true,
      sessionName,
      webhookConfig: {
        url: webhookConfig?.url || 'No configurado',
        events: webhookConfig?.events || [],
        downloadMedia: webhookConfig?.downloadMedia || false,
        downloadMediaOnMessage: webhookConfig?.downloadMediaOnMessage || false
      },
      needsUpdate: !webhookConfig?.downloadMedia || 
                   !webhookConfig?.downloadMediaOnMessage ||
                   webhookConfig?.events?.includes('message.any')
    });

  } catch (error: any) {
    console.error('[Webhook Config] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/webhook-config
 * Actualiza la configuración del webhook con soporte multimedia
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organization_id'
      }, { status: 401 });
    }

    const sessionName = await getOrganizationSession(organizationId);
    
    console.log(`[Webhook Config] 🔄 Actualizando webhook para sesión: ${sessionName}`);
    
    await updateSessionWebhook(sessionName, organizationId);

    return NextResponse.json({
      success: true,
      message: 'Webhook actualizado con soporte multimedia',
      sessionName
    });

  } catch (error: any) {
    console.error('[Webhook Config] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

