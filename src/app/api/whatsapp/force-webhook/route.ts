import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

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
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

    if (!WAHA_API_URL || !WAHA_API_KEY || !APP_URL) {
      return NextResponse.json({ 
        error: 'Missing configuration',
        missing: {
          WAHA_API_URL: !WAHA_API_URL,
          WAHA_API_KEY: !WAHA_API_KEY,
          APP_URL: !APP_URL
        }
      }, { status: 500 });
    }

    const webhookUrl = `${APP_URL}/api/webhooks/whatsapp`;
    
    const response = await fetch(
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

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update webhook',
        status: response.status,
        wahaResponse: result
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      sessionName,
      oldWebhookUrl: 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp',
      newWebhookUrl: webhookUrl,
      wahaResponse: result
    });

  } catch (error) {
    console.error('[Force Webhook] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
