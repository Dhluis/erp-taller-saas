// src/app/api/messaging/activate-sms/route.ts
// SISTEMA EMPRESARIAL MULTI-TENANT
// 1 Bundle Maestro → Infinitas Organizaciones

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getAppUrl, cleanEnvVar } from '@/lib/utils/env';

const LATAM_COUNTRIES = {
  MX: { name: 'México', code: 'MX', monthlyCost: 1.00, perSMS: 0.15 },
  CO: { name: 'Colombia', code: 'CO', monthlyCost: 1.00, perSMS: 0.20 },
  AR: { name: 'Argentina', code: 'AR', monthlyCost: 2.00, perSMS: 0.25 },
  CL: { name: 'Chile', code: 'CL', monthlyCost: 2.00, perSMS: 0.20 },
  PE: { name: 'Perú', code: 'PE', monthlyCost: 15.00, perSMS: 0.30 },
  BR: { name: 'Brasil', code: 'BR', monthlyCost: 1.00, perSMS: 0.18 },
  EC: { name: 'Ecuador', code: 'EC', monthlyCost: 1.00, perSMS: 0.22 },
  UY: { name: 'Uruguay', code: 'UY', monthlyCost: 2.00, perSMS: 0.25 },
  CR: { name: 'Costa Rica', code: 'CR', monthlyCost: 2.00, perSMS: 0.23 },
};

/**
 * POST /api/messaging/activate-sms
 * ARQUITECTURA EMPRESARIAL MULTI-TENANT:
 * - 1 Bundle Regulatorio Maestro (Eagles System)
 * - Compra automática de números para cada organización
 * - Escalable a infinitas organizaciones
 * - Multi-país (9 países LATAM)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = createClientFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ success: false, error: 'No se pudo obtener organización' }, { status: 403 });
    }
    
    const organizationId = userProfile.organization_id;
    
    // 2. Obtener datos de la organización
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('id, name, country, address, city')
      .eq('id', organizationId)
      .single();
    
    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 404 });
    }
    
    const countryCode = organization.country?.toUpperCase() || 'MX';
    const countryInfo = LATAM_COUNTRIES[countryCode as keyof typeof LATAM_COUNTRIES];
    
    if (!countryInfo) {
      return NextResponse.json({ 
        success: false, 
        error: 'País no soportado',
        details: `Países disponibles: ${Object.keys(LATAM_COUNTRIES).join(', ')}`
      }, { status: 400 });
    }
    
    console.log(`🌍 [SMS Activation] País: ${countryInfo.name} (${countryCode})`);
    console.log(`🏢 [SMS Activation] Organización: ${organization.name}`);
    
    // 3. Verificar si ya tiene SMS activado
    const { data: existingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_enabled, sms_twilio_number, sms_twilio_sid')
      .eq('organization_id', organizationId)
      .single();
    
    if (existingConfig?.sms_enabled && existingConfig?.sms_twilio_number) {
      console.log(`ℹ️ [SMS Activation] Ya tiene SMS: ${existingConfig.sms_twilio_number}`);
      return NextResponse.json({ 
        success: false, 
        error: 'SMS ya está activado',
        data: { 
          phone_number: existingConfig.sms_twilio_number,
          sid: existingConfig.sms_twilio_sid
        }
      }, { status: 400 });
    }
    
    // 4. Validar credenciales y Bundle (limpiar variables de entorno)
    const accountSid = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
    const authToken = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);
    const bundleSid = cleanEnvVar(process.env.TWILIO_REGULATORY_BUNDLE_SID);
    
    if (!accountSid || !authToken) {
      return NextResponse.json({ success: false, error: 'Servicio SMS no configurado' }, { status: 500 });
    }
    
    if (!bundleSid) {
      console.error('❌ [SMS Activation] TWILIO_REGULATORY_BUNDLE_SID no configurado');
      return NextResponse.json({
        success: false,
        error: 'Sistema no configurado',
        details: 'El Bundle regulatorio maestro no está configurado. Contacta a soporte.',
        adminAction: 'Configurar TWILIO_REGULATORY_BUNDLE_SID en variables de entorno'
      }, { status: 500 });
    }
    
    // Validar formato de Account SID
    if (!accountSid.startsWith('AC')) {
      console.error('❌ [SMS Activation] Account SID con formato incorrecto');
      return NextResponse.json({ 
        success: false, 
        error: 'Configuración de Twilio inválida' 
      }, { status: 500 });
    }
    
    const twilioClient = twilio(accountSid, authToken);
    
    console.log(`📋 [SMS Activation] Bundle Maestro: ${bundleSid}`);
    
    // Usar getAppUrl() que maneja automáticamente protocolo y limpieza
    const appUrl = getAppUrl();
    const webhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}`;
    const statusWebhookUrl = `${webhookUrl}/status`;
    
    console.log(`🔗 [SMS Activation] App URL: ${appUrl}`);
    console.log(`🔗 [SMS Activation] Webhook: ${webhookUrl}`);
    
    // 5. ESTRATEGIA DE COMPRA INTELIGENTE
    let selectedNumber;
    
    try {
      console.log('🔍 [SMS Activation] PASO 1: Verificando números existentes en cuenta...');
      const existingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 100 });
      
      console.log(`📋 [SMS Activation] Total números en cuenta: ${existingNumbers.length}`);
      
      // Filtrar números disponibles del país correcto
      const countryPrefix = getCountryPhonePrefix(countryCode);
      const availableInAccount = existingNumbers.filter(num => {
        // Número del país correcto
        const isCorrectCountry = num.phoneNumber.startsWith(countryPrefix);
        
        // NO está asignado a otra organización (verificar en BD)
        // TODO: Implementar verificación en BD si quieres reutilizar números
        
        return isCorrectCountry;
      });
      
      console.log(`📱 [SMS Activation] Números de ${countryInfo.name} en cuenta: ${availableInAccount.length}`);
      
      // OPCIÓN A: Reutilizar número existente (si tienes pool)
      if (availableInAccount.length > 0) {
        const firstAvailable = availableInAccount[0];
        console.log(`♻️ [SMS Activation] Reutilizando número existente: ${firstAvailable.phoneNumber}`);
        
        selectedNumber = await twilioClient.incomingPhoneNumbers(firstAvailable.sid).update({
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST',
          friendlyName: `Eagles ERP - ${organization.name}`
        });
        
        console.log(`✅ [SMS Activation] Número configurado: ${selectedNumber.phoneNumber}`);
        
      } else {
        // OPCIÓN B: Comprar número nuevo con Bundle Maestro
        console.log('🛒 [SMS Activation] PASO 2: Comprando número nuevo...');
        
        // Estrategia: Toll-Free → Local con Bundle
        let numbersToBuy;
        let numberType = 'toll-free';
        
        try {
          console.log(`📞 [SMS Activation] Buscando Toll-Free en ${countryInfo.name}...`);
          numbersToBuy = await twilioClient
            .availablePhoneNumbers(countryCode)
            .tollFree
            .list({ smsEnabled: true, limit: 20 });
          
          if (numbersToBuy.length === 0) {
            throw new Error('No Toll-Free available');
          }
          
          console.log(`✅ [SMS Activation] Encontrados ${numbersToBuy.length} números Toll-Free`);
          
        } catch (tollFreeError) {
          // Toll-Free no disponible, intentar Local
          console.log(`⚠️ [SMS Activation] No hay Toll-Free, buscando números locales...`);
          numberType = 'local';
          
          numbersToBuy = await twilioClient
            .availablePhoneNumbers(countryCode)
            .local
            .list({ smsEnabled: true, limit: 20 });
          
          if (numbersToBuy.length === 0) {
            throw new Error('No hay números disponibles para compra');
          }
          
          console.log(`✅ [SMS Activation] Encontrados ${numbersToBuy.length} números locales`);
        }
        
        // Seleccionar el primer número disponible
        const selectedPhoneNumber = numbersToBuy[0].phoneNumber;
        console.log(`🎯 [SMS Activation] Número seleccionado: ${selectedPhoneNumber} (${numberType})`);
        
        // Parámetros de compra
        const purchaseParams: any = {
          phoneNumber: selectedPhoneNumber,
          friendlyName: `Eagles ERP - ${organization.name}`,
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST'
        };
        
        // Agregar Bundle SID si es número local (Toll-Free no lo necesita)
        if (numberType === 'local') {
          purchaseParams.bundleSid = bundleSid;
          console.log(`📋 [SMS Activation] Usando Bundle Maestro: ${bundleSid}`);
        }
        
        // COMPRAR NÚMERO
        selectedNumber = await twilioClient.incomingPhoneNumbers.create(purchaseParams);
        
        console.log(`💰 [SMS Activation] Número comprado exitosamente: ${selectedNumber.phoneNumber}`);
        console.log(`📇 [SMS Activation] SID: ${selectedNumber.sid}`);
      }
      
    } catch (error: any) {
      console.error('❌ [SMS Activation] Error en proceso de compra:', error);
      
      // Errores específicos de Twilio
      if (error.code === 21617) {
        return NextResponse.json({
          success: false,
          error: 'Bundle Regulatorio Inválido',
          details: 'El Bundle maestro no está aprobado o es inválido.',
          adminAction: 'Verificar estado del Bundle en Twilio Console',
          bundleUrl: 'https://console.twilio.com/us1/develop/compliance/bundles'
        }, { status: 500 });
      }
      
      if (error.code === 21450 || error.code === 21421) {
        return NextResponse.json({
          success: false,
          error: 'Límite de números alcanzado',
          details: 'La cuenta de Twilio ha alcanzado el límite de números.',
          adminAction: 'Actualizar plan de Twilio o liberar números no usados',
          twilioUrl: 'https://console.twilio.com/billing/upgrade'
        }, { status: 400 });
      }
      
      if (error.message?.includes('No hay números disponibles')) {
        return NextResponse.json({
          success: false,
          error: 'No hay números disponibles',
          details: `Twilio no tiene números disponibles en ${countryInfo.name} en este momento.`,
          suggestion: 'Por favor intenta de nuevo en unos minutos o contacta a soporte.',
          alternative: 'También puedes comprar un número manualmente en Twilio Console y configurarlo.'
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Error al obtener número',
        details: error.message 
      }, { status: 500 });
    }
    
    // 6. Verificar que se obtuvo un número válido
    if (!selectedNumber || !selectedNumber.phoneNumber || !selectedNumber.sid) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo obtener número válido'
      }, { status: 500 });
    }
    
    // 7. Guardar configuración en BD
    console.log(`💾 [SMS Activation] Guardando configuración en BD...`);
    
    const { error: upsertError } = await (supabaseAdmin as any)
      .from('organization_messaging_config')
      .upsert({
        organization_id: organizationId,
        sms_enabled: true,
        sms_provider: 'twilio',
        sms_twilio_number: selectedNumber.phoneNumber,
        sms_twilio_sid: selectedNumber.sid,
        sms_webhook_url: webhookUrl,
        sms_monthly_cost_usd: countryInfo.monthlyCost,
        sms_per_message_cost_mxn: countryInfo.perSMS,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id'
      });
    
    if (upsertError) {
      console.error('❌ [SMS Activation] Error guardando en BD:', upsertError);
      
      // Intentar liberar el número si falló guardar
      try {
        await twilioClient.incomingPhoneNumbers(selectedNumber.sid).remove();
        console.log(`🔄 [SMS Activation] Número liberado debido a error en BD`);
      } catch (releaseError) {
        console.error('❌ [SMS Activation] Error liberando número:', releaseError);
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Error al guardar configuración' 
      }, { status: 500 });
    }
    
    console.log(`✅✅✅ [SMS Activation] SMS ACTIVADO EXITOSAMENTE`);
    console.log(`📱 [SMS Activation] Número: ${selectedNumber.phoneNumber}`);
    console.log(`🏢 [SMS Activation] Organización: ${organization.name} (${organizationId})`);
    console.log(`🌍 [SMS Activation] País: ${countryInfo.name}`);
    
    // 8. Retornar respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'SMS activado correctamente',
      data: {
        phone_number: selectedNumber.phoneNumber,
        sid: selectedNumber.sid,
        type: selectedNumber.phoneNumber.includes('800') ? 'toll-free' : 'local',
        country: countryInfo.name,
        country_code: countryCode,
        webhook_url: webhookUrl,
        costs: {
          monthly_usd: countryInfo.monthlyCost,
          per_sms_mxn: countryInfo.perSMS,
          currency_monthly: 'USD',
          currency_per_sms: 'MXN'
        },
        activated_at: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ [SMS Activation] Error inesperado:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error inesperado',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/messaging/activate-sms
 * Obtener estado de activación de SMS
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClientFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    const userProfileData = userProfile as any;
    
    if (!userProfileData?.organization_id) {
      return NextResponse.json({ success: false, error: 'No se pudo obtener organización' }, { status: 403 });
    }
    
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('country')
      .eq('id', userProfileData.organization_id)
      .single();
    
    const orgData = org as any;
    const countryCode = orgData?.country?.toUpperCase() || 'MX';
    const countryInfo = LATAM_COUNTRIES[countryCode as keyof typeof LATAM_COUNTRIES];
    
    const { data: config } = await supabaseAdmin
      .from('organization_messaging_config')
      .select(`
        sms_enabled,
        sms_provider,
        sms_twilio_number,
        sms_twilio_sid,
        sms_monthly_cost_usd,
        sms_per_message_cost_mxn,
        sms_activated_at
      `)
      .eq('organization_id', userProfileData.organization_id)
      .single();
    
    const configData = config as any;
    
    return NextResponse.json({
      success: true,
      data: {
        enabled: configData?.sms_enabled || false,
        provider: configData?.sms_provider || null,
        phone_number: configData?.sms_twilio_number || null,
        sid: configData?.sms_twilio_sid || null,
        country: countryInfo?.name || null,
        country_code: countryCode,
        costs: configData ? {
          monthly_usd: configData.sms_monthly_cost_usd,
          per_sms_mxn: configData.sms_per_message_cost_mxn
        } : (countryInfo ? {
          monthly_usd: countryInfo.monthlyCost,
          per_sms_mxn: countryInfo.perSMS
        } : null),
        activated_at: configData?.sms_activated_at || null
      }
    });
    
  } catch (error: any) {
    console.error('[SMS Activation GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener estado' }, { status: 500 });
  }
}

/**
 * Helper: Obtener prefijo telefónico por país
 */
function getCountryPhonePrefix(countryCode: string): string {
  const prefixes: Record<string, string> = {
    'MX': '+52', 'CO': '+57', 'AR': '+54', 'CL': '+56',
    'PE': '+51', 'BR': '+55', 'EC': '+593', 'UY': '+598',
    'CR': '+506', 'PA': '+507', 'GT': '+502', 'SV': '+503',
    'HN': '+504', 'NI': '+505', 'BO': '+591', 'PY': '+595', 'VE': '+58',
  };
  return prefixes[countryCode] || '+52';
}
