import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getWahaConfig, generateSessionName, getSessionStatus } from '@/lib/waha-sessions';

/**
 * GET /api/whatsapp/verify-session
 * Verifica si la sesión existe en WAHA y muestra su estado
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n=== VERIFICACIÓN DE SESIÓN EN WAHA ===');
    
    // 1. Obtener contexto
    const { organizationId } = await getTenantContext(request);
    console.log('Organization ID:', organizationId);
    
    // 2. Generar nombre de sesión
    const sessionName = generateSessionName(organizationId);
    console.log('Session Name:', sessionName);
    
    // 3. Obtener configuración WAHA
    const { url, key } = await getWahaConfig(organizationId);
    console.log('WAHA URL:', url);
    console.log('WAHA Key length:', key.length);
    
    // 4. Listar TODAS las sesiones en WAHA
    console.log('\n--- Listando TODAS las sesiones en WAHA ---');
    const listResponse = await fetch(`${url}/api/sessions`, {
      headers: { 'X-Api-Key': key }
    });
    
    const allSessions = await listResponse.json().catch(() => []);
    console.log('Total sesiones en WAHA:', Array.isArray(allSessions) ? allSessions.length : 'N/A');
    console.log('Sesiones encontradas:', allSessions);
    
    // 5. Buscar nuestra sesión específica
    const ourSession = Array.isArray(allSessions) 
      ? allSessions.find((s: any) => s.name === sessionName)
      : null;
    
    console.log('Nuestra sesión encontrada:', ourSession);
    
    // 6. Obtener estado específico de nuestra sesión
    console.log('\n--- Obteniendo estado de nuestra sesión ---');
    const sessionStatus = await getSessionStatus(sessionName, organizationId);
    console.log('Estado:', sessionStatus);
    
    // 7. Respuesta
    return NextResponse.json({
      success: true,
      diagnostico: {
        organizationId,
        sessionName,
        wahaUrl: url,
        totalSessionsInWaha: Array.isArray(allSessions) ? allSessions.length : 0,
        allSessionNames: Array.isArray(allSessions) ? allSessions.map((s: any) => s.name) : [],
        ourSessionExists: !!ourSession,
        ourSessionData: ourSession || null,
        sessionStatus: sessionStatus,
        problema: !ourSession ? 
          'La sesión NO existe en WAHA pero funciona = Está en memoria temporal o se eliminó' :
          'La sesión SÍ existe en WAHA'
      },
      recomendacion: !ourSession ?
        'Verifica la configuración de persistencia de WAHA. Puede que las sesiones no se estén guardando.' :
        'Todo bien, la sesión existe en WAHA'
    });
    
  } catch (error: any) {
    console.error('Error en verificación:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

