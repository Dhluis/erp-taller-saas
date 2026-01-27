import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import { getMessagingConfig } from '@/lib/messaging/twilio-client';

/**
 * GET /api/messaging/stats
 * Obtener estadísticas de mensajería de la organización
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticar
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener perfil usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error('[GET /api/messaging/stats] Error obteniendo perfil:', profileError);
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // 3. Obtener configuración de mensajería
    const config = await getMessagingConfig(profile.organization_id);

    if (!config) {
      // Retornar configuración por defecto si no existe
      return NextResponse.json({
        stats: {
          channels: {
            email: { enabled: false, configured: false },
            sms: { enabled: false, configured: false },
            whatsapp: { provider: 'waha', enabled: false, configured: false },
          },
          usage: {
            emailsSent: 0,
            smsSent: 0,
            whatsappSent: 0,
          },
        },
      });
    }

    // 4. TODO: Obtener estadísticas reales de uso (implementar después con tabla de historial)
    // Por ahora retornamos valores por defecto

    // 5. Determinar estado de configuración
    const emailConfigured = !!config.emailEnabled;
    const smsConfigured = !!config.smsEnabled && !!config.smsFromNumber;
    const whatsappConfigured = 
      (config.whatsappProvider === 'waha' && config.wahaConnected) ||
      (config.whatsappProvider === 'twilio' && !!config.whatsappTwilioNumber);

    return NextResponse.json({
      stats: {
        channels: {
          email: {
            enabled: config.emailEnabled || false,
            configured: emailConfigured,
          },
          sms: {
            enabled: config.smsEnabled || false,
            configured: smsConfigured,
          },
          whatsapp: {
            provider: config.whatsappProvider || 'waha',
            enabled: config.whatsappEnabled || false,
            configured: whatsappConfigured,
          },
        },
        usage: {
          emailsSent: 0, // TODO: Obtener de historial
          smsSent: 0, // TODO: Obtener de historial
          whatsappSent: 0, // TODO: Obtener de historial
        },
      },
    });
  } catch (error: any) {
    console.error('[GET /api/messaging/stats] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: error.message },
      { status: 500 }
    );
  }
}

