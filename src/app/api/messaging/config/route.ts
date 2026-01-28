import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getMessagingConfig } from '@/lib/messaging/twilio-client';

/**
 * GET /api/messaging/config
 * Obtener configuración de mensajería de la organización
 */
export async function GET(request: NextRequest) {
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

    // 2. Obtener perfil y organization_id usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error('[GET /api/messaging/config] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    // 3. Obtener configuración de mensajería
    const config = await getMessagingConfig(profile.organization_id);

    // 4. Si no hay configuración en BD, retornar valores por defecto
    if (!config) {
      return NextResponse.json({
        success: true,
        config: {
          emailEnabled: true,
          emailFromName: process.env.SMTP_FROM_NAME || 'Eagles ERP',
          emailReplyTo: process.env.SMTP_FROM_EMAIL || 'servicios@eaglessystem.io',
          smsEnabled: false,
          smsFromNumber: process.env.TWILIO_PHONE_NUMBER || null,
          whatsappProvider: 'waha',
          whatsappEnabled: false,
          whatsappTwilioNumber: null,
          whatsappVerified: false,
          wahaConnected: false,
          chatbotEnabled: true,
          chatbotSystemPrompt: null,
          monthlyEmailLimit: 1000,
          monthlySmsLimit: 100,
          monthlyWhatsappLimit: 500,
        }
      });
    }

    // 5. Retornar configuración (solo campos seguros)
    return NextResponse.json({
      success: true,
      config: {
        emailEnabled: config.emailEnabled,
        emailFromName: config.emailFromName,
        emailReplyTo: config.emailReplyTo,
        smsEnabled: config.smsEnabled,
        smsFromNumber: config.smsFromNumber,
        whatsappProvider: config.whatsappProvider,
        whatsappEnabled: config.whatsappEnabled,
        whatsappTwilioNumber: config.whatsappTwilioNumber,
        whatsappVerified: config.whatsappVerified,
        wahaConnected: config.wahaConnected,
        chatbotEnabled: config.chatbotEnabled,
        chatbotSystemPrompt: config.chatbotSystemPrompt,
        monthlyEmailLimit: config.monthlyEmailLimit,
        monthlySmsLimit: config.monthlySmsLimit,
        monthlyWhatsappLimit: config.monthlyWhatsappLimit,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/messaging/config] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messaging/config
 * Actualizar configuración de mensajería
 */
export async function PUT(request: NextRequest) {
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

    // 2. Obtener perfil y verificar permisos usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error('[PUT /api/messaging/config] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    // Solo ADMIN y OWNER pueden modificar
    if (!['ADMIN', 'OWNER'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para modificar configuración' },
        { status: 403 }
      );
    }

    // 3. Parsear body
    const body = await request.json();

    // Validar campos permitidos (solo campos seguros, no credenciales)
    const allowedFields = [
      'email_enabled',
      'email_from_name',
      'email_reply_to',
      'sms_enabled',
      'sms_from_number',
      'whatsapp_provider',
      'whatsapp_enabled',
      'whatsapp_twilio_number',
      'chatbot_enabled',
      'chatbot_system_prompt',
      'monthly_email_limit',
      'monthly_sms_limit',
      'monthly_whatsapp_limit',
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Si no hay campos para actualizar
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    // Agregar updated_at
    updates.updated_at = new Date().toISOString();

    // 4. Actualizar en BD usando Service Role Client
    const { data, error } = await supabaseAdmin
      .from('organization_messaging_config')
      .update(updates)
      .eq('organization_id', profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/messaging/config] DB Error:', error);
      return NextResponse.json(
        { error: 'Error al actualizar configuración', details: error.message },
        { status: 500 }
      );
    }

    // 5. Mapear respuesta a formato camelCase
    const configData = data as any;
    const responseConfig = {
      emailEnabled: configData.email_enabled ?? true,
      emailFromName: configData.email_from_name || 'Eagles ERP',
      emailReplyTo: configData.email_reply_to,
      smsEnabled: configData.sms_enabled ?? false,
      smsFromNumber: configData.sms_from_number,
      whatsappProvider: configData.whatsapp_provider || 'waha',
      whatsappEnabled: configData.whatsapp_enabled ?? false,
      whatsappTwilioNumber: configData.whatsapp_twilio_number,
      whatsappVerified: configData.whatsapp_verified ?? false,
      chatbotEnabled: configData.chatbot_enabled ?? false,
      chatbotSystemPrompt: configData.chatbot_system_prompt,
      monthlyEmailLimit: configData.monthly_email_limit ?? 1000,
      monthlySmsLimit: configData.monthly_sms_limit ?? 100,
      monthlyWhatsappLimit: configData.monthly_whatsapp_limit ?? 500,
    };

    return NextResponse.json({
      success: true,
      config: responseConfig
    });
  } catch (error: any) {
    console.error('[PUT /api/messaging/config] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: error.message },
      { status: 500 }
    );
  }
}

