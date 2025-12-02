import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp/qr
 * Genera un código QR para vincular WhatsApp Business
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
    const phoneNumber = searchParams.get('phone')

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Número de teléfono requerido'
      }, { status: 400 })
    }

    // Opción 1: WhatsApp Click-to-Chat (Simple - funciona inmediatamente)
    const cleanPhone = phoneNumber.replace(/\s|-|\(|\)|\+/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}`

    // Opción 2: Si tienes WhatsApp Business API configurada
    const useBusinessAPI = process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID

    if (useBusinessAPI) {
      // Generar QR usando Meta API
      try {
        const qrResponse = await fetch(
          `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/message_templates`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
            }
          }
        )

        // Nota: Meta no tiene un endpoint directo para generar QR
        // El QR se genera desde la app de WhatsApp Business
        // Por ahora retornamos el URL de Click-to-Chat
      } catch (error) {
        console.warn('[WhatsApp QR] Meta API no disponible, usando Click-to-Chat')
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        qr_url: whatsappUrl,
        phone: phoneNumber,
        type: useBusinessAPI ? 'business_api' : 'click_to_chat'
      }
    })
  } catch (error) {
    console.error('[WhatsApp QR] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar QR'
    }, { status: 500 })
  }
}

