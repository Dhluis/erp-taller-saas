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
 * Área codes principales por país para búsqueda de números
 * Organizado por ciudades principales para maximizar disponibilidad
 */
const AREA_CODES_BY_COUNTRY: Record<string, string[]> = {
  MX: ['55', '33', '81', '442', '222', '656', '662', '664', '477', '449'],  // CDMX, GDL, MTY, AGS, Puebla, Juárez, Hermosillo, Tijuana, León, SLP
  CO: ['1', '4', '5', '2', '7', '6'],  // Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena
  AR: ['11', '351', '261', '341', '221', '223'],  // Buenos Aires, Córdoba, Mendoza, Rosario, La Plata, Mar del Plata
  CL: ['2', '32', '41', '42', '51', '55'],  // Santiago, Valparaíso, Concepción, Puerto Montt, Iquique, Antofagasta
  PE: ['1', '54', '44', '74', '76', '84'],  // Lima, Arequipa, Trujillo, Iquitos, Chiclayo, Cusco
  BR: ['11', '21', '31', '41', '51', '61', '71', '85'],  // São Paulo, Rio, Belo Horizonte, Curitiba, Porto Alegre, Brasília, Salvador, Fortaleza
  EC: ['2', '4', '7', '5', '3', '6'],  // Quito, Guayaquil, Cuenca, Ambato, Loja, Riobamba
  UY: ['2', '4', '43', '45', '46', '47'],  // Montevideo, Interior Norte, Interior Sur, Interior Este, Interior Oeste, Zona Litoral
  CR: ['2', '4', '6', '7', '8'],  // San José, Heredia, Alajuela, Cartago, Puntarenas
};

/**
 * Mapeo de países a Bundle SIDs de Twilio
 * Cada país requiere su propio Regulatory Bundle
 * Configurar en variables de entorno: TWILIO_REGULATORY_BUNDLE_MX, TWILIO_REGULATORY_BUNDLE_CO, etc.
 */
function getBundleSidForCountry(countryCode: string): string | null {
  const bundleEnvVar = `TWILIO_REGULATORY_BUNDLE_${countryCode.toUpperCase()}`;
  const bundleSid = cleanEnvVar(process.env[bundleEnvVar]);
  
  // Fallback al Bundle genérico si existe (para compatibilidad)
  if (!bundleSid) {
    return cleanEnvVar(process.env.TWILIO_REGULATORY_BUNDLE_SID);
  }
  
  return bundleSid;
}

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
    
    const userProfileData = userProfile as { organization_id: string } | null;
    
    if (!userProfileData?.organization_id) {
      return NextResponse.json({ success: false, error: 'No se pudo obtener organización' }, { status: 403 });
    }
    
    const organizationId = userProfileData.organization_id;
    
    // 2. Obtener datos de la organización
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('id, name, country, address, phone, email')
      .eq('id', organizationId)
      .single();
    
    const orgData = organization as { id: string; name: string; country?: string; address?: string; phone?: string; email?: string; city?: string } | null;
    
    if (!orgData) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 404 });
    }
    
    const countryCode = orgData.country?.toUpperCase() || 'MX';
    const countryInfo = LATAM_COUNTRIES[countryCode as keyof typeof LATAM_COUNTRIES];
    
    if (!countryInfo) {
      return NextResponse.json({ 
        success: false, 
        error: 'País no soportado',
        details: `Países disponibles: ${Object.keys(LATAM_COUNTRIES).join(', ')}`
      }, { status: 400 });
    }
    
    console.log(`🌍 [SMS Activation] País: ${countryInfo.name} (${countryCode})`);
    console.log(`🏢 [SMS Activation] Organización: ${orgData.name}`);
    
    // 3. Verificar si ya tiene SMS activado
    const { data: existingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_enabled, sms_twilio_number, sms_twilio_sid')
      .eq('organization_id', organizationId)
      .single();
    
    const configData = existingConfig as { sms_enabled?: boolean; sms_twilio_number?: string; sms_twilio_sid?: string } | null;
    
    if (configData?.sms_enabled && configData?.sms_twilio_number) {
      console.log(`ℹ️ [SMS Activation] Ya tiene SMS: ${configData.sms_twilio_number}`);
      return NextResponse.json({ 
        success: false, 
        error: 'SMS ya está activado',
        data: { 
          phone_number: configData.sms_twilio_number,
          sid: configData.sms_twilio_sid
        }
      }, { status: 400 });
    }
    
    // 4. Validar credenciales y Bundle (limpiar variables de entorno)
    const accountSid = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
    const authToken = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);
    
    // Obtener Bundle SID específico para el país de la organización
    const bundleEnvVar = `TWILIO_REGULATORY_BUNDLE_${countryCode.toUpperCase()}`;
    
    // 🔍 DEBUG: Verificar variables de entorno disponibles
    console.log(`🔍 [Activate SMS] DEBUG - Verificando variables de entorno...`);
    console.log(`🔍 [Activate SMS] DEBUG - País: ${countryCode}`);
    console.log(`🔍 [Activate SMS] DEBUG - Variable buscada: ${bundleEnvVar}`);
    console.log(`🔍 [Activate SMS] DEBUG - Variable existe: ${!!process.env[bundleEnvVar]}`);
    console.log(`🔍 [Activate SMS] DEBUG - Variable valor (primeros 10 chars): ${process.env[bundleEnvVar]?.substring(0, 10) || 'NO DEFINIDA'}`);
    console.log(`🔍 [Activate SMS] DEBUG - TWILIO_REGULATORY_BUNDLE_SID existe: ${!!process.env.TWILIO_REGULATORY_BUNDLE_SID}`);
    
    // Listar todas las variables que empiezan con TWILIO_REGULATORY_BUNDLE
    const allTwilioVars = Object.keys(process.env).filter(key => key.startsWith('TWILIO_REGULATORY_BUNDLE'));
    console.log(`🔍 [Activate SMS] DEBUG - Variables TWILIO_REGULATORY_BUNDLE encontradas: ${allTwilioVars.join(', ') || 'NINGUNA'}`);
    
    const bundleSid = getBundleSidForCountry(countryCode);
    
    console.log(`🔍 [Activate SMS] DEBUG - Bundle SID obtenido: ${bundleSid ? bundleSid.substring(0, 10) + '...' : 'NULL'}`);
    
    if (!accountSid || !authToken) {
      return NextResponse.json({ success: false, error: 'Servicio SMS no configurado' }, { status: 500 });
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
    
    // 5. Verificar estado del Bundle (CRÍTICO: debe estar aprobado)
    console.log('🔍 [Activate SMS] Verificando Regulatory Bundle...');
    
    let bundleStatus = 'not_configured';
    let bundleInfo: any = null;
    let addressSid: string | null = null;
    
    if (!bundleSid) {
      console.error(`❌ [Activate SMS] TWILIO_REGULATORY_BUNDLE_${countryCode} no configurado`);
      return NextResponse.json({
        success: false,
        error: 'Regulatory Bundle no configurado',
        details: `Variable TWILIO_REGULATORY_BUNDLE_${countryCode} no encontrada`,
        country: countryInfo.name,
        country_code: countryCode,
        instructions: {
          step1: 'Crear Regulatory Bundle en Twilio Console',
          step1_url: 'https://console.twilio.com/us1/develop/compliance/bundles',
          step2: `Configurar variable de entorno: TWILIO_REGULATORY_BUNDLE_${countryCode}`,
          step2_value: 'BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Bundle SID de Twilio)',
          step3: 'En Vercel: Settings → Environment Variables → Add',
          step4: 'Redeploy la aplicación después de agregar la variable',
          documentation: '/docs/twilio/GUIA_PASO_A_PASO_BUNDLE.md'
        },
        alternative: 'Puedes usar números Toll-Free sin Bundle, pero tienen limitaciones'
      }, { status: 500 });
    }
    
    console.log('📦 [Activate SMS] Bundle SID:', bundleSid);
    
    // Verificar estado del bundle
    try {
      console.log('📋 [Activate SMS] Obteniendo información del Bundle...');
      const bundle = await twilioClient.numbers.v2
        .regulatoryCompliance
        .bundles(bundleSid)
        .fetch();
      
      bundleStatus = bundle.status || 'unknown';
      bundleInfo = {
        sid: bundle.sid,
        friendlyName: bundle.friendlyName,
        status: bundle.status,
        statusCallback: bundle.statusCallback,
        dateCreated: bundle.dateCreated,
        dateUpdated: bundle.dateUpdated,
        url: bundle.url
      };
      
      console.log('📊 [Activate SMS] Bundle status:', bundleStatus);
      console.log('📋 [Activate SMS] Bundle friendly name:', bundle.friendlyName);
      
      const bundleStatusValue = bundle.status as string;
      if (bundleStatusValue !== 'approved' && bundleStatusValue !== 'twilio-approved') {
        console.error('❌ [Activate SMS] Bundle no está aprobado:', bundle.status);
        return NextResponse.json({
          success: false,
          error: `Regulatory Bundle no está aprobado (Status: ${bundle.status})`,
          details: 'El Bundle debe estar en estado "approved" o "twilio-approved" para comprar números locales',
          bundle_status: bundle.status,
          bundle_sid: bundleSid
        }, { status: 400 });
      }
      
      console.log('✅ [Activate SMS] Bundle aprobado, continuando...');
      
      // Obtener AddressSid del Bundle para números que lo requieran
      try {
        console.log('📍 [Activate SMS] Obteniendo direcciones del Bundle...');
        
        const bundleAddresses = await twilioClient.numbers.v2
          .regulatoryCompliance
          .bundles(bundleSid)
          .itemAssignments
          .list({ limit: 20 });
        
        // Buscar el Address asignado al Bundle
        const addressAssignment = bundleAddresses.find(item => 
          item.objectSid && item.objectSid.startsWith('AD')
        );
        
        if (addressAssignment && addressAssignment.objectSid) {
          addressSid = addressAssignment.objectSid;
          console.log('✅ [Activate SMS] Address SID obtenido:', addressSid);
        } else {
          console.log('⚠️ [Activate SMS] No se encontró Address en el Bundle');
          console.log('📋 [Activate SMS] Item assignments:', bundleAddresses.map(i => ({
            sid: i.sid,
            objectSid: i.objectSid
          })));
          
          // Crear Address automáticamente usando datos de la organización
          console.log('🏗️ [Activate SMS] Creando Address desde datos de la organización...');
          
          try {
            // Validar que tengamos los datos necesarios
            if (!orgData?.address || !orgData?.name) {
              throw new Error('La organización necesita tener dirección y nombre configurados');
            }
            
            // Crear Address en Twilio
            console.log('📝 [Activate SMS] Datos de la organización:', {
              name: orgData.name,
              address: orgData.address,
              country: countryCode
            });
            
            const newAddress = await twilioClient.addresses.create({
              customerName: orgData.name,
              street: orgData.address,
              city: 'Ciudad', // Twilio requiere ciudad, usar placeholder si no existe
              region: countryCode === 'MX' ? 'AGS' : 'N/A', // Estado/Región
              postalCode: '20000', // Placeholder, Twilio lo requiere
              isoCountry: countryCode,
              autoCorrectAddress: true, // Twilio auto-corrige formato
              friendlyName: `${orgData.name} - Auto-created for SMS`
            });
            
            addressSid = newAddress.sid;
            console.log('✅ [Activate SMS] Address creado:', addressSid);
            console.log('📋 [Activate SMS] Address details:', {
              sid: newAddress.sid,
              street: newAddress.street,
              city: newAddress.city,
              region: newAddress.region,
              country: newAddress.isoCountry
            });
            
            // Asignar Address al Bundle
            console.log('🔗 [Activate SMS] Asignando Address al Bundle...');
            
            const assignment = await twilioClient.numbers.v2
              .regulatoryCompliance
              .bundles(bundleSid)
              .itemAssignments
              .create({
                objectSid: addressSid
              });
            
            console.log('✅ [Activate SMS] Address asignado al Bundle:', assignment.sid);
            
            // Enviar Bundle para re-evaluación (Twilio lo re-aprueba automáticamente)
            console.log('📤 [Activate SMS] Re-evaluando Bundle con nuevo Address...');
            
            await twilioClient.numbers.v2
              .regulatoryCompliance
              .bundles(bundleSid)
              .update({
                status: 'pending-review'
              });
            
            console.log('✅ [Activate SMS] Bundle actualizado, continuando con compra...');
            
          } catch (createAddressError: any) {
            console.error('❌ [Activate SMS] Error creando/asignando Address:', createAddressError);
            console.error('📋 [Activate SMS] Error details:', {
              code: createAddressError.code,
              message: createAddressError.message,
              status: createAddressError.status
            });
            
            // Si falla, informar al usuario que necesita configurar dirección manualmente
            if (!orgData?.address) {
              return NextResponse.json({
                success: false,
                error: 'Dirección de la organización no configurada',
                details: 'Por favor configura la dirección de tu organización en la configuración del perfil.',
                action: 'update_organization_address',
                redirectTo: '/configuracion/organizacion'
              }, { status: 400 });
            }
            
            // Si falla por otra razón, continuar sin addressSid e informar
            console.log('⚠️ [Activate SMS] Continuando sin Address - puede fallar en números Mobile');
          }
        }
        
      } catch (addressError: any) {
        console.error('❌ [Activate SMS] Error obteniendo Address del Bundle:', addressError);
        // Continuar sin addressSid, algunos números no lo requieren
      }
      
    } catch (bundleError: any) {
      console.error('❌ [Activate SMS] Error verificando bundle:', bundleError);
      return NextResponse.json({
        success: false,
        error: 'Error verificando Regulatory Bundle: ' + bundleError.message,
        details: bundleError.message,
        code: bundleError.code
      }, { status: 500 });
    }
    
    // Placeholders para plataforma, status y prioridades
    const platformInfo = {
      platform: 'Twilio',
      account_type: 'Multi-Tenant Enterprise',
      bundle_required: bundleStatus !== 'twilio-approved' && bundleStatus !== 'approved',
      bundle_status: bundleStatus,
      bundle_info: bundleInfo,
      capabilities: {
        toll_free: true,  // Siempre disponible
        local_numbers: bundleStatus === 'twilio-approved' || bundleStatus === 'approved',
        international: false,
        short_codes: false
      },
      priority: {
        toll_free: 'high',      // Prioridad alta - no requiere Bundle
        local_numbers: bundleStatus === 'twilio-approved' || bundleStatus === 'approved' ? 'high' : 'pending',
        regulatory_compliance: bundleStatus === 'twilio-approved' || bundleStatus === 'approved' ? 'complete' : 'in_progress'
      }
    };
    
    console.log(`🏢 [SMS Activation] Platform Info:`, platformInfo);
    
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
      
      console.log(`📋 [SMS Activation] Total números en cuenta Twilio: ${existingNumbers.length}`);
      
      // Obtener números ya asignados en BD para evitar duplicados
      const { data: assignedNumbers } = await supabaseAdmin
        .from('organization_messaging_config')
        .select('sms_twilio_number, sms_twilio_sid, organization_id')
        .not('sms_twilio_number', 'is', null);
      
      const assignedPhoneNumbers = new Set(
        (assignedNumbers || [])
          .filter(n => n.sms_twilio_number)
          .map(n => n.sms_twilio_number)
      );
      
      const assignedSids = new Set(
        (assignedNumbers || [])
          .filter(n => n.sms_twilio_sid)
          .map(n => n.sms_twilio_sid)
      );
      
      console.log(`📋 [SMS Activation] Números asignados en BD: ${assignedPhoneNumbers.size}`);
      
      // Filtrar números disponibles del país correcto y NO asignados
      const countryPrefix = getCountryPhonePrefix(countryCode);
      const availableInAccount = existingNumbers.filter(num => {
        // Número del país correcto
        const isCorrectCountry = num.phoneNumber.startsWith(countryPrefix);
        
        // NO está asignado a otra organización
        const isNotAssigned = !assignedPhoneNumbers.has(num.phoneNumber) && 
                              !assignedSids.has(num.sid);
        
        return isCorrectCountry && isNotAssigned;
      });
      
      console.log(`📱 [SMS Activation] Números disponibles de ${countryInfo.name} (no asignados): ${availableInAccount.length}`);
      
      if (availableInAccount.length > 0) {
        console.log(`📱 [SMS Activation] Números disponibles:`, availableInAccount.map(n => n.phoneNumber).join(', '));
      }
      
      // OPCIÓN A: Reutilizar número existente (si tienes pool)
      if (availableInAccount.length > 0) {
        const firstAvailable = availableInAccount[0];
        console.log(`♻️ [SMS Activation] Reutilizando número existente: ${firstAvailable.phoneNumber}`);
        
        selectedNumber = await twilioClient.incomingPhoneNumbers(firstAvailable.sid).update({
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST',
          friendlyName: `Eagles ERP - ${orgData.name}`
        });
        
        console.log(`✅ [SMS Activation] Número configurado: ${selectedNumber.phoneNumber}`);
        
      } else {
        // OPCIÓN B: Comprar número nuevo con estrategia por país
        console.log('🛒 [SMS Activation] PASO 2: Comprando número nuevo...');
        console.log(`🌍 [SMS Activation] País objetivo: ${countryInfo.name} (${countryCode})`);
        
        let numbersToBuy: any[] = [];
        let numberType = 'local';
        let foundInArea = '';
        
        // Obtener área codes para este país
        const areaCodes = AREA_CODES_BY_COUNTRY[countryCode] || [];
        console.log(`📋 [SMS Activation] Área codes a intentar: ${areaCodes.join(', ') || 'ninguno'}`);
        
        // ESTRATEGIA 1: Buscar en área codes principales del país
        if (areaCodes.length > 0) {
          console.log(`📞 [SMS Activation] ESTRATEGIA 1: Buscando en áreas principales...`);
          
          for (const areaCode of areaCodes) {
            try {
              console.log(`🔍 [SMS Activation] Intentando área code: ${areaCode}`);
              
              const available = await twilioClient
                .availablePhoneNumbers(countryCode)
                .local
                .list({ 
                  smsEnabled: true, 
                  areaCode: parseInt(areaCode),
                  limit: 5 
                });
              
              if (available.length > 0) {
                numbersToBuy = available;
                foundInArea = areaCode;
                console.log(`✅ [SMS Activation] Encontrados ${available.length} números en área ${areaCode}`);
                break;
              }
              
              console.log(`⚠️ [SMS Activation] No hay números en área ${areaCode}`);
              
            } catch (areaError: any) {
              console.log(`⚠️ [SMS Activation] Error en área ${areaCode}:`, areaError.message);
              continue;
            }
          }
        }
        
        // ESTRATEGIA 2: Búsqueda sin filtro de área
        if (numbersToBuy.length === 0) {
          console.log(`🔍 [SMS Activation] ESTRATEGIA 2: Buscando sin filtro de área...`);
          
          try {
            numbersToBuy = await twilioClient
              .availablePhoneNumbers(countryCode)
              .local
              .list({ 
                smsEnabled: true, 
                limit: 20 
              });
            
            if (numbersToBuy.length > 0) {
              console.log(`✅ [SMS Activation] Encontrados ${numbersToBuy.length} números locales`);
            }
            
          } catch (generalError: any) {
            console.log(`⚠️ [SMS Activation] Búsqueda general falló:`, generalError.message);
          }
        }
        
        // ESTRATEGIA 3: Números Mobile (si el país lo soporta)
        if (numbersToBuy.length === 0) {
          console.log(`📱 [SMS Activation] ESTRATEGIA 3: Intentando números Mobile...`);
          
          try {
            numbersToBuy = await twilioClient
              .availablePhoneNumbers(countryCode)
              .mobile
              .list({ 
                smsEnabled: true, 
                limit: 20 
              });
            
            if (numbersToBuy.length > 0) {
              numberType = 'mobile';
              console.log(`✅ [SMS Activation] Encontrados ${numbersToBuy.length} números Mobile`);
            }
            
          } catch (mobileError: any) {
            console.log(`⚠️ [SMS Activation] No hay números Mobile:`, mobileError.message);
          }
        }
        
        // ESTRATEGIA 4: Toll-Free como último recurso
        if (numbersToBuy.length === 0) {
          console.log(`☎️ [SMS Activation] ESTRATEGIA 4: Intentando Toll-Free...`);
          
          try {
            numbersToBuy = await twilioClient
              .availablePhoneNumbers(countryCode)
              .tollFree
              .list({ 
                smsEnabled: true, 
                limit: 20 
              });
            
            if (numbersToBuy.length > 0) {
              numberType = 'toll-free';
              console.log(`✅ [SMS Activation] Encontrados ${numbersToBuy.length} números Toll-Free`);
            }
            
          } catch (tollFreeError: any) {
            console.log(`⚠️ [SMS Activation] No hay Toll-Free:`, tollFreeError.message);
          }
        }
        
        // Verificar si se encontraron números
        if (numbersToBuy.length === 0) {
          console.error(`❌ [SMS Activation] Sin números después de 4 estrategias en ${countryInfo.name}`);
          throw new Error(`No hay números disponibles en ${countryInfo.name}. Twilio puede estar sin inventario temporalmente.`);
        }
        
        // Seleccionar el primer número disponible
        const selectedPhoneNumber = numbersToBuy[0].phoneNumber;
        const selectedRegion = numbersToBuy[0].region || foundInArea || 'unknown';
        
        console.log(`🎯 [SMS Activation] Número seleccionado: ${selectedPhoneNumber}`);
        console.log(`📍 [SMS Activation] Región: ${selectedRegion}`);
        console.log(`🏷️ [SMS Activation] Tipo: ${numberType}`);
        
        // Parámetros de compra
        console.log('💰 [Activate SMS] Comprando número:', selectedPhoneNumber);
        console.log('📦 [Activate SMS] Usando bundle:', bundleSid);
        
        const purchaseParams: any = {
          phoneNumber: selectedPhoneNumber,
          friendlyName: `Eagles ERP - ${orgData.name}`,
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST'
        };
        
        // Agregar Bundle SID para Local y Mobile (Toll-Free no lo necesita)
        if (numberType === 'local' || numberType === 'mobile') {
          if (!bundleSid) {
            throw new Error(`Bundle regulatorio requerido para números ${numberType} pero no está configurado`);
          }
          if (bundleStatus !== 'twilio-approved' && bundleStatus !== 'approved') {
            throw new Error(`Bundle regulatorio requerido para números ${numberType} pero no está aprobado`);
          }
          
          purchaseParams.bundleSid = bundleSid;
          console.log(`📦 [Activate SMS] Bundle SID: ${bundleSid}`);
          
          // Agregar Address SID si está disponible
          if (addressSid) {
            purchaseParams.addressSid = addressSid;
            console.log(`📍 [Activate SMS] Address SID: ${addressSid}`);
          } else {
            console.log(`⚠️ [Activate SMS] Sin Address SID - intentando sin él`);
          }
          
        } else if (numberType === 'toll-free') {
          console.log(`📋 [Activate SMS] Toll-Free no requiere Bundle ni Address`);
        }
        
        // COMPRAR NÚMERO
        console.log('🛒 [Activate SMS] Ejecutando compra con parámetros:', {
          phoneNumber: purchaseParams.phoneNumber,
          hasBundleSid: !!purchaseParams.bundleSid,
          bundleSid: purchaseParams.bundleSid || 'N/A (Toll-Free)',
          hasAddressSid: !!purchaseParams.addressSid,
          addressSid: purchaseParams.addressSid || 'N/A'
        });
        
        selectedNumber = await twilioClient.incomingPhoneNumbers.create(purchaseParams);
        
        console.log('✅ [Activate SMS] Número comprado:', selectedNumber.phoneNumber);
        console.log('📋 [Activate SMS] SID del número:', selectedNumber.sid);
      }
      
    } catch (error: any) {
      console.error('❌ [Activate SMS] Error en compra:', error);
      console.error('📋 [Activate SMS] Error code:', error.code);
      console.error('📋 [Activate SMS] Error message:', error.message);
      
      // Errores específicos de Regulatory Bundle
      if (error.code === 21453) {
        console.error('❌ [Activate SMS] Bundle requerido pero no proporcionado');
        return NextResponse.json({
          success: false,
          error: 'Regulatory Bundle requerido pero no proporcionado',
          details: error.message,
          code: error.code,
          action: 'Verificar que bundleSid esté incluido en la compra'
        }, { status: 400 });
      }
      
      if (error.code === 21452) {
        console.error('❌ [Activate SMS] Bundle no válido o no aprobado');
        return NextResponse.json({
          success: false,
          error: 'Regulatory Bundle no válido o no aprobado',
          details: error.message,
          code: error.code,
          bundle_sid: bundleSid,
          bundle_status: bundleStatus,
          action: 'Verificar estado del Bundle en Twilio Console'
        }, { status: 400 });
      }
      
      if (error.code === 21617) {
        console.error('❌ [Activate SMS] Bundle Regulatorio Inválido');
        return NextResponse.json({
          success: false,
          error: 'Bundle Regulatorio Inválido',
          details: 'El Bundle no está aprobado o es inválido.',
          adminAction: 'Verificar estado del Bundle en Twilio Console',
          bundleUrl: 'https://console.twilio.com/us1/develop/compliance/bundles',
          platform: platformInfo.platform,
          bundle_status: bundleStatus,
          priority: {
            action: 'high',
            message: 'El Bundle debe estar aprobado para usar números locales'
          }
        }, { status: 500 });
      }
      
      if (error.message?.includes('Bundle regulatorio requerido')) {
        console.error('❌ [Activate SMS] Bundle requerido pero no aprobado');
        return NextResponse.json({
          success: false,
          error: 'Bundle Regulatorio Pendiente',
          details: 'El Bundle está en proceso de aprobación. Solo números Toll-Free están disponibles temporalmente.',
          platform: platformInfo.platform,
          bundle_status: bundleStatus,
          current_capabilities: platformInfo.capabilities,
          priority: {
            action: 'medium',
            message: 'Usar números Toll-Free mientras el Bundle está en aprobación',
            estimated_approval: '24-72 horas'
          },
          suggestion: 'Intenta activar SMS nuevamente cuando el Bundle esté aprobado para acceder a números locales.',
          bundleUrl: 'https://console.twilio.com/us1/develop/compliance/bundles'
        }, { status: 503 });
      }
      
      // Error de autenticación
      if (error.code === 20003) {
        console.error('❌ [Activate SMS] Autenticación fallida');
        return NextResponse.json({
          success: false,
          error: 'Autenticación fallida',
          details: 'Las credenciales de Twilio son inválidas',
          code: error.code
        }, { status: 401 });
      }
      
      // Error de número no disponible
      if (error.code === 21422) {
        console.error('❌ [Activate SMS] Número no disponible');
        return NextResponse.json({
          success: false,
          error: 'Número no disponible',
          details: 'El número seleccionado ya no está disponible',
          code: error.code
        }, { status: 400 });
      }
      
      if (error.code === 21450 || error.code === 21421) {
        console.error('❌ [Activate SMS] Límite de números alcanzado');
        return NextResponse.json({
          success: false,
          error: 'Límite de números alcanzado',
          details: 'La cuenta de Twilio ha alcanzado el límite de números.',
          adminAction: 'Actualizar plan de Twilio o liberar números no usados',
          twilioUrl: 'https://console.twilio.com/billing/upgrade',
          code: error.code
        }, { status: 400 });
      }
      
      if (error.code === 21631) {
        console.error('❌ [Activate SMS] Address requerido pero no disponible');
        return NextResponse.json({
          success: false,
          error: 'Número requiere dirección verificada',
          details: 'Los números Mobile en México requieren una dirección verificada en el Regulatory Bundle.',
          action: 'configure_address',
          steps: [
            '1. Verifica que tu organización tenga dirección configurada',
            '2. El sistema intentará crear el Address automáticamente',
            '3. Si persiste el error, contacta a soporte'
          ],
          twilioError: error.message,
          code: error.code
        }, { status: 400 });
      }
      
      if (error.message?.includes('No hay números disponibles')) {
        console.error('❌ [Activate SMS] No hay números disponibles');
        return NextResponse.json({
          success: false,
          error: 'No hay números disponibles',
          details: `Twilio no tiene números disponibles en ${countryInfo.name} en este momento.`,
          suggestion: 'Por favor intenta de nuevo en unos minutos o contacta a soporte.',
          alternative: 'También puedes comprar un número manualmente en Twilio Console y configurarlo.'
        }, { status: 503 });
      }
      
      // Error genérico
      console.error('❌ [Activate SMS] Error genérico:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error comprando número: ' + error.message,
        code: error.code,
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
    console.log('💾 [Activate SMS] Guardando configuración en BD...');
    console.log('📱 [Activate SMS] Número a guardar:', selectedNumber.phoneNumber);
    console.log('📇 [Activate SMS] SID a guardar:', selectedNumber.sid);
    
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
    console.log(`🏢 [SMS Activation] Organización: ${orgData.name} (${organizationId})`);
    console.log(`🌍 [SMS Activation] País: ${countryInfo.name}`);
    
    // 8. Retornar respuesta exitosa con información de plataforma
    const numberType = selectedNumber.phoneNumber.includes('800') ? 'toll-free' : 'local';
    
    return NextResponse.json({
      success: true,
      message: 'SMS activado correctamente',
      data: {
        phone_number: selectedNumber.phoneNumber,
        sid: selectedNumber.sid,
        type: numberType,
        country: countryInfo.name,
        country_code: countryCode,
        webhook_url: webhookUrl,
        costs: {
          monthly_usd: countryInfo.monthlyCost,
          per_sms_mxn: countryInfo.perSMS,
          currency_monthly: 'USD',
          currency_per_sms: 'MXN'
        },
        activated_at: new Date().toISOString(),
        platform: {
          provider: platformInfo.platform,
          account_type: platformInfo.account_type,
          bundle_status: bundleStatus,
          bundle_required: numberType === 'local',
          capabilities: platformInfo.capabilities,
          priority: {
            number_type: numberType,
            regulatory_compliance: platformInfo.priority.regulatory_compliance,
            status: numberType === 'toll-free' ? 'operational' : (bundleStatus === 'twilio-approved' || bundleStatus === 'approved' ? 'operational' : 'pending_approval')
          }
        }
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
