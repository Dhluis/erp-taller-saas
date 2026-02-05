/**
 * INICIAR TRIAL - Activa prueba gratis de 7 días
 * 
 * Cuando el usuario hace clic en "Iniciar Prueba Gratis",
 * se activa el trial usando WAHA (tier basic)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/messaging/start-trial
 * Inicia prueba gratis de 7 días
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Start Trial] 🚀 Iniciando prueba gratis...');
    
    // 1. Autenticación
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // 2. Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }
    
    const organizationId = userProfile.organization_id;
    
    // 3. Verificar si ya tiene trial activo o suscripción
    const { data: existingConfig } = await supabaseAdmin
      .from('organization_messaging_config')
      .select('subscription_status, trial_ends_at, whatsapp_api_provider')
      .eq('organization_id', organizationId)
      .single();
    
    if (existingConfig) {
      const status = existingConfig.subscription_status || 'none';
      
      // Si ya tiene trial activo, no hacer nada
      if (status === 'trial') {
        const trialEnd = existingConfig.trial_ends_at 
          ? new Date(existingConfig.trial_ends_at)
          : null;
        
        if (trialEnd && trialEnd > new Date()) {
          return NextResponse.json({
            success: true,
            message: 'Ya tienes una prueba activa',
            trial_ends_at: existingConfig.trial_ends_at,
          });
        }
      }
      
      // Si ya tiene suscripción activa, no permitir trial
      if (status === 'active') {
        return NextResponse.json({
          success: false,
          error: 'Ya tienes una suscripción activa',
        }, { status: 400 });
      }
    }
    
    // 4. Calcular fecha de fin de trial (7 días desde ahora)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    
    // 5. Actualizar o crear configuración
    const { data: updatedConfig, error: updateError } = await supabaseAdmin
      .from('organization_messaging_config')
      .upsert({
        organization_id: organizationId,
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        tier: 'basic',
        whatsapp_api_provider: 'waha',
        whatsapp_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      })
      .select()
      .single();
    
    if (updateError) {
      console.error('[Start Trial] Error actualizando config:', updateError);
      return NextResponse.json(
        { error: 'Error iniciando prueba' },
        { status: 500 }
      );
    }
    
    console.log('[Start Trial] ✅ Prueba gratis iniciada exitosamente');
    
    return NextResponse.json({
      success: true,
      data: {
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        tier: 'basic',
        whatsapp_api_provider: 'waha',
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Start Trial] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado', details: error.message },
      { status: 500 }
    );
  }
}
