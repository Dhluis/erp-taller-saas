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
    const { data: existingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('sms_from_number, sms_twilio_phone_sid, sms_enabled')
      .eq('organization_id', organizationId)
      .single();

    if (existingConfig?.sms_from_number && existingConfig?.sms_twilio_phone_sid) {
      return NextResponse.json({
        success: true,
        message: 'SMS ya está activado',
        phoneNumber: existingConfig.sms_from_number,
        phoneSid: existingConfig.sms_twilio_phone_sid,
        alreadyActive: true
      });
    }

    // 4. Obtener URL base de la aplicación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://eaglessystem.io';

    // 5. Comprar número de teléfono en Twilio (México)
    const twilioClient = getTwilioClient();
    
    console.log('📱 [Activate SMS] Buscando números disponibles en México...');
    
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

    // 6. Comprar el número
    const webhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}`;
    const statusWebhookUrl = `${appUrl}/api/messaging/sms/webhook/${organizationId}/status`;

    console.log('💰 [Activate SMS] Comprando número...');
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: selectedNumber.phoneNumber,
      smsUrl: webhookUrl,
      statusCallback: statusWebhookUrl,
      statusCallbackMethod: 'POST',
    });

    console.log('✅ [Activate SMS] Número comprado:', {
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid
    });

    // 7. Actualizar configuración en BD
    const updates: any = {
      sms_enabled: true,
      sms_from_number: purchasedNumber.phoneNumber,
      sms_twilio_phone_sid: purchasedNumber.sid,
      sms_webhook_url: webhookUrl,
      sms_auto_notifications: true,
      sms_notification_statuses: ['completed', 'ready'],
      updated_at: new Date().toISOString(),
    };

    const { data: updatedConfig, error: updateError } = await supabaseAdmin
      .from('organization_messaging_config')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [Activate SMS] Error actualizando BD:', updateError);
      
      // Intentar liberar el número si falla la BD
      try {
        await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
        console.log('🔄 [Activate SMS] Número liberado debido a error en BD');
      } catch (releaseError) {
        console.error('❌ [Activate SMS] Error liberando número:', releaseError);
      }

      return NextResponse.json(
        { 
          error: 'Error al guardar configuración',
          details: updateError.message
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

