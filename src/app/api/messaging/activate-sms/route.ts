import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getTwilioClient } from '@/lib/messaging/twilio-client';

/**
 * GET /api/messaging/activate-sms
 * Obtiene el estado de activación de SMS para la organización
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
    
    // 3. Obtener configuración de SMS
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
    
    // 4. Retornar estado
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
        // Costos estimados (hardcoded por ahora)
        costs: {
          monthlyUsd: 1.0, // $1 USD/mes por número
          perSmsMxn: 0.15  // $0.15 MXN por SMS
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
 * Activar SMS para una organización:
 * 1. Buscar número disponible en Twilio (área del taller)
 * 2. Comprar el número automáticamente
 * 3. Configurar webhook para recibir SMS
 * 4. Guardar configuración en BD
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

    // 2. Obtener perfil y verificar permisos
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role, email')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !(profile as any).organization_id) {
      console.error('[POST /api/messaging/activate-sms] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    const profileData = profile as any;

    // Solo ADMIN y OWNER pueden activar SMS
    if (!['ADMIN', 'OWNER'].includes(profileData.role)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para activar SMS' },
        { status: 403 }
      );
    }

    const organizationId = profileData.organization_id;

    // 3. Obtener datos de la organización
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, city, state, country, phone')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !organization) {
      console.error('[POST /api/messaging/activate-sms] Error obteniendo organización:', orgError);
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    const orgData = organization as any;

    // 4. Verificar que no tenga SMS ya activado
    const { data: existingConfig, error: configError } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_enabled, sms_from_number, sms_twilio_phone_sid')
      .eq('organization_id', organizationId)
      .single();

    // Si hay error pero no es "no encontrado", reportarlo
    if (configError && configError.code !== 'PGRST116') {
      console.error('❌ [Activate SMS] Error obteniendo configuración:', configError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al verificar configuración existente',
          details: configError.message
        },
        { status: 500 }
      );
    }

    const configData = existingConfig as any;

    // Si ya tiene número configurado, retornar éxito
    if (configData?.sms_enabled && configData?.sms_from_number && configData?.sms_twilio_phone_sid) {
      console.log('✅ [Activate SMS] SMS ya está activado para esta organización');
      return NextResponse.json({
        success: false,
        error: 'SMS ya está activado',
        data: {
          phone_number: configData.sms_from_number
        }
      }, { status: 400 });
    }

    // 5. Verificar credenciales de Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ [Activate SMS] Twilio credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Servicio SMS no configurado' },
        { status: 500 }
      );
    }

    // 6. Inicializar cliente Twilio
    const twilioClient = getTwilioClient();

    // 7. Determinar código de área (basado en ubicación)
    let areaCode: number | undefined;
    if (orgData.city?.toLowerCase().includes('aguascalientes')) {
      areaCode = 449;
    } else if (orgData.state?.toLowerCase().includes('aguascalientes')) {
      areaCode = 449;
    }
    // Agregar más códigos de área según necesidad
    // Ejemplo: if (organization.city?.toLowerCase().includes('guadalajara')) areaCode = 33;
    
    console.log(`📱 [Activate SMS] Buscando número en México, área code: ${areaCode || 'cualquiera'}`);

    // 8. Obtener URL base de la aplicación
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
    const statusWebhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}/status`;
    
    console.log('🌐 [Activate SMS] URL base de aplicación:', appUrl);
    console.log('🔗 [Activate SMS] Webhook URL:', webhookUrl);

    // 9. Verificar números existentes en la cuenta de Twilio
    let existingNumbers;
    try {
      existingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 10 });
      console.log('📋 [Activate SMS] Números existentes en cuenta:', existingNumbers.length);
    } catch (error: any) {
      console.error('❌ [Activate SMS] Error obteniendo números existentes:', error);
      existingNumbers = [];
    }

    let purchasedNumber;

    // Si ya hay números, usar el primero disponible
    if (existingNumbers && existingNumbers.length > 0) {
      const firstNumber = existingNumbers[0];
      console.log('✅ [Activate SMS] Usando número existente:', firstNumber.phoneNumber);
      
      // Actualizar webhooks del número existente
      try {
        purchasedNumber = await twilioClient.incomingPhoneNumbers(firstNumber.sid).update({
          friendlyName: `Eagles ERP - ${orgData.name}`,
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST'
        });
        console.log('✅ [Activate SMS] Webhooks actualizados en número existente');
      } catch (updateError: any) {
        console.error('❌ [Activate SMS] Error actualizando webhooks:', updateError);
        // Continuar con el número aunque falle la actualización de webhooks
        purchasedNumber = firstNumber;
      }
    } else {
      // No hay números, buscar y comprar uno nuevo
      console.log('📱 [Activate SMS] No hay números existentes, buscando disponibles en México...');
      
      // 10. Buscar números disponibles en México
      let availableNumbers;
      
      try {
        // Intentar primero con área code específico si existe
        if (areaCode) {
          console.log(`🔍 [Activate SMS] Buscando números con área code ${areaCode}...`);
          availableNumbers = await twilioClient
            .availablePhoneNumbers('MX')
            .local
            .list({
              areaCode: areaCode,
              smsEnabled: true,
              voiceEnabled: false, // Solo SMS, no voz (más barato)
              limit: 10
            });
        }
        
        // Si no hay números o no hay área code, buscar cualquier número en México
        if (!availableNumbers || availableNumbers.length === 0) {
          console.log('🔍 [Activate SMS] No hay números con área code, buscando cualquier número en México...');
          availableNumbers = await twilioClient
            .availablePhoneNumbers('MX')
            .local
            .list({
              smsEnabled: true,
              voiceEnabled: false,
              limit: 20
            });
        }
        
        if (!availableNumbers || availableNumbers.length === 0) {
          throw new Error('No hay números disponibles en México');
        }
        
        console.log(`✅ [Activate SMS] Encontrados ${availableNumbers.length} números disponibles`);
        
      } catch (searchError: any) {
        console.error('❌ [Activate SMS] Error buscando números:', searchError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Error al buscar números disponibles',
            details: searchError.message
          },
          { status: 500 }
        );
      }

      // 11. Comprar el primer número disponible (AUTOMÁTICO)
      try {
        console.log('💰 [Activate SMS] Comprando número:', availableNumbers[0].phoneNumber);
        purchasedNumber = await twilioClient
          .incomingPhoneNumbers
          .create({
            phoneNumber: availableNumbers[0].phoneNumber,
            friendlyName: `Eagles ERP - ${orgData.name}`,
            smsUrl: webhookUrl,
            smsMethod: 'POST',
            statusCallback: statusWebhookUrl,
            statusCallbackMethod: 'POST'
          });
        
        console.log('✅ [Activate SMS] Número comprado:', {
          phoneNumber: purchasedNumber.phoneNumber,
          sid: purchasedNumber.sid
        });
      } catch (purchaseError: any) {
        // Error específico de cuenta trial
        if (purchaseError.code === 21404) {
          console.error('❌ [Activate SMS] Cuenta trial - solo permite un número');
          return NextResponse.json(
            { 
              success: false,
              error: 'Cuenta Trial de Twilio',
              details: 'Las cuentas trial de Twilio solo permiten un número. Ya tienes un número asignado.',
              code: purchaseError.code,
              solution: 'Para usar SMS, actualiza tu cuenta de Twilio a un plan de pago o usa el número existente.',
              moreInfo: purchaseError.moreInfo
            },
            { status: 400 }
          );
        }
        
        console.error('❌ [Activate SMS] Error comprando número:', purchaseError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Error al comprar número',
            details: purchaseError.message 
          },
          { status: 500 }
        );
      }
    }

    // 12. Verificar que purchasedNumber existe
    if (!purchasedNumber || !purchasedNumber.phoneNumber || !purchasedNumber.sid) {
      console.error('❌ [Activate SMS] Número no válido después de obtener/comprar');
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al obtener número de teléfono',
          details: 'No se pudo obtener o comprar un número válido'
        },
        { status: 500 }
      );
    }

    // 13. Guardar configuración en BD (UPSERT)
    const updates = {
      sms_enabled: true,
      sms_from_number: purchasedNumber.phoneNumber,
      sms_twilio_phone_sid: purchasedNumber.sid,
      sms_webhook_url: webhookUrl,
      sms_auto_notifications: true,
      sms_notification_statuses: ['completed', 'ready'],
      updated_at: new Date().toISOString(),
    };

    // Intentar update primero, si no existe, hacer insert
    let updatedConfig;
    let updateError;

    const { data: updateData, error: updateErr } = await (supabaseAdmin as any)
      .from('organization_messaging_config')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single();

    updateError = updateErr;
    updatedConfig = updateData;

    // Si no existe la configuración, crearla
    if (updateError && updateError.code === 'PGRST116') {
      console.log('📝 [Activate SMS] Creando nueva configuración...');
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
        updatedConfig = insertData;
        updateError = null;
      }
    }

    if (updateError) {
      console.error('❌ [Activate SMS] Error guardando configuración:', updateError);
      
      // Intentar liberar el número si falló guardar en BD (solo si lo compramos)
      if (!existingNumbers || existingNumbers.length === 0) {
        try {
          await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
          console.log('🔄 [Activate SMS] Número liberado después de error en BD');
        } catch (releaseError) {
          console.error('❌ [Activate SMS] Error liberando número:', releaseError);
        }
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al guardar configuración',
          details: updateError.message
        },
        { status: 500 }
      );
    }

    console.log(`✅ [Activate SMS] SMS activado exitosamente para org ${organizationId}`);

    // 14. Retornar respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'SMS activado correctamente',
      data: {
        phone_number: purchasedNumber.phoneNumber,
        sid: purchasedNumber.sid,
        webhook_url: webhookUrl,
        friendly_name: purchasedNumber.friendlyName,
        costs: {
          monthly_usd: 1.00,
          per_sms_mxn: 0.15,
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

