import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

/**
 * POST /api/whatsapp/check-connection
 * Verifica si la sesión se conectó en WAHA después de escanear el QR
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n=== [Check Connection] Verificando conexión ===');
    
    let organizationId: string | undefined;
    
    try {
      const context = await getTenantContext(request);
      organizationId = context.organizationId;
    } catch (tenantError: any) {
      console.error('[Check Connection] ❌ Error obteniendo tenant context:', tenantError.message);
      return NextResponse.json({
        success: false,
        error: `Error de autenticación: ${tenantError.message}`
      }, { status: 401 });
    }
    
    if (!organizationId) {
      console.error('[Check Connection] ❌ No hay organizationId');
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organization_id'
      }, { status: 401 });
    }

    console.log('[Check Connection] ✅ Organization ID:', organizationId);

    let WAHA_URL = process.env.WAHA_API_URL;
    let WAHA_KEY = process.env.WAHA_API_KEY;

    // Si no hay env vars, intentar cargar de la configuración guardada en BD
    if (!WAHA_URL || !WAHA_KEY) {
      try {
        const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
        const supabase = getSupabaseServiceClient();
        const { data: cfg } = await supabase
          .from('ai_agent_config')
          .select('policies')
          .eq('organization_id', organizationId)
          .single();
        const policies = (cfg?.policies as any) || {};
        WAHA_URL = WAHA_URL || policies.waha_api_url || policies.WAHA_API_URL;
        WAHA_KEY = WAHA_KEY || policies.waha_api_key || policies.WAHA_API_KEY;
      } catch (cfgErr: any) {
        console.warn('[Check Connection] ⚠️ No se pudo leer configuración WAHA de BD:', cfgErr?.message);
      }
    }

    if (!WAHA_URL || !WAHA_KEY) {
      console.error('[Check Connection] ❌ WAHA no configurado: faltan WAHA_API_URL / WAHA_API_KEY (ni env ni policies)');
      // No romper el flujo: responder 200 con estado pendiente para no cortar el frontend
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'PENDING',
        message: 'WAHA no configurado (sin URL/API key en env ni en configuración). Completa la config en WhatsApp.'
      });
    }

    // Generar nombre de sesión
    const cleanId = organizationId.replace(/-/g, '').substring(0, 20);
    const sessionName = `eagles_${cleanId}`;
    
    console.log('[Check Connection] Session name:', sessionName);

    // Obtener estado de la sesión directamente de WAHA
    let statusResponse;
    try {
      statusResponse = await fetch(`${WAHA_URL}/api/sessions/${sessionName}`, {
        headers: { 'X-Api-Key': WAHA_KEY }
      });
    } catch (fetchError: any) {
      console.error('[Check Connection] ❌ Error fetch a WAHA:', fetchError.message);
      // No romper el front: responder 200 con estado pendiente
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'PENDING',
        message: 'WAHA no respondió, reintenta en unos segundos'
      });
    }

    if (!statusResponse.ok) {
      console.log('[Check Connection] Sesión no encontrada o error en WAHA (status:', statusResponse.status, ')');
      const isServerError = statusResponse.status >= 500;
      return NextResponse.json({
        success: true,
        connected: false,
        status: isServerError ? 'PENDING' : 'NOT_FOUND',
        message: isServerError
          ? 'WAHA respondió con error temporal. Reintenta en unos segundos.'
          : 'Sesión no encontrada en WAHA'
      });
    }

    const statusData = await statusResponse.json();
    console.log('[Check Connection] Estado en WAHA:', statusData.status);
    console.log('[Check Connection] Datos completos:', statusData);

    // Si está WORKING, actualizar BD
    if (statusData.status === 'WORKING') {
      const phone = statusData.me?.id?.split('@')[0] || 
                    statusData.me?.phone || 
                    statusData.me?.user || 
                    null;
      
      console.log('[Check Connection] ✅ Sesión conectada! Phone:', phone);

      // Actualizar BD
      try {
        const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
        const supabase = getSupabaseServiceClient();
        
        const updateData: any = {
          whatsapp_session_name: sessionName,
          updated_at: new Date().toISOString()
        };
        
        if (phone) {
          updateData.whatsapp_phone = phone;
        }

        // Intentar actualizar usando cast a any para evitar errores de tipos
        await (supabase.from('ai_agent_config') as any)
          .update(updateData)
          .eq('organization_id', organizationId);
        
        console.log('[Check Connection] ✅ BD actualizada');
      } catch (dbError: any) {
        console.warn('[Check Connection] ⚠️ Error actualizando BD:', dbError.message);
      }

      return NextResponse.json({
        success: true,
        connected: true,
        status: 'WORKING',
        phone,
        message: 'WhatsApp conectado exitosamente'
      });
    }

    // Otros estados
    return NextResponse.json({
      success: true,
      connected: false,
      status: statusData.status,
      message: `Estado actual: ${statusData.status}`
    });

  } catch (error: any) {
    console.error('[Check Connection] ❌ Error general:', error.message, error.stack);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

