import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

/**
 * POST /api/whatsapp/check-connection
 * Verifica si la sesión se conectó en WAHA después de escanear el QR
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n=== [Check Connection] Verificando conexión ===');
    
    const { organizationId } = await getTenantContext(request);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organization_id'
      }, { status: 401 });
    }

    const WAHA_URL = process.env.WAHA_API_URL;
    const WAHA_KEY = process.env.WAHA_API_KEY;

    if (!WAHA_URL || !WAHA_KEY) {
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
    const statusResponse = await fetch(`${WAHA_URL}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': WAHA_KEY }
    });

    if (!statusResponse.ok) {
      console.log('[Check Connection] Sesión no encontrada en WAHA');
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
      } catch (dbError) {
        console.warn('[Check Connection] ⚠️ Error actualizando BD:', dbError);
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
    console.error('[Check Connection] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

