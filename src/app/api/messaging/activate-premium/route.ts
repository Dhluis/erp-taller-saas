/**
 * ACTIVACIÓN TIER PREMIUM - Twilio WhatsApp API
 * 
 * Comprar número de WhatsApp en Twilio y configurar webhook
 * para activar tier premium de mensajería
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import twilio from 'twilio';
import { getAppUrl } from '@/lib/utils/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/messaging/activate-premium
 * Activa tier premium comprando número WhatsApp en Twilio
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Activate Premium] 🚀 Iniciando activación tier premium...');
    
    // 1. Autenticación
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // 2. Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }
    
    const organizationId = userProfile.organization_id;
    
    // 3. Verificar credenciales de Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials no configuradas' },
        { status: 500 }
      );
    }
    
    const twilioClient = twilio(accountSid, authToken);
    
    // 4. Obtener información de la organización
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('id, name, country')
      .eq('id', organizationId)
      .single();
    
    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }
    
    const countryCode = organization.country?.toUpperCase() || 'MX';
    console.log('[Activate Premium] País:', countryCode);
    
    // 5. Buscar números disponibles en Twilio
    console.log('[Activate Premium] 🔍 Buscando números disponibles...');
    
    let availableNumbers: any[] = [];
    
    try {
      // Intentar números locales primero
      availableNumbers = await twilioClient
        .availablePhoneNumbers(countryCode)
        .local
        .list({ 
          smsEnabled: true,
          limit: 5 
        });
      
      if (availableNumbers.length === 0) {
        // Intentar toll-free como alternativa
        availableNumbers = await twilioClient
          .availablePhoneNumbers(countryCode)
          .tollFree
          .list({ 
            smsEnabled: true,
            limit: 5 
          });
      }
    } catch (searchError: any) {
      console.error('[Activate Premium] Error buscando números:', searchError);
      return NextResponse.json(
        { 
          error: 'Error buscando números disponibles',
          details: searchError.message 
        },
        { status: 500 }
      );
    }
    
    if (availableNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No hay números disponibles en Twilio para este país' },
        { status: 400 }
      );
    }
    
    // 6. Construir URL del webhook
    const appUrl = getAppUrl();
    const webhookUrl = `${appUrl}/api/messaging/twilio/webhook/${organizationId}`;
    
    console.log('[Activate Premium] Webhook URL:', webhookUrl);
    
    // 7. Comprar número
    const selectedNumber = availableNumbers[0];
    console.log('[Activate Premium] 📞 Comprando número:', selectedNumber.phoneNumber);
    
    let purchasedNumber;
    try {
      purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: selectedNumber.phoneNumber,
        smsUrl: webhookUrl,
        smsMethod: 'POST',
        statusCallback: webhookUrl,
        statusCallbackMethod: 'POST',
        friendlyName: `Eagles ERP - ${organization.name} - WhatsApp Premium`,
      });
      
      console.log('[Activate Premium] ✅ Número comprado:', purchasedNumber.phoneNumber);
      console.log('[Activate Premium] SID:', purchasedNumber.sid);
      
    } catch (purchaseError: any) {
      console.error('[Activate Premium] Error comprando número:', purchaseError);
      return NextResponse.json(
        { 
          error: 'Error comprando número en Twilio',
          details: purchaseError.message,
          code: purchaseError.code 
        },
        { status: 500 }
      );
    }
    
    // 8. Actualizar configuración en BD
    const { error: updateError } = await supabaseAdmin
      .from('organization_messaging_config')
      .upsert({
        organization_id: organizationId,
        tier: 'premium',
        whatsapp_api_provider: 'twilio',
        whatsapp_api_number: purchasedNumber.phoneNumber,
        whatsapp_api_twilio_sid: purchasedNumber.sid,
        whatsapp_api_status: 'active',
        whatsapp_enabled: true,
        whatsapp_verified: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id'
      });
    
    if (updateError) {
      console.error('[Activate Premium] Error actualizando config:', updateError);
      
      // Intentar eliminar el número comprado si falla la actualización
      try {
        await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
        console.log('[Activate Premium] Número eliminado por error en BD');
      } catch (deleteError) {
        console.error('[Activate Premium] Error eliminando número:', deleteError);
      }
      
      return NextResponse.json(
        { error: 'Error actualizando configuración' },
        { status: 500 }
      );
    }
    
    console.log('[Activate Premium] ✅ Tier premium activado exitosamente');
    
    return NextResponse.json({
      success: true,
      data: {
        phone_number: purchasedNumber.phoneNumber,
        tier: 'premium',
        provider: 'twilio',
        sid: purchasedNumber.sid,
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Activate Premium] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado', details: error.message },
      { status: 500 }
    );
  }
}
