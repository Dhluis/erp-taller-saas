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

    // ✅ OPCIÓN A: Obtener credenciales de WAHA desde BD (multi-tenant)
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const supabase = getSupabaseServiceClient();
    
    // Buscar configuración en ai_agent_config para esta organización
    const { data: config, error: configError } = await supabase
      .from('ai_agent_config')
      .select('policies, whatsapp_session_name')
      .eq('organization_id', organizationId)
      .maybeSingle(); // Usar maybeSingle() en lugar de single() para no fallar si no existe
    
    let wahaUrl: string | undefined;
    let wahaKey: string | undefined;
    let sessionName: string | undefined;
    
    if (config && config.policies) {
      const policies = config.policies as any;
      // Intentar obtener credenciales desde policies
      wahaUrl = policies.waha_api_url || policies.WAHA_API_URL;
      wahaKey = policies.waha_api_key || policies.WAHA_API_KEY;
      sessionName = config.whatsapp_session_name;
      
      console.log('[Check Connection] 🔍 Config encontrada en BD:', {
        has_waha_url: !!wahaUrl,
        has_waha_key: !!wahaKey,
        has_session_name: !!sessionName,
        waha_config_type: policies.waha_config_type
      });
    } else if (configError) {
      console.warn('[Check Connection] ⚠️ Error obteniendo config de BD:', configError.message);
    } else {
      console.log('[Check Connection] ℹ️ No hay configuración en BD para esta organización');
    }
    
    // Fallback a variables de entorno si no hay configuración en BD (servidor compartido)
    if (!wahaUrl || !wahaKey) {
      wahaUrl = process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL;
      wahaKey = process.env.WAHA_API_KEY || process.env.NEXT_PUBLIC_WAHA_API_KEY;
      console.log('[Check Connection] 🔄 Usando variables de entorno (fallback):', {
        has_waha_url: !!wahaUrl,
        has_waha_key: !!wahaKey
      });
    }
    
    // Si no hay credenciales disponibles, devolver estado PENDING (no error 500)
    if (!wahaUrl || !wahaKey) {
      console.log('[Check Connection] ❌ No hay credenciales de WAHA disponibles');
      return NextResponse.json({
        success: false,
        status: 'PENDING',
        connected: false,
        message: 'No hay configuración de WAHA. Por favor, completa el wizard de configuración.'
      }, { status: 200 }); // ⚠️ Devolver 200, no 500
    }
    
    // Generar nombre de sesión si no existe en BD
    if (!sessionName) {
      const cleanId = organizationId.replace(/-/g, '').substring(0, 20);
      sessionName = `eagles_${cleanId}`;
      console.log('[Check Connection] 🔄 Generando session name:', sessionName);
    } else {
      console.log('[Check Connection] ✅ Usando session name de BD:', sessionName);
    }

    // Obtener estado de la sesión directamente de WAHA
    let statusResponse;
    try {
      statusResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
        headers: { 'X-Api-Key': wahaKey }
      });
    } catch (fetchError: any) {
      console.error('[Check Connection] ❌ Error fetch a WAHA:', fetchError.message);
      return NextResponse.json({
        success: false,
        status: 'ERROR',
        connected: false,
        message: `Error conectando a WAHA: ${fetchError.message}`
      }, { status: 200 }); // ⚠️ Devolver 200, no 500
    }

    if (!statusResponse.ok) {
      console.log('[Check Connection] Sesión no encontrada en WAHA (status:', statusResponse.status, ')');
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'NOT_FOUND',
        message: 'Sesión no encontrada en WAHA'
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
        const updateData: any = {
          whatsapp_session_name: sessionName,
          whatsapp_connected: true,
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
    
    // Si es un error de configuración, devolver 200 con estado PENDING
    if (error.message?.includes('configuración') || 
        error.message?.includes('Variables de entorno') ||
        error.message?.includes('WAHA')) {
      return NextResponse.json({
        success: false,
        status: 'PENDING',
        connected: false,
        message: 'No hay configuración de WAHA. Por favor, completa el wizard de configuración.'
      }, { status: 200 });
    }
    
    // Para otros errores críticos, mantener 500
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      connected: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

