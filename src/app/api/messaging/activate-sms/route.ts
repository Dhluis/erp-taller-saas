// src/app/api/messaging/activate-sms/route.ts
// VERSIÓN TOLL-FREE: Usa números 800 que NO requieren Bundle regulatorio

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/utils/env';

// Mapeo de países latinoamericanos soportados
const LATAM_COUNTRIES = {
  MX: { name: 'México', code: 'MX', monthlyCost: 2.00, perSMS: 0.15 },
  CO: { name: 'Colombia', code: 'CO', monthlyCost: 2.00, perSMS: 0.20 },
  AR: { name: 'Argentina', code: 'AR', monthlyCost: 3.00, perSMS: 0.25 },
  CL: { name: 'Chile', code: 'CL', monthlyCost: 3.00, perSMS: 0.20 },
  PE: { name: 'Perú', code: 'PE', monthlyCost: 15.00, perSMS: 0.30 },
  BR: { name: 'Brasil', code: 'BR', monthlyCost: 2.00, perSMS: 0.18 },
  // Toll-Free tiene costos ligeramente superiores pero NO requiere Bundle
};

/**
 * Limpia variables de entorno removiendo \r\n, espacios y caracteres invisibles
 * CRÍTICO: Vercel a veces agrega \r\n al final de las variables
 */
function cleanEnvVar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/\r\n/g, '')  // Remover \r\n
    .replace(/\r/g, '')    // Remover \r
    .replace(/\n/g, '')    // Remover \n
    .trim();               // Remover espacios al inicio/final
}

/**
 * POST /api/messaging/activate-sms
 * ESTRATEGIA: Intentar Toll-Free primero (no requiere Bundle)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClientFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    const userProfileData = userProfile as any;
    
    if (!userProfileData?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener organización' },
        { status: 403 }
      );
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
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messaging/activate-sms
 * ESTRATEGIA: Intentar Toll-Free primero (no requiere Bundle)
 */
export async function POST(req: NextRequest) {
  try {
    // 1-3. Autenticación y validación (igual que antes)
    const supabase = createClientFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    const userProfileData = userProfile as any;
    
    if (!userProfileData?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener organización' },
        { status: 403 }
      );
    }
    
    const organizationId = userProfileData.organization_id;
    
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('id, name, country')
      .eq('id', organizationId)
      .single();
    
    const orgData = organization as any;
    
    if (!orgData) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }
    
    const countryCode = orgData.country?.toUpperCase() || 'MX';
    const countryInfo = LATAM_COUNTRIES[countryCode as keyof typeof LATAM_COUNTRIES];
    
    if (!countryInfo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'País no soportado para Toll-Free',
          details: `Actualmente solo soportamos: ${Object.keys(LATAM_COUNTRIES).join(', ')}`
        },
        { status: 400 }
      );
    }
    
    console.log(`🌍 [SMS Activation] País: ${countryInfo.name} (${countryCode})`);
    
    // Verificar si ya tiene SMS activado
    const { data: existingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_enabled, sms_twilio_number')
      .eq('organization_id', organizationId)
      .single();
    
    const existingConfigData = existingConfig as any;
    
    if (existingConfigData?.sms_enabled && existingConfigData?.sms_twilio_number) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMS ya está activado',
          data: { phone_number: existingConfigData.sms_twilio_number }
        },
        { status: 400 }
      );
    }
    
    // Verificar y limpiar credenciales de Twilio (remover \r\n que Vercel a veces agrega)
    const accountSid = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
    const authToken = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);
    
    if (!accountSid || !authToken) {
      console.error('❌ [SMS Activation] Variables de Twilio faltantes o vacías:', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        accountSidLength: accountSid?.length || 0,
        authTokenLength: authToken?.length || 0
      });
      return NextResponse.json(
        { success: false, error: 'Servicio SMS no configurado' },
        { status: 500 }
      );
    }
    
    // Validar formato de Account SID
    if (!accountSid.startsWith('AC')) {
      console.error('❌ [SMS Activation] Account SID con formato incorrecto:', {
        accountSid: accountSid.substring(0, 10) + '...',
        length: accountSid.length
      });
      return NextResponse.json(
        { success: false, error: 'Configuración de Twilio inválida' },
        { status: 500 }
      );
    }
    
    const twilioClient = twilio(accountSid, authToken);
    
    // Usar getAppUrl() que maneja automáticamente protocolo y limpieza
    const appUrl = getAppUrl();
    const webhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}`;
    const statusWebhookUrl = `${webhookUrl}/status`;
    
    console.log(`🔗 [SMS Activation] App URL: ${appUrl}`);
    console.log(`🔗 [SMS Activation] Webhook: ${webhookUrl}`);
    
    // ESTRATEGIA: TOLL-FREE PRIMERO (no requiere Bundle ni Address)
    let selectedNumber;
    
    try {
      console.log('🔍 [SMS Activation] Buscando números existentes...');
      const existingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 50 });
      
      console.log(`📋 [SMS Activation] Números existentes: ${existingNumbers.length}`);
      
      const countryPrefix = getCountryPhonePrefix(countryCode);
      const countryNumbers = existingNumbers.filter(num => 
        num.phoneNumber.startsWith(countryPrefix)
      );
      
      if (countryNumbers.length > 0) {
        // Usar número existente
        const firstNumber = countryNumbers[0];
        console.log(`✅ [SMS Activation] Usando número existente: ${firstNumber.phoneNumber}`);
        
        selectedNumber = await twilioClient.incomingPhoneNumbers(firstNumber.sid).update({
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST',
          friendlyName: `Eagles ERP - ${orgData.name}`
        });
        
      } else {
        // NO HAY NÚMEROS - INTENTAR COMPRAR TOLL-FREE
        console.log('📞 [SMS Activation] Buscando números TOLL-FREE (800)...');
        
        try {
          const tollFreeNumbers = await twilioClient
            .availablePhoneNumbers(countryCode)
            .tollFree
            .list({
              smsEnabled: true,
              limit: 20
            });
          
          if (tollFreeNumbers.length > 0) {
            console.log(`✅ [SMS Activation] Encontrados ${tollFreeNumbers.length} números Toll-Free`);
            console.log(`💡 [SMS Activation] Toll-Free NO requiere Bundle ni Address`);
            
            // Comprar número Toll-Free (SIN AddressSid, SIN BundleSid)
            selectedNumber = await twilioClient
              .incomingPhoneNumbers
              .create({
                phoneNumber: tollFreeNumbers[0].phoneNumber,
                friendlyName: `Eagles ERP - ${orgData.name}`,
                smsUrl: webhookUrl,
                smsMethod: 'POST',
                statusCallback: statusWebhookUrl,
                statusCallbackMethod: 'POST'
              });
            
            console.log(`✅ [SMS Activation] Número Toll-Free comprado: ${selectedNumber.phoneNumber}`);
            
          } else {
            // NO HAY TOLL-FREE - Intentar números locales como alternativa
            console.log('⚠️ [SMS Activation] No hay Toll-Free, intentando números locales...');
            
            try {
              const localNumbers = await twilioClient
                .availablePhoneNumbers(countryCode)
                .local
                .list({
                  smsEnabled: true,
                  limit: 10
                });
              
              if (localNumbers.length > 0) {
                console.log(`✅ [SMS Activation] Encontrados ${localNumbers.length} números locales`);
                console.log(`⚠️ [SMS Activation] NOTA: Números locales pueden requerir Regulatory Bundle`);
                
                // Intentar comprar número local (puede fallar si requiere Bundle)
                try {
                  selectedNumber = await twilioClient
                    .incomingPhoneNumbers
                    .create({
                      phoneNumber: localNumbers[0].phoneNumber,
                      friendlyName: `Eagles ERP - ${orgData.name}`,
                      smsUrl: webhookUrl,
                      smsMethod: 'POST',
                      statusCallback: statusWebhookUrl,
                      statusCallbackMethod: 'POST'
                    });
                  
                  console.log(`✅ [SMS Activation] Número local comprado: ${selectedNumber.phoneNumber}`);
                } catch (localError: any) {
                  // Si falla por Bundle, informar al usuario
                  if (localError.message?.includes('Bundle') || localError.message?.includes('Address')) {
                    throw new Error('Números locales requieren Regulatory Bundle. No hay números Toll-Free disponibles.');
                  }
                  throw localError;
                }
              } else {
                throw new Error('No hay números Toll-Free ni locales disponibles en este momento');
              }
            } catch (localError: any) {
              console.error('❌ [SMS Activation] Error con números locales:', localError);
              throw new Error('No hay números disponibles (ni Toll-Free ni locales)');
            }
          }
          
        } catch (tollFreeError: any) {
          console.error('❌ [SMS Activation] Error con Toll-Free:', tollFreeError);
          
          return NextResponse.json(
            { 
              success: false,
              error: 'No hay números disponibles',
              details: tollFreeError.message || 'Los números Toll-Free (800) no están disponibles temporalmente.',
              solution: 'Por favor intenta de nuevo más tarde o contacta a soporte.',
              alternativa: 'Puedes crear un Regulatory Bundle en Twilio para usar números mobile.',
              bundleUrl: 'https://console.twilio.com/us1/develop/compliance/bundles',
              country: countryInfo.name,
              country_code: countryCode
            },
            { status: 503 }
          );
        }
      }
      
    } catch (error: any) {
      console.error('❌ [SMS Activation] Error general:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al obtener número',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    // Verificar que selectedNumber existe
    if (!selectedNumber || !selectedNumber.phoneNumber || !selectedNumber.sid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No se pudo obtener número válido'
        },
        { status: 500 }
      );
    }
    
    // Guardar configuración en BD
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
      console.error('❌ [SMS Activation] Error guardando:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Error al guardar configuración' },
        { status: 500 }
      );
    }
    
    console.log(`✅ [SMS Activation] SUCCESS - ${countryInfo.name} - org ${organizationId}`);
    
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
          per_sms_mxn: countryInfo.perSMS
        },
        activated_at: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ [SMS Activation] Error inesperado:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error inesperado',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function getCountryPhonePrefix(countryCode: string): string {
  const prefixes: Record<string, string> = {
    'MX': '+52', 'CO': '+57', 'AR': '+54', 'CL': '+56',
    'PE': '+51', 'BR': '+55', 'EC': '+593', 'UY': '+598',
    'CR': '+506', 'PA': '+507', 'GT': '+502', 'SV': '+503',
    'HN': '+504', 'NI': '+505', 'BO': '+591', 'PY': '+595', 'VE': '+58',
  };
  return prefixes[countryCode] || '+52';
}

