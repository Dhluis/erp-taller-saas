import { NextRequest, NextResponse } from 'next/server';

/**
 * Test directo a WAHA sin intermediarios
 * Verifica conectividad y credenciales
 */
export async function GET() {
  try {
    const WAHA_URL = process.env.WAHA_API_URL?.replace(/\/$/, '');
    const WAHA_KEY = process.env.WAHA_API_KEY;

    console.log('=== TEST DIRECTO WAHA ===');
    console.log('URL:', WAHA_URL);
    console.log('Key:', WAHA_KEY ? `${WAHA_KEY.substring(0, 5)}...` : 'NO CONFIGURADO');

    if (!WAHA_URL || !WAHA_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno no configuradas',
        details: {
          WAHA_API_URL: WAHA_URL || 'FALTA',
          WAHA_API_KEY: WAHA_KEY ? 'CONFIGURADO' : 'FALTA'
        }
      }, { status: 500 });
    }

    // TEST 1: Listar sesiones
    console.log('\n--- TEST 1: Listar todas las sesiones ---');
    const listUrl = `${WAHA_URL}/api/sessions`;
    console.log('Request URL:', listUrl);
    
    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_KEY
      }
    });

    console.log('Response status:', listResponse.status);
    console.log('Response ok:', listResponse.ok);
    
    const listData = await listResponse.text();
    console.log('Response body:', listData.substring(0, 1000));
    
    let sessions: any = [];
    try {
      sessions = JSON.parse(listData);
    } catch (e) {
      console.error('Error parseando JSON:', e);
    }

    // TEST 2: Crear una sesión de prueba
    console.log('\n--- TEST 2: Crear sesión de prueba ---');
    const testSessionName = `test_${Date.now()}`;
    console.log('Session name:', testSessionName);
    
    const createUrl = `${WAHA_URL}/api/sessions`;
    const createBody = {
      name: testSessionName,
      start: true
    };
    
    console.log('Request URL:', createUrl);
    console.log('Request body:', JSON.stringify(createBody, null, 2));
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createBody)
    });

    console.log('Create response status:', createResponse.status);
    const createData = await createResponse.text();
    console.log('Create response body:', createData);

    // TEST 3: Verificar si se creó
    console.log('\n--- TEST 3: Verificar sesión creada ---');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verifyResponse = await fetch(`${WAHA_URL}/api/sessions/${testSessionName}`, {
      headers: { 'X-Api-Key': WAHA_KEY }
    });
    
    console.log('Verify status:', verifyResponse.status);
    const verifyData = await verifyResponse.text();
    console.log('Verify body:', verifyData.substring(0, 500));

    // TEST 4: Eliminar sesión de prueba
    console.log('\n--- TEST 4: Eliminar sesión de prueba ---');
    const deleteResponse = await fetch(`${WAHA_URL}/api/sessions/${testSessionName}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': WAHA_KEY }
    });
    console.log('Delete status:', deleteResponse.status);

    // RESULTADO
    return NextResponse.json({
      success: true,
      tests: {
        test1_listar: {
          status: listResponse.status,
          ok: listResponse.ok,
          totalSesiones: Array.isArray(sessions) ? sessions.length : 0,
          sesiones: sessions
        },
        test2_crear: {
          status: createResponse.status,
          ok: createResponse.ok,
          response: createData
        },
        test3_verificar: {
          status: verifyResponse.status,
          ok: verifyResponse.ok,
          existe: verifyResponse.status === 200
        },
        test4_eliminar: {
          status: deleteResponse.status,
          ok: deleteResponse.ok
        }
      },
      diagnostico: {
        wahaUrl: WAHA_URL,
        wahaKey: `${WAHA_KEY.substring(0, 5)}...${WAHA_KEY.substring(WAHA_KEY.length - 5)}`,
        puedeListar: listResponse.ok,
        puedeCrear: createResponse.ok || createResponse.status === 409,
        puedeVerificar: verifyResponse.status === 200,
        puedeEliminar: deleteResponse.ok
      },
      conclusiones: {
        conexion: listResponse.ok ? 'WAHA accesible ✅' : 'WAHA inaccesible ❌',
        credenciales: listResponse.status === 401 ? 'API Key incorrecta ❌' : 'API Key correcta ✅',
        funcionamiento: createResponse.ok ? 'WAHA funciona correctamente ✅' : 
                       createResponse.status === 409 ? 'WAHA funciona (sesión ya existía) ✅' :
                       `Error en WAHA: ${createResponse.status} ❌`,
        persistencia: verifyResponse.status === 200 ? 'Sesiones se persisten ✅' : 
                     'Sesiones NO se persisten o no existen ❌'
      }
    });

  } catch (error: any) {
    console.error('ERROR EN TEST:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

