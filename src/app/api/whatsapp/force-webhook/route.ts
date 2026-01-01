import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getAppUrl } from '@/lib/utils/env';

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    const organizationId = tenantContext?.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'No authorized' }, { status: 401 });
    }

    const { getOrganizationSession } = await import('@/lib/waha-sessions');
    const sessionName = await getOrganizationSession(organizationId);

    const WAHA_API_URL = process.env.NEXT_PUBLIC_WAHA_API_URL || process.env.WAHA_API_URL;
    const WAHA_API_KEY = process.env.NEXT_PUBLIC_WAHA_API_KEY || process.env.WAHA_API_KEY;
    
    // ✅ Usar getAppUrl() que maneja automáticamente la limpieza y fallbacks
    const APP_URL = getAppUrl();

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      return NextResponse.json({ 
        error: 'Missing configuration',
        missing: {
          WAHA_API_URL: !WAHA_API_URL,
          WAHA_API_KEY: !WAHA_API_KEY,
        }
      }, { status: 500 });
    }

    const webhookUrl = `${APP_URL}/api/webhooks/whatsapp`;
    
    // Intentar primero con el endpoint de configuración directo
    let response = await fetch(
      `${WAHA_API_URL}/api/${sessionName}/config`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': WAHA_API_KEY
        },
        body: JSON.stringify({
          webhooks: [{
            url: webhookUrl,
            events: ['message', 'session.status'],
            downloadMedia: false
          }]
        })
      }
    );

    let endpointUsed = 'config';

    // Si falla, intentar con el endpoint de sesiones
    if (!response.ok) {
      console.log('[Force Webhook] PUT a /config falló, intentando PATCH a /sessions...');
      response = await fetch(
        `${WAHA_API_URL}/api/sessions/${sessionName}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': WAHA_API_KEY
          },
          body: JSON.stringify({
            config: {
              webhooks: [{
                url: webhookUrl,
                events: ['message', 'session.status'],
                downloadMedia: false
              }]
            }
          })
        }
      );
      endpointUsed = 'sessions';
    }

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update webhook',
        status: response.status,
        wahaResponse: result,
        attemptedEndpoints: [
          `PUT ${WAHA_API_URL}/api/${sessionName}/config`,
          `PATCH ${WAHA_API_URL}/api/sessions/${sessionName}`
        ]
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      sessionName,
      oldWebhookUrl: 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp',
      newWebhookUrl: webhookUrl,
      wahaResponse: result,
      endpointUsed
    });

  } catch (error) {
    console.error('[Force Webhook] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/whatsapp/force-webhook
 * Permite llamar el endpoint desde el navegador (que SÍ tiene la sesión autenticada)
 * Ejecuta la misma lógica que POST
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
