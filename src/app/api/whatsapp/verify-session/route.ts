import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

/**
 * VERIFICAR SESIÓN ESPECÍFICA
 * Busca la sesión de la organización actual en WAHA
 */
export async function GET(request: NextRequest) {
  console.log('\n🔍 ========== VERIFICAR SESIÓN ==========\n');

  try {
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext.success || !tenantContext.organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener organization_id'
      }, { status: 401 });
    }

    const sessionName = `org_${tenantContext.organizationId}`;
    console.log('🔍 Buscando sesión:', sessionName);

    // Variables de entorno
    const WAHA_API_URL = process.env.WAHA_API_URL;
    const WAHA_API_KEY = process.env.WAHA_API_KEY;

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno no configuradas'
      }, { status: 500 });
    }

    // Listar TODAS las sesiones en WAHA
    const listResponse = await fetch(`${WAHA_API_URL}/api/sessions/all`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `WAHA respondió con error: ${listResponse.status}`,
        details: await listResponse.text()
      }, { status: listResponse.status });
    }

    const allSessions = await listResponse.json();
    console.log('📋 Total de sesiones en WAHA:', Array.isArray(allSessions) ? allSessions.length : 0);

    // Buscar la sesión específica
    const mySession = Array.isArray(allSessions) 
      ? allSessions.find((s: any) => s.name === sessionName)
      : null;

    console.log('🔍 Sesión encontrada:', mySession ? 'SÍ' : 'NO');

    return NextResponse.json({
      success: true,
      organizationId: tenantContext.organizationId,
      sessionName,
      sessionExists: !!mySession,
      sessionDetails: mySession || null,
      allSessionsCount: Array.isArray(allSessions) ? allSessions.length : 0,
      allSessionNames: Array.isArray(allSessions) 
        ? allSessions.map((s: any) => s.name)
        : [],
      waha: {
        url: WAHA_API_URL,
        connected: true
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando sesión:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
