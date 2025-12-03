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

    const WAHA_URL = process.env.WAHA_API_URL;
    const WAHA_KEY = process.env.WAHA_API_KEY;

    if (!WAHA_URL || !WAHA_KEY) {
      console.error('[Check Connection] ❌ Variables de entorno faltantes');
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno no configuradas'
      }, { status: 500 });
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
      return NextResponse.json({
        success: false,
        error: `Error conectando a WAHA: ${fetchError.message}`
      }, { status: 500 });
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

