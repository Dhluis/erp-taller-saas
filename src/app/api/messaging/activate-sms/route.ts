import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getTwilioClient } from '@/lib/messaging/twilio-client';

// Mapeo de países latinoamericanos soportados
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
  PA: { name: 'Panamá', code: 'PA', monthlyCost: 2.00, perSMS: 0.20 },
  GT: { name: 'Guatemala', code: 'GT', monthlyCost: 2.00, perSMS: 0.25 },
  SV: { name: 'El Salvador', code: 'SV', monthlyCost: 2.00, perSMS: 0.22 },
  HN: { name: 'Honduras', code: 'HN', monthlyCost: 2.00, perSMS: 0.24 },
  NI: { name: 'Nicaragua', code: 'NI', monthlyCost: 2.00, perSMS: 0.26 },
  BO: { name: 'Bolivia', code: 'BO', monthlyCost: 2.00, perSMS: 0.28 },
  PY: { name: 'Paraguay', code: 'PY', monthlyCost: 2.00, perSMS: 0.27 },
  VE: { name: 'Venezuela', code: 'VE', monthlyCost: 2.00, perSMS: 0.30 },
};

/**
 * Obtiene el prefijo telefónico del país
 */
function getCountryPhonePrefix(countryCode: string): string {
  const prefixes: Record<string, string> = {
    'MX': '+52',
    'CO': '+57',
    'AR': '+54',
    'CL': '+56',
    'PE': '+51',
    'BR': '+55',
    'EC': '+593',
    'UY': '+598',
    'CR': '+506',
    'PA': '+507',
    'GT': '+502',
    'SV': '+503',
    'HN': '+504',
    'NI': '+505',
    'BO': '+591',
    'PY': '+595',
    'VE': '+58',
  };
  
  return prefixes[countryCode] || '+52';
}

/**
 * GET /api/messaging/activate-sms
 * Obtiene el estado de activación de SMS con información del país
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // 2. Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profileError || !userProfile || !(userProfile as any).organization_id) {
      console.error('[GET /api/messaging/activate-sms] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener organización' },
        { status: 403 }
      );
    }
    
    const userProfileData = userProfile as any;
    
    // 3. Obtener país de la organización
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('country')
      .eq('id', userProfileData.organization_id)
      .single();
    
    const countryCode = (org as any)?.country?.toUpperCase() || 'MX';
    const countryInfo = LATAM_COUNTRIES[countryCode as keyof typeof LATAM_COUNTRIES];
    
    // 4. Obtener configuración de SMS
    const { data: config, error: configError } = await supabaseAdmin
      .from('organization_messaging_config')
      .select(`
        sms_enabled,
        sms_from_number,
        sms_twilio_phone_sid,
        sms_webhook_url,
        sms_auto_notifications,
        sms_notification_statuses,
        updated_at,
        created_at
      `)
      .eq('organization_id', userProfileData.organization_id)
      .single();
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('❌ [GET /api/messaging/activate-sms] Error obteniendo configuración:', configError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener configuración', details: configError.message },
        { status: 500 }
      );
    }
    
    const configData = config as any;
    
    // 5. Retornar estado con información del país
    return NextResponse.json({
      success: true,
      data: {
        enabled: configData?.sms_enabled || false,
        phoneNumber: configData?.sms_from_number || null,
        phoneSid: configData?.sms_twilio_phone_sid || null,
        webhookUrl: configData?.sms_webhook_url || null,
        autoNotifications: configData?.sms_auto_notifications || false,
        notificationStatuses: configData?.sms_notification_statuses || ['completed', 'ready'],
        activatedAt: configData?.updated_at || configData?.created_at || null,
        country: countryInfo?.name || null,
        country_code: countryCode,
        // Costos del país (o defaults si no hay país configurado)
        costs: countryInfo ? {
          monthlyUsd: countryInfo.monthlyCost,
          perSmsMxn: countryInfo.perSMS
        } : {
          monthlyUsd: 1.0,
          perSmsMxn: 0.15
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ [GET /api/messaging/activate-sms] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado de SMS', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messaging/activate-sms
 * 
 * Activa SMS para cualquier país de Latinoamérica:
 * 1. Detecta el país de la organización
 * 2. Busca números existentes en Twilio de ese país
 * 3. Si no hay, intenta comprar uno del país correspondiente
 * 4. Configura webhooks
 * 5. Guarda configuración en BD
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // 2. Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, email')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profileError || !userProfile || !(userProfile as any).organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener organización' },
        { status: 403 }
      );
    }
    
    const organizationId = (userProfile as any).organization_id;
    
    // 3. Obtener datos de la organización (incluyendo país)
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, country')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }
    
    const orgData = organization as any;
    
    // 4. Determinar país (default México si no está configurado)
    const countryCode = orgData.country?.toUpperCase() || 'MX';
    const countryInfo = LATAM_COUNTRIES[countryCode as keyof typeof LATAM_COUNTRIES];
    
    if (!countryInfo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'País no soportado',
          details: `El país ${countryCode} no está disponible para SMS. Países soportados: ${Object.keys(LATAM_COUNTRIES).join(', ')}`
        },
        { status: 400 }
      );
    }
    
    console.log(`🌍 [SMS Activation] País detectado: ${countryInfo.name} (${countryCode})`);
    
    // 5. Verificar que no tenga SMS ya activado
    const { data: existingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_enabled, sms_from_number')
      .eq('organization_id', organizationId)
      .single();
    
    if ((existingConfig as any)?.sms_enabled && (existingConfig as any)?.sms_from_number) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMS ya está activado',
          data: {
            phone_number: (existingConfig as any).sms_from_number,
            country: countryInfo.name
          }
        },
        { status: 400 }
      );
    }
    
    // 6. Verificar credenciales de Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ [SMS Activation] Twilio credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Servicio SMS no configurado' },
        { status: 500 }
      );
    }
    
    // 7. Inicializar cliente Twilio
    const twilioClient = getTwilioClient();
    
    // 8. Configurar webhook URL
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io';
    
    // Si no tiene protocolo, agregarlo
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }
    
    // Si VERCEL_URL está disponible y no hay NEXT_PUBLIC_APP_URL, usarlo
    if (!process.env.NEXT_PUBLIC_APP_URL && process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    }
    
    const webhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}`;
    const statusWebhookUrl = `${webhookUrl}/status`;
    
    console.log(`🔗 [SMS Activation] Webhook URL: ${webhookUrl}`);
    
    // 9. Buscar números existentes en Twilio (del país correspondiente)
    let selectedNumber;
    
    try {
      console.log('🔍 [SMS Activation] Buscando números existentes en cuenta Twilio...');
      const existingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 50 });
      
      console.log(`📋 [SMS Activation] Números existentes encontrados: ${existingNumbers.length}`);
      
      // Filtrar números del país de la organización
      const countryPrefix = getCountryPhonePrefix(countryCode);
      const countryNumbers = existingNumbers.filter(num => {
        // Los números vienen en formato E.164, ejemplo: +52... para México
        return num.phoneNumber.startsWith(countryPrefix);
      });
      
      console.log(`📱 [SMS Activation] Números de ${countryInfo.name}: ${countryNumbers.length}`);
      
      if (countryNumbers.length > 0) {
        // USAR NÚMERO EXISTENTE DEL MISMO PAÍS
        const firstNumber = countryNumbers[0];
        console.log(`✅ [SMS Activation] Usando número existente: ${firstNumber.phoneNumber}`);
        
        try {
          selectedNumber = await twilioClient.incomingPhoneNumbers(firstNumber.sid).update({
            smsUrl: webhookUrl,
            smsMethod: 'POST',
            statusCallback: statusWebhookUrl,
            statusCallbackMethod: 'POST',
            friendlyName: `Eagles ERP - ${orgData.name}`
          });
          
          console.log('✅ [SMS Activation] Webhooks configurados en número existente');
        } catch (updateError: any) {
          console.error('⚠️ [SMS Activation] Error actualizando webhooks:', updateError);
          // Continuar con el número aunque falle la actualización
          selectedNumber = firstNumber;
        }
      } else {
        // NO HAY NÚMEROS DEL PAÍS - INTENTAR COMPRAR
        console.log(`📱 [SMS Activation] Intentando comprar número en ${countryInfo.name}...`);
        
        try {
          let availableNumbers: any[] = [];
          
          // Intentar primero con números local
          try {
            const localNumbers = await twilioClient
              .availablePhoneNumbers(countryCode)
              .local
              .list({
                smsEnabled: true,
                limit: 20
              });
            availableNumbers = localNumbers;
          } catch (localError: any) {
            console.log(`⚠️ [SMS Activation] No hay números local en ${countryInfo.name}, intentando mobile...`);
          }
          
          // Si no hay local, intentar mobile
          if (availableNumbers.length === 0) {
            try {
              const mobileNumbers = await twilioClient
                .availablePhoneNumbers(countryCode)
                .mobile
                .list({
                  smsEnabled: true,
                  limit: 20
                });
              availableNumbers = mobileNumbers;
            } catch (mobileError: any) {
              console.log(`⚠️ [SMS Activation] No hay números mobile en ${countryInfo.name}`);
            }
          }
          
          if (availableNumbers.length === 0) {
            throw new Error(`No hay números disponibles en ${countryInfo.name}`);
          }
          
          console.log(`✅ [SMS Activation] Encontrados ${availableNumbers.length} números en ${countryInfo.name}`);
          
          // Comprar número
          selectedNumber = await twilioClient
            .incomingPhoneNumbers
            .create({
              phoneNumber: availableNumbers[0].phoneNumber,
              friendlyName: `Eagles ERP - ${orgData.name}`,
              smsUrl: webhookUrl,
              smsMethod: 'POST',
              statusCallback: statusWebhookUrl,
              statusCallbackMethod: 'POST'
            });
          
          console.log(`✅ [SMS Activation] Número comprado: ${selectedNumber.phoneNumber}`);
          
        } catch (twilioError: any) {
          console.error('❌ [SMS Activation] Error al comprar número:', twilioError);
          
          // Errores específicos
          if (twilioError.code === 21450 || twilioError.code === 21421 || twilioError.code === 21404) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Límite de números alcanzado',
                details: 'Tu cuenta de Twilio ha alcanzado el límite de números.',
                solution: 'Actualiza tu cuenta de Twilio a un plan superior en: https://console.twilio.com/billing',
                country: countryInfo.name,
                code: twilioError.code
              },
              { status: 400 }
            );
          }
          
          if (twilioError.message?.includes('No hay números disponibles') || 
              twilioError.message?.includes('no phone numbers')) {
            return NextResponse.json(
              { 
                success: false,
                error: 'No hay números disponibles',
                details: `Twilio no tiene números de ${countryInfo.name} disponibles en este momento.`,
                solution: 'Intenta de nuevo más tarde o contacta a soporte de Twilio.',
                country: countryInfo.name,
                twilioSupport: 'https://support.twilio.com'
              },
              { status: 503 }
            );
          }
          
          throw twilioError;
        }
      }
    } catch (error: any) {
      console.error('❌ [SMS Activation] Error en búsqueda/compra:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al obtener número de Twilio',
          details: error.message,
          country: countryInfo.name
        },
        { status: 500 }
      );
    }
    
    // 10. Verificar que selectedNumber existe
    if (!selectedNumber || !selectedNumber.phoneNumber || !selectedNumber.sid) {
      console.error('❌ [SMS Activation] No se pudo obtener número válido');
      return NextResponse.json(
        { 
          success: false,
          error: 'No se pudo obtener número de teléfono',
          details: `No hay números disponibles en ${countryInfo.name}`,
          country: countryInfo.name
        },
        { status: 500 }
      );
    }

    // 11. Guardar configuración en BD (UPSERT) con costos del país
    const updates = {
      sms_enabled: true,
      sms_from_number: selectedNumber.phoneNumber,
      sms_twilio_phone_sid: selectedNumber.sid,
      sms_webhook_url: webhookUrl,
      sms_auto_notifications: true,
      sms_notification_statuses: ['completed', 'ready'],
      updated_at: new Date().toISOString(),
    };

    // Intentar update primero, si no existe, hacer insert
    let updateError;

    const { data: updateData, error: updateErr } = await (supabaseAdmin as any)
      .from('organization_messaging_config')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single();

    updateError = updateErr;

    // Si no existe la configuración, crearla
    if (updateError && updateError.code === 'PGRST116') {
      console.log('📝 [SMS Activation] Creando nueva configuración...');
      const insertPayload = {
        organization_id: organizationId,
        ...updates,
      };
      
      const { data: insertData, error: insertError } = await (supabaseAdmin as any)
        .from('organization_messaging_config')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        updateError = insertError;
      } else {
        updateError = null;
      }
    }

    if (updateError) {
      console.error('❌ [SMS Activation] Error guardando configuración:', updateError);
      
      // No liberar el número (puede ser existente)
      console.log('⚠️ [SMS Activation] Número no se liberará (puede ser existente)');
      
      return NextResponse.json(
        { success: false, error: 'Error al guardar configuración' },
        { status: 500 }
      );
    }
    
    console.log(`✅ [SMS Activation] SMS activado exitosamente para ${countryInfo.name} - org ${organizationId}`);
    
    // 12. Retornar respuesta exitosa con información del país
    return NextResponse.json({
      success: true,
      message: 'SMS activado correctamente',
      data: {
        phone_number: selectedNumber.phoneNumber,
        sid: selectedNumber.sid,
        country: countryInfo.name,
        country_code: countryCode,
        webhook_url: webhookUrl,
        friendly_name: selectedNumber.friendlyName,
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
    console.error('❌ [POST /api/messaging/activate-sms] Error inesperado:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error inesperado al activar SMS',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

