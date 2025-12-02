import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp/qr-coexistence
 * Genera un código QR de coexistencia para vincular WhatsApp Business API
 * Similar a Kommo o ManyChat
 * 
 * Requiere:
 * - WAHA (WhatsApp HTTP API) configurado
 * - O WhatsApp Business API de Meta (pero no genera QR directamente)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const provider = searchParams.get('provider') || 'waha' // 'meta' | 'waha' | 'evolution'

    // Opción 1: WAHA (WhatsApp HTTP API) - Recomendado
    if (provider === 'waha' && process.env.WAHA_API_URL) {
      try {
        const wahaUrl = process.env.WAHA_API_URL.replace(/\/$/, '') // Remover trailing slash
        
        // Crear nombre de sesión único por usuario y organización
        // Formato: whatsapp_org_{orgId}_user_{userId}
        const orgIdShort = tenantContext.organizationId.replace(/-/g, '').substring(0, 8)
        const userIdShort = tenantContext.userId.replace(/-/g, '').substring(0, 8)
        const sessionName = `whatsapp_org_${orgIdShort}_user_${userIdShort}`
        
        // Crear sesión si no existe
        const createResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            config: {
              proxy: null,
              webhooks: [
                // Webhook del ERP (procesamiento directo con AI Agent)
                {
                  url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
                  events: ['message', 'message.any']
                },
                // Webhook de n8n (si está configurado) - para automatizaciones externas
                ...(process.env.N8N_WEBHOOK_URL ? [{
                  url: `${process.env.N8N_WEBHOOK_URL}`,
                  events: ['message', 'message.any', 'status']
                }] : [])
              ]
            }
          })
        })

        if (!createResponse.ok && createResponse.status !== 409) {
          // 409 = sesión ya existe, está bien
          const errorText = await createResponse.text()
          console.warn('[WAHA] Error creando sesión:', errorText)
        }

        // Guardar o actualizar la sesión en la base de datos
        let supabase
        try {
          supabase = getSupabaseServiceClient()
        } catch (e) {
          // Fallback al cliente regular
          const { createClient } = await import('@supabase/supabase-js')
          supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
        }

        // Verificar si ya existe una sesión para este usuario
        const { data: existingSession } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('user_id', tenantContext.userId)
          .eq('organization_id', tenantContext.organizationId)
          .single()

        // Esperar un momento para que la sesión se inicialice
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Obtener QR code
        const qrResponse = await fetch(`${wahaUrl}/api/${sessionName}/auth/qr`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!qrResponse.ok) {
          // Si no hay QR disponible, la sesión puede estar ya conectada o necesita reiniciarse
          const statusResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
            method: 'GET'
          })
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            if (statusData.status === 'WORKING' || statusData.status === 'connected') {
              return NextResponse.json({
                success: true,
                data: {
                  type: 'waha',
                  session_name: sessionName,
                  status: 'connected',
                  message: 'La sesión ya está conectada. No se necesita QR.',
                  connected: true
                }
              })
            }
          }
          
          // Intentar reiniciar la sesión
          const restartResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/restart`, {
            method: 'POST'
          })
          
          if (restartResponse.ok) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const retryQr = await fetch(`${wahaUrl}/api/${sessionName}/auth/qr`)
            if (retryQr.ok) {
              const qrData = await retryQr.json()
              return NextResponse.json({
                success: true,
                data: {
                  type: 'waha',
                  qr_code: qrData.qr || qrData.qrcode || qrData.qrCode,
                  session_name: sessionName,
                  status: 'pending',
                  expires_in: 60
                }
              })
            }
          }
          
          throw new Error('No se pudo generar el QR code. Verifica que WAHA esté ejecutándose correctamente.')
        }

        const qrData = await qrResponse.json()
        
        // WAHA retorna el QR en diferentes formatos, manejarlos todos
        let qrCode = qrData.qr || qrData.qrcode || qrData.qrCode || qrData
        if (typeof qrCode === 'object' && qrCode.base64) {
          qrCode = qrCode.base64
        }

        // Guardar o actualizar la sesión en la base de datos
        const sessionData = {
          user_id: tenantContext.userId,
          organization_id: tenantContext.organizationId,
          session_name: sessionName,
          waha_session_status: 'pending',
          qr_code: typeof qrCode === 'string' ? qrCode : null,
          qr_expires_at: new Date(Date.now() + 60 * 1000).toISOString(), // Expira en 60 segundos
          updated_at: new Date().toISOString()
        }

        if (existingSession) {
          // Actualizar sesión existente
          await supabase
            .from('whatsapp_sessions')
            .update(sessionData)
            .eq('id', existingSession.id)
        } else {
          // Crear nueva sesión
          await supabase
            .from('whatsapp_sessions')
            .insert(sessionData)
        }

        return NextResponse.json({
          success: true,
          data: {
            type: 'waha',
            qr_code: qrCode,
            session_name: sessionName,
            status: qrData.status || 'pending',
            expires_in: 60, // WAHA QR codes expiran en ~60 segundos
            user_id: tenantContext.userId,
            organization_id: tenantContext.organizationId
          }
        })
      } catch (error) {
        console.error('[WhatsApp QR] Error con WAHA:', error)
        return NextResponse.json({
          success: false,
          error: 'Error conectando con WAHA. Verifica la configuración.',
          hint: 'Asegúrate de tener WAHA_API_URL configurado y que WAHA esté ejecutándose'
        }, { status: 500 })
      }
    }

    // Opción 2: WhatsApp Business API de Meta (Oficial)
    if (provider === 'meta' && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        // Meta no tiene un endpoint directo para generar QR de coexistencia
        // El QR se genera desde WhatsApp Business Manager
        // Retornamos la URL de configuración donde el usuario puede obtener el QR
        
        const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        const configUrl = `https://business.facebook.com/latest/whatsapp_manager/manage/phone-numbers/${process.env.WHATSAPP_PHONE_NUMBER_ID}`
        
        return NextResponse.json({
          success: true,
          data: {
            type: 'meta_business_api',
            message: 'Para obtener el QR de coexistencia, ve a WhatsApp Business Manager',
            config_url: configUrl,
            instructions: [
              '1. Ve a WhatsApp Business Manager',
              '2. Selecciona tu número de teléfono',
              '3. Ve a "Dispositivos vinculados"',
              '4. Escanea el código QR que aparece',
              '5. Una vez vinculado, podrás recibir mensajes a través de la API'
            ],
            note: 'El QR de coexistencia se genera desde WhatsApp Business Manager, no desde la API'
          }
        })
      } catch (error) {
        console.error('[WhatsApp QR] Error con Meta API:', error)
      }
    }


    // Si no hay configuración, retornar instrucciones
    return NextResponse.json({
      success: false,
      error: 'No hay configuración de WhatsApp Business API disponible',
      options: {
        waha: {
          required: [
            'WAHA_API_URL'
          ],
          instructions: 'Configura WAHA (WhatsApp HTTP API) - Solución open-source recomendada',
          note: 'WAHA es una solución open-source que permite generar QR de coexistencia directamente',
          setup_url: 'https://github.com/devlikeapro/waha'
        },
        meta: {
          required: [
            'WHATSAPP_ACCESS_TOKEN',
            'WHATSAPP_PHONE_NUMBER_ID',
            'WHATSAPP_BUSINESS_ACCOUNT_ID'
          ],
          instructions: 'Configura WhatsApp Business API en Meta for Developers'
        }
      },
      documentation: '/docs/WHATSAPP_BUSINESS_API_SETUP.md'
    }, { status: 400 })

  } catch (error) {
    console.error('[WhatsApp QR Coexistence] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar QR de coexistencia'
    }, { status: 500 })
  }
}

