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
 * 
 * Activa SMS para una organización:
 * 1. Busca número disponible en Twilio (México)
 * 2. Compra el número automáticamente
 * 3. Configura webhook para recibir SMS
 * 4. Guarda configuración en BD
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
    
    // 3. Obtener datos de la organización (solo columnas básicas)
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }
    
    const orgData = organization as any;
    
    // 4. Verificar que no tenga SMS ya activado
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
            phone_number: (existingConfig as any).sms_from_number
          }
        },
        { status: 400 }
      );
    }
    
    // 5. Verificar credenciales de Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ [SMS Activation] Twilio credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Servicio SMS no configurado' },
        { status: 500 }
      );
    }
    
    // 6. Inicializar cliente Twilio
    const twilioClient = getTwilioClient();
    
    // 7. Buscar cualquier número disponible en México
    console.log(`📱 [SMS Activation] Buscando número en México (cualquier área)`);
    
    // 8. Buscar números disponibles en México
    let availableNumbers;
    
    try {
      console.log('🔍 [SMS Activation] Buscando números disponibles en México');
      availableNumbers = await twilioClient
        .availablePhoneNumbers('MX')
        .local
        .list({
          smsEnabled: true,
          voiceEnabled: false, // Solo SMS, no voz (más barato)
          limit: 20
        });
      
      if (availableNumbers.length === 0) {
        throw new Error('No hay números disponibles en México');
      }
      
      console.log(`✅ [SMS Activation] Encontrados ${availableNumbers.length} números disponibles`);
      
    } catch (twilioError: any) {
      console.error('❌ [SMS Activation] Error buscando números:', twilioError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al buscar números disponibles',
          details: twilioError.message
        },
        { status: 500 }
      );
    }
    
    // 9. Configurar webhook URL
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
    
    // 10. Comprar el primer número disponible (AUTOMÁTICO)
    let purchasedNumber;
    
    try {
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
      
      console.log(`✅ [SMS Activation] Número comprado: ${purchasedNumber.phoneNumber}`);
      
    } catch (twilioError: any) {
      console.error('❌ [SMS Activation] Error comprando número:', twilioError);
      
      // Error específico de cuenta trial
      if (twilioError.code === 21404) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cuenta Trial de Twilio',
            details: 'Las cuentas trial de Twilio solo permiten un número. Ya tienes un número asignado.',
            code: twilioError.code,
            solution: 'Para usar SMS, actualiza tu cuenta de Twilio a un plan de pago o usa el número existente.'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al comprar número',
          details: twilioError.message 
        },
        { status: 500 }
      );
    }

    // 11. Guardar configuración en BD (UPSERT)
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
      
      // Intentar liberar el número si falló guardar en BD
      try {
        await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
        console.log('🔄 [SMS Activation] Número liberado después de error en BD');
      } catch (releaseError) {
        console.error('❌ [SMS Activation] Error liberando número:', releaseError);
      }
      
      return NextResponse.json(
        { success: false, error: 'Error al guardar configuración' },
        { status: 500 }
      );
    }

    console.log(`✅ [SMS Activation] SMS activado exitosamente para org ${organizationId}`);
    
    // 12. Retornar respuesta exitosa
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

