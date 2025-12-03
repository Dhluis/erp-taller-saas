import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

/**
 * DIAGNÓSTICO COMPLETO DE WAHA
 * Este endpoint prueba TODAS las operaciones de WAHA paso a paso
 */
export async function GET(request: NextRequest) {
  console.log('\n🔍 ========== DIAGNÓSTICO COMPLETO WAHA ==========\n');

  const results: any = {
    paso1_variables: {},
    paso2_tenant: {},
    paso3_listaSesiones: {},
    paso4_crearSesion: {},
    paso5_verificarCreacion: {},
    paso6_eliminarSesion: {},
    conclusiones: []
  };

  try {
    // ============================================
    // PASO 1: Verificar variables de entorno
    // ============================================
    console.log('📋 PASO 1: Verificando variables de entorno...');
    
    const WAHA_API_URL = process.env.WAHA_API_URL;
    const WAHA_API_KEY = process.env.WAHA_API_KEY;

    results.paso1_variables = {
      WAHA_API_URL: WAHA_API_URL ? `✅ ${WAHA_API_URL}` : '❌ FALTA',
      WAHA_API_KEY: WAHA_API_KEY ? `✅ ${WAHA_API_KEY.substring(0, 10)}...` : '❌ FALTA'
    };

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      results.conclusiones.push('❌ Variables de entorno no configuradas');
      return NextResponse.json(results, { status: 500 });
    }

    console.log('✅ Variables OK:', results.paso1_variables);

    // ============================================
    // PASO 2: Obtener contexto del tenant
    // ============================================
    console.log('\n📋 PASO 2: Obteniendo contexto del tenant...');
    
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext.success || !tenantContext.organizationId) {
      results.paso2_tenant = {
        success: false,
        error: tenantContext.error || 'No se pudo obtener organization_id'
      };
      results.conclusiones.push('❌ No se pudo obtener el contexto del tenant');
      return NextResponse.json(results, { status: 401 });
    }

    results.paso2_tenant = {
      success: true,
      organizationId: tenantContext.organizationId,
      workshopId: tenantContext.workshopId,
      userId: tenantContext.userId
    };

    console.log('✅ Tenant OK:', results.paso2_tenant);

    const sessionName = `org_${tenantContext.organizationId}`;
    const testSessionName = `test_${Date.now()}`;

    // ============================================
    // PASO 3: Listar sesiones existentes
    // ============================================
    console.log('\n📋 PASO 3: Listando sesiones existentes en WAHA...');
    
    try {
      const listResponse = await fetch(`${WAHA_API_URL}/api/sessions/all`, {
        method: 'GET',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const listData = await listResponse.json();
      
      results.paso3_listaSesiones = {
        success: listResponse.ok,
        status: listResponse.status,
        totalSesiones: Array.isArray(listData) ? listData.length : 0,
        sesiones: Array.isArray(listData) ? listData.map((s: any) => ({
          name: s.name,
          status: s.status,
          me: s.me
        })) : listData,
        tieneSessionOrganizacion: Array.isArray(listData) ? listData.some((s: any) => s.name === sessionName) : false
      };

      console.log('✅ Lista de sesiones:', results.paso3_listaSesiones);

      if (!listResponse.ok) {
        results.conclusiones.push(`❌ Error al listar sesiones: ${listResponse.status}`);
      }

    } catch (error: any) {
      results.paso3_listaSesiones = {
        success: false,
        error: error.message
      };
      results.conclusiones.push(`❌ No se pudo conectar a WAHA: ${error.message}`);
      console.error('❌ Error en PASO 3:', error);
    }

    // ============================================
    // PASO 4: Crear sesión de prueba
    // ============================================
    console.log('\n📋 PASO 4: Creando sesión de prueba en WAHA...');
    
    try {
      const createResponse = await fetch(`${WAHA_API_URL}/api/sessions/`, {
        method: 'POST',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: testSessionName,
          config: {
            noweb: {
              store: {
                enabled: true,
                fullSync: false,
              },
            },
          },
        }),
      });

      const createData = await createResponse.json();
      
      results.paso4_crearSesion = {
        success: createResponse.ok,
        status: createResponse.status,
        sessionName: testSessionName,
        response: createData
      };

      console.log('✅ Creación de sesión:', results.paso4_crearSesion);

      if (!createResponse.ok) {
        results.conclusiones.push(`⚠️ No se pudo crear sesión de prueba: ${createResponse.status}`);
      }

    } catch (error: any) {
      results.paso4_crearSesion = {
        success: false,
        error: error.message
      };
      console.error('❌ Error en PASO 4:', error);
    }

    // ============================================
    // PASO 5: Verificar que la sesión se creó
    // ============================================
    console.log('\n📋 PASO 5: Verificando que la sesión se creó...');
    
    try {
      // Esperar 2 segundos para que WAHA procese
      await new Promise(resolve => setTimeout(resolve, 2000));

      const verifyResponse = await fetch(`${WAHA_API_URL}/api/sessions/all`, {
        method: 'GET',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const verifyData = await verifyResponse.json();
      
      const testSessionExists = Array.isArray(verifyData) 
        ? verifyData.find((s: any) => s.name === testSessionName)
        : null;

      results.paso5_verificarCreacion = {
        success: verifyResponse.ok && !!testSessionExists,
        sessionEncontrada: !!testSessionExists,
        detallesSesion: testSessionExists || null
      };

      console.log('✅ Verificación:', results.paso5_verificarCreacion);

      if (!testSessionExists) {
        results.conclusiones.push('❌ CRÍTICO: La sesión se "creó" pero NO aparece en WAHA');
      } else {
        results.conclusiones.push('✅ La sesión se creó correctamente');
      }

    } catch (error: any) {
      results.paso5_verificarCreacion = {
        success: false,
        error: error.message
      };
      console.error('❌ Error en PASO 5:', error);
    }

    // ============================================
    // PASO 6: Eliminar sesión de prueba
    // ============================================
    console.log('\n📋 PASO 6: Limpiando sesión de prueba...');
    
    try {
      const deleteResponse = await fetch(`${WAHA_API_URL}/api/sessions/${testSessionName}`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      results.paso6_eliminarSesion = {
        success: deleteResponse.ok,
        status: deleteResponse.status
      };

      console.log('✅ Limpieza:', results.paso6_eliminarSesion);

    } catch (error: any) {
      results.paso6_eliminarSesion = {
        success: false,
        error: error.message
      };
      console.error('❌ Error en PASO 6:', error);
    }

    // ============================================
    // CONCLUSIONES FINALES
    // ============================================
    console.log('\n📊 ========== CONCLUSIONES ==========\n');

    if (results.conclusiones.length === 0) {
      results.conclusiones.push('✅ Todas las pruebas pasaron. El problema puede ser de sincronización.');
    }

    // Diagnóstico específico
    if (results.paso3_listaSesiones.success && results.paso3_listaSesiones.totalSesiones === 0) {
      results.conclusiones.push('⚠️ WAHA está vacío. Esto es normal si acabas de limpiar las sesiones.');
    }

    if (results.paso3_listaSesiones.tieneSessionOrganizacion) {
      results.conclusiones.push(`✅ La sesión "${sessionName}" YA EXISTE en WAHA`);
    } else {
      results.conclusiones.push(`⚠️ La sesión "${sessionName}" NO existe en WAHA`);
    }

    console.log('Conclusiones:', results.conclusiones);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    });

  } catch (error: any) {
    console.error('❌ Error general en diagnóstico:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      ...results
    }, { status: 500 });
  }
}
