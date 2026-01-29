import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getTwilioClient } from '@/lib/messaging/twilio-client';

/**
 * POST /api/messaging/activate-sms
 * Activar SMS para una organización:
 * 1. Comprar número de teléfono en Twilio (México)
 * 2. Configurar webhook para SMS entrantes
 * 3. Actualizar configuración en BD
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar usuario
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Obtener perfil y verificar permisos
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error('[POST /api/messaging/activate-sms] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    // Solo ADMIN y OWNER pueden activar SMS
    if (!['ADMIN', 'OWNER'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para activar SMS' },
        { status: 403 }
      );
    }

    const organizationId = profile.organization_id;

    // 3. Verificar que no tenga número ya asignado
    const { data: existingConfig, error: configError } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_from_number, sms_twilio_phone_sid, sms_enabled')
      .eq('organization_id', organizationId)
      .single();

    // Si hay error pero no es "no encontrado", reportarlo
    if (configError && configError.code !== 'PGRST116') {
      console.error('❌ [Activate SMS] Error obteniendo configuración:', configError);
      return NextResponse.json(
        { 
          error: 'Error al verificar configuración existente',
          details: configError.message
        },
        { status: 500 }
      );
    }

    // Si ya tiene número configurado, retornar éxito
    if (existingConfig?.sms_from_number && existingConfig?.sms_twilio_phone_sid) {
      console.log('✅ [Activate SMS] SMS ya está activado para esta organización');
      return NextResponse.json({
        success: true,
        message: 'SMS ya está activado',
        phoneNumber: existingConfig.sms_from_number,
        phoneSid: existingConfig.sms_twilio_phone_sid,
        alreadyActive: true
      });
    }

    // 4. Obtener URL base de la aplicación
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io';
    
    // Si no tiene protocolo, agregarlo
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }
    
    // Si VERCEL_URL está disponible y no hay NEXT_PUBLIC_APP_URL, usarlo
    if (!process.env.NEXT_PUBLIC_APP_URL && process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    }
    
    console.log('🌐 [Activate SMS] URL base de aplicación:', appUrl);

    // 5. Obtener números existentes en la cuenta de Twilio
    const twilioClient = getTwilioClient();
    const webhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}`;
    const statusWebhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}/status`;

    console.log('📱 [Activate SMS] Verificando números existentes en cuenta Twilio...');
    
    // Primero verificar si ya hay números en la cuenta
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
          smsUrl: webhookUrl,
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST',
        });
        console.log('✅ [Activate SMS] Webhooks actualizados en número existente');
      } catch (updateError: any) {
        console.error('❌ [Activate SMS] Error actualizando webhooks:', updateError);
        // Continuar con el número aunque falle la actualización de webhooks
        purchasedNumber = firstNumber;
      }
    } else {
      // No hay números, intentar comprar uno nuevo
      console.log('📱 [Activate SMS] No hay números existentes, buscando disponibles en México...');
      
      try {
        // Buscar números disponibles en México (código de país +52)
        const availableNumbers = await twilioClient.availablePhoneNumbers('MX')
          .local
          .list({ limit: 5 });

        if (!availableNumbers || availableNumbers.length === 0) {
          console.error('❌ [Activate SMS] No hay números disponibles en México');
          return NextResponse.json(
            { 
              error: 'No hay números disponibles en México. Intenta más tarde o contacta soporte.',
              details: 'Twilio no tiene números disponibles en este momento'
            },
            { status: 503 }
          );
        }

        // Seleccionar el primer número disponible
        const selectedNumber = availableNumbers[0];
        console.log('✅ [Activate SMS] Número seleccionado:', selectedNumber.phoneNumber);

        // Comprar el número
        console.log('💰 [Activate SMS] Comprando número...');
        purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber: selectedNumber.phoneNumber,
          smsUrl: webhookUrl,
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST',
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
              error: 'Cuenta Trial de Twilio',
              details: 'Las cuentas trial de Twilio solo permiten un número. Ya tienes un número asignado.',
              code: purchaseError.code,
              solution: 'Para usar SMS, actualiza tu cuenta de Twilio a un plan de pago o usa el número existente.',
              moreInfo: purchaseError.moreInfo
            },
            { status: 400 }
          );
        }
        
        // Otro error
        throw purchaseError;
      }
    }

    // 7. Verificar que purchasedNumber existe
    if (!purchasedNumber || !purchasedNumber.phoneNumber || !purchasedNumber.sid) {
      console.error('❌ [Activate SMS] Número no válido después de obtener/comprar');
      return NextResponse.json(
        { 
          error: 'Error al obtener número de teléfono',
          details: 'No se pudo obtener o comprar un número válido'
        },
        { status: 500 }
      );
    }

    // 8. Actualizar configuración en BD (upsert para crear si no existe)
    const updates: any = {
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

    const { data: updateData, error: updateErr } = await supabaseAdmin
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
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('organization_messaging_config')
        .insert({
          organization_id: organizationId,
          ...updates,
        })
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
      console.error('❌ [Activate SMS] Error actualizando BD:', updateError);
      
      // NO liberar el número si ya existía (no lo compramos)
      if (existingNumbers && existingNumbers.length > 0) {
        console.log('⚠️ [Activate SMS] Número existente, no se liberará');
      } else {
        // Solo liberar si lo compramos nosotros
        try {
          await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
          console.log('🔄 [Activate SMS] Número liberado debido a error en BD');
        } catch (releaseError) {
          console.error('❌ [Activate SMS] Error liberando número:', releaseError);
        }
      }

      return NextResponse.json(
        { 
          error: 'Error al guardar configuración',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      );
    }

    console.log('✅ [Activate SMS] SMS activado exitosamente para org:', organizationId);

    return NextResponse.json({
      success: true,
      message: 'SMS activado exitosamente',
      phoneNumber: purchasedNumber.phoneNumber,
      phoneSid: purchasedNumber.sid,
      webhookUrl: webhookUrl,
      config: {
        smsEnabled: true,
        smsFromNumber: purchasedNumber.phoneNumber,
        smsAutoNotifications: true,
        smsNotificationStatuses: ['completed', 'ready'],
      }
    });

  } catch (error: any) {
    console.error('❌ [POST /api/messaging/activate-sms] Error:', error);
    
    // Error específico de Twilio
    if (error.code) {
      return NextResponse.json({
        error: 'Error de Twilio al activar SMS',
        details: error.message,
        code: error.code,
        moreInfo: error.moreInfo
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Error al activar SMS',
      details: error.message || 'Error desconocido'
    }, { status: 500 });
  }
}

