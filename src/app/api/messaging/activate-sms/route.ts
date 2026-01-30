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
 * Genera datos de dirección válidos para Twilio según el país
 */
function getDefaultAddressForCountry(
  countryCode: string, 
  orgData?: { name?: string; address?: string; city?: string }
) {
  const defaults: Record<string, any> = {
    'MX': {
      city: 'Ciudad de México',
      region: 'CDMX',
      postalCode: '01000',
      street: 'Av. Insurgentes Sur 1602'
    },
    'CO': {
      city: 'Bogotá',
      region: 'Cundinamarca',
      postalCode: '110111',
      street: 'Cra. 7 #32-16'
    },
    'AR': {
      city: 'Buenos Aires',
      region: 'CABA',
      postalCode: 'C1426',
      street: 'Av. Corrientes 1234'
    },
    'CL': {
      city: 'Santiago',
      region: 'Región Metropolitana',
      postalCode: '8320000',
      street: 'Av. Libertador Bernardo O\'Higgins 1234'
    },
    'PE': {
      city: 'Lima',
      region: 'Lima',
      postalCode: '15001',
      street: 'Av. Javier Prado Este 1234'
    },
    'BR': {
      city: 'São Paulo',
      region: 'SP',
      postalCode: '01310-100',
      street: 'Avenida Paulista, 1578'
    },
    'EC': {
      city: 'Quito',
      region: 'Pichincha',
      postalCode: '170150',
      street: 'Av. Amazonas N24-03'
    },
    'UY': {
      city: 'Montevideo',
      region: 'Montevideo',
      postalCode: '11000',
      street: 'Av. 18 de Julio 1234'
    },
    'CR': {
      city: 'San José',
      region: 'San José',
      postalCode: '10101',
      street: 'Avenida Central, Calle 1'
    },
    'PA': {
      city: 'Ciudad de Panamá',
      region: 'Panamá',
      postalCode: '0801',
      street: 'Av. Balboa 1234'
    },
    'GT': {
      city: 'Ciudad de Guatemala',
      region: 'Guatemala',
      postalCode: '01001',
      street: 'Av. Reforma 1-47'
    },
    'SV': {
      city: 'San Salvador',
      region: 'San Salvador',
      postalCode: '1101',
      street: 'Av. Cuscatlán 1234'
    },
    'HN': {
      city: 'Tegucigalpa',
      region: 'Francisco Morazán',
      postalCode: '11101',
      street: 'Blvd. Morazán 1234'
    },
    'NI': {
      city: 'Managua',
      region: 'Managua',
      postalCode: '11000',
      street: 'Av. Bolívar 1234'
    },
    'BO': {
      city: 'La Paz',
      region: 'La Paz',
      postalCode: '0001',
      street: 'Av. Mariscal Santa Cruz 1234'
    },
    'PY': {
      city: 'Asunción',
      region: 'Asunción',
      postalCode: '1000',
      street: 'Av. Mariscal López 1234'
    },
    'VE': {
      city: 'Caracas',
      region: 'Distrito Capital',
      postalCode: '1010',
      street: 'Av. Francisco de Miranda 1234'
    }
  };
  
  const defaultData = defaults[countryCode] || defaults['MX'];
  
  return {
    customerName: orgData?.name || 'Eagles ERP',
    street: orgData?.address || defaultData.street,
    city: orgData?.city || defaultData.city,
    region: defaultData.region,
    postalCode: defaultData.postalCode
  };
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
          let numberType: 'local' | 'mobile' = 'local';
          
          // Intentar primero con números local (preferidos, no requieren Bundle)
          try {
            const localNumbers = await twilioClient
              .availablePhoneNumbers(countryCode)
              .local
              .list({
                smsEnabled: true,
                limit: 20
              });
            
            if (localNumbers && localNumbers.length > 0) {
              availableNumbers = localNumbers;
              numberType = 'local';
              console.log(`✅ [SMS Activation] Encontrados ${localNumbers.length} números LOCAL en ${countryInfo.name}`);
            }
          } catch (localError: any) {
            console.log(`⚠️ [SMS Activation] No hay números local en ${countryInfo.name}:`, localError.message);
          }
          
          // Si no hay local, intentar mobile (pueden requerir Bundle)
          if (availableNumbers.length === 0) {
            try {
              const mobileNumbers = await twilioClient
                .availablePhoneNumbers(countryCode)
                .mobile
                .list({
                  smsEnabled: true,
                  limit: 20
                });
              
              if (mobileNumbers && mobileNumbers.length > 0) {
                availableNumbers = mobileNumbers;
                numberType = 'mobile';
                console.log(`⚠️ [SMS Activation] Encontrados ${mobileNumbers.length} números MOBILE en ${countryInfo.name} (pueden requerir Bundle)`);
              }
            } catch (mobileError: any) {
              console.log(`⚠️ [SMS Activation] No hay números mobile en ${countryInfo.name}:`, mobileError.message);
            }
          }
          
          if (availableNumbers.length === 0) {
            throw new Error(`No hay números disponibles en ${countryInfo.name}`);
          }
          
          console.log(`✅ [SMS Activation] Encontrados ${availableNumbers.length} números ${numberType.toUpperCase()} en ${countryInfo.name}`);
          
          // CRÍTICO: Crear o obtener dirección registrada en Twilio
          let addressSid: string | undefined;
          
          try {
            // Buscar si ya tenemos una dirección registrada en BD
            const { data: existingConfigAddress } = await supabaseAdmin
              .from('organization_messaging_config')
              .select('sms_twilio_address_sid')
              .eq('organization_id', organizationId)
              .single();
            
            if ((existingConfigAddress as any)?.sms_twilio_address_sid) {
              addressSid = (existingConfigAddress as any).sms_twilio_address_sid;
              console.log(`✅ [SMS Activation] Usando dirección existente: ${addressSid}`);
            } else {
              // Crear nueva dirección en Twilio
              console.log('📮 [SMS Activation] Creando dirección en Twilio...');
              
              // Obtener datos adicionales de la organización desde BD
              const { data: orgFullData } = await supabaseAdmin
                .from('organizations')
                .select('address, name, city')
                .eq('id', organizationId)
                .single();
              
              // Generar datos de dirección según el país
              const addressData = getDefaultAddressForCountry(countryCode, {
                name: orgData.name,
                address: (orgFullData as any)?.address,
                city: (orgFullData as any)?.city
              });
              
              const twilioAddress = await twilioClient.addresses.create({
                customerName: addressData.customerName,
                street: addressData.street,
                city: addressData.city,
                region: addressData.region,
                postalCode: addressData.postalCode,
                isoCountry: countryCode,
                friendlyName: `Eagles ERP - ${orgData.name}`
              });
              
              addressSid = twilioAddress.sid;
              console.log(`✅ [SMS Activation] Dirección creada: ${addressSid}`);
              
              // Intentar guardar AddressSid en BD (si el campo existe)
              try {
                await supabaseAdmin
                  .from('organization_messaging_config')
                  .upsert({
                    organization_id: organizationId,
                    sms_twilio_address_sid: addressSid,
                    updated_at: new Date().toISOString()
                  } as any, {
                    onConflict: 'organization_id'
                  });
                console.log('✅ [SMS Activation] AddressSid guardado en BD');
              } catch (dbError: any) {
                // Si el campo no existe, solo loguear (no es crítico)
                console.log('⚠️ [SMS Activation] No se pudo guardar AddressSid (campo puede no existir):', dbError.message);
              }
            }
          } catch (addressError: any) {
            console.error('⚠️ [SMS Activation] Error con dirección:', addressError);
            // Continuar sin dirección (algunos números no la requieren)
            // Algunos países pueden no requerir dirección para números SMS
            console.log('⚠️ [SMS Activation] Continuando sin dirección (puede no ser requerida)');
          }
          
          // Comprar número CON dirección (si existe)
          const purchaseParams: any = {
            phoneNumber: availableNumbers[0].phoneNumber,
            friendlyName: `Eagles ERP - ${orgData.name}`,
            smsUrl: webhookUrl,
            smsMethod: 'POST',
            statusCallback: statusWebhookUrl,
            statusCallbackMethod: 'POST'
          };
          
          // Agregar AddressSid si existe (requerido para algunos países)
          if (addressSid) {
            purchaseParams.addressSid = addressSid;
            console.log(`📮 [SMS Activation] Comprando número con dirección: ${addressSid}`);
          }
          
          try {
            selectedNumber = await twilioClient
              .incomingPhoneNumbers
              .create(purchaseParams);
            
            console.log(`✅ [SMS Activation] Número comprado: ${selectedNumber.phoneNumber}`);
          } catch (purchaseError: any) {
            // Error específico: Bundle requerido para números MOBILE en México
            if (purchaseError.code === 21649) {
              return NextResponse.json(
                { 
                  success: false,
                  error: 'Bundle requerido para números MOBILE',
                  details: `Los números MOBILE en ${countryInfo.name} requieren un Bundle (paquete de verificación regulatoria) de Twilio.`,
                  solution: 'Para comprar números MOBILE, necesitas crear un Bundle en Twilio Console. Alternativamente, intenta con números LOCAL que no requieren Bundle.',
                  country: countryInfo.name,
                  numberType: 'mobile',
                  code: purchaseError.code,
                  twilioBundleDocs: 'https://www.twilio.com/docs/phone-numbers/regulatory/bundles',
                  twilioConsole: 'https://console.twilio.com/us1/develop/phone-numbers/manage/regulatory/bundles'
                },
                { status: 400 }
              );
            }
            
            // Re-lanzar otros errores para que se manejen en el catch externo
            throw purchaseError;
          }
          
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
          
          // Error de Bundle ya manejado arriba, pero por si acaso
          if (twilioError.code === 21649) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Bundle requerido para números MOBILE',
                details: `Los números MOBILE en ${countryInfo.name} requieren un Bundle (paquete de verificación regulatoria) de Twilio.`,
                solution: 'Para comprar números MOBILE, necesitas crear un Bundle en Twilio Console. Alternativamente, intenta con números LOCAL que no requieren Bundle.',
                country: countryInfo.name,
                numberType: 'mobile',
                code: twilioError.code,
                twilioBundleDocs: 'https://www.twilio.com/docs/phone-numbers/regulatory/bundles',
                twilioConsole: 'https://console.twilio.com/us1/develop/phone-numbers/manage/regulatory/bundles'
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

