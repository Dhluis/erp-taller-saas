import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getOrganizationSession, getWahaConfig } from '@/lib/waha-sessions'
import { getAppUrl } from '@/lib/utils/env'

/**
 * POST /api/whatsapp/fix-webhook-url
 * Actualiza la URL del webhook en WAHA a la ruta correcta
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request)
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No organization_id'
      }, { status: 401 })
    }

    console.log('[Fix Webhook] 🔧 Iniciando corrección de webhook...')
    console.log('[Fix Webhook] 🏢 Organization ID:', organizationId)

    // Obtener configuración de WAHA usando la función existente
    const { url: wahaUrl, key: wahaKey } = await getWahaConfig(organizationId)

    if (!wahaUrl || !wahaKey) {
      return NextResponse.json({
        success: false,
        error: 'WAHA credentials not configured',
        details: {
          hasUrl: !!wahaUrl,
          hasKey: !!wahaKey
        }
      }, { status: 500 })
    }

    // Obtener nombre de sesión
    const sessionName = await getOrganizationSession(organizationId)
    
    if (!sessionName) {
      return NextResponse.json({
        success: false,
        error: 'No session found for organization'
      }, { status: 404 })
    }

    // URL correcta del webhook (usar el webhook principal)
    const correctWebhookUrl = `${getAppUrl()}/api/webhooks/whatsapp`

    console.log('[Fix Webhook] 📡 WAHA URL:', wahaUrl)
    console.log('[Fix Webhook] 🎯 Session:', sessionName)
    console.log('[Fix Webhook] ✅ Webhook correcto:', correctWebhookUrl)

    // Actualizar webhook en WAHA usando PATCH
    const updateUrl = `${wahaUrl}/api/sessions/${sessionName}`
    
    const requestBody = {
      config: {
        webhooks: [
          {
            url: correctWebhookUrl,
            events: ['message', 'message.any'],
            downloadMedia: true,
            downloadMediaOnMessage: true,
            hmac: null,
            retries: null,
            customHeaders: [
              {
                name: 'X-Organization-ID',
                value: organizationId
              }
            ]
          }
        ]
      }
    }

    console.log('[Fix Webhook] 📤 Request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wahaKey
      },
      body: JSON.stringify(requestBody)
    })

    const responseText = await response.text()
    let result

    try {
      result = JSON.parse(responseText)
    } catch {
      result = responseText
    }

    if (!response.ok) {
      console.error('[Fix Webhook] ❌ Error de WAHA:', response.status, result)
      return NextResponse.json({
        success: false,
        error: 'Error actualizando en WAHA',
        status: response.status,
        details: result
      }, { status: response.status })
    }

    console.log('[Fix Webhook] ✅ Webhook actualizado exitosamente')
    console.log('[Fix Webhook] 📥 Response:', result)

    return NextResponse.json({
      success: true,
      message: 'Webhook URL corregida',
      previousUrl: '/api/webhooks/whatsapp',
      newUrl: correctWebhookUrl,
      sessionName,
      organizationId,
      wahaResponse: result
    })

  } catch (error: any) {
    console.error('[Fix Webhook] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/whatsapp/fix-webhook-url
 * Información sobre el endpoint
 */
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to fix webhook URL',
    endpoint: '/api/whatsapp/fix-webhook-url',
    method: 'POST',
    description: 'Updates the webhook URL in WAHA to the correct endpoint'
  })
}



