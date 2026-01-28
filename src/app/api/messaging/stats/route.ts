import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/messaging/stats
 * Retorna estadísticas de mensajería
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

    // 2. Obtener perfil y organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    // 3. Retornar stats por defecto (sin historial aún)
    const stats = {
      channels: {
        email: {
          enabled: true,
          configured: !!process.env.SENDGRID_API_KEY,
        },
        sms: {
          enabled: !!process.env.TWILIO_PHONE_NUMBER,
          configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        },
        whatsapp: {
          provider: 'waha',
          enabled: true,
          configured: true,
        }
      },
      features: {
        chatbotEnabled: true,
      },
      usage: {
        emailsSent: 0,
        smsSent: 0,
        whatsappSent: 0,
      }
    };

    return NextResponse.json({ success: true, stats });

  } catch (error: any) {
    console.error('[GET /api/messaging/stats] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}

