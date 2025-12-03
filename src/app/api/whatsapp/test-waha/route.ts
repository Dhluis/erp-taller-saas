import { NextResponse } from 'next/server';

/**
 * Endpoint de diagnóstico directo de WAHA
 * Prueba la conexión y obtención de QR sin lógica intermedia
 */
export async function GET() {
  try {
    const WAHA_URL = process.env.WAHA_API_URL;
    const WAHA_KEY = process.env.WAHA_API_KEY;
    const SESSION_NAME = 'eagles_042ab6bd8979416688';  // Tu sesión actual

    console.log('=== DIAGNÓSTICO WAHA DIRECTO ===');
    console.log('URL:', WAHA_URL);
    console.log('Key length:', WAHA_KEY?.length);
    console.log('Session:', SESSION_NAME);

    if (!WAHA_URL || !WAHA_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno no configuradas',
        details: {
          hasUrl: !!WAHA_URL,
          hasKey: !!WAHA_KEY
        }
      }, { status: 500 });
    }

    // 1. Test de conectividad básica
    console.log('\n1. Probando conectividad básica...');
    const pingResponse = await fetch(`${WAHA_URL}/api/sessions`, {
      headers: { 'X-Api-Key': WAHA_KEY }
    });
    
    const pingData = await pingResponse.json().catch(() => null);
    console.log('Ping response:', pingResponse.status, pingData);

    // 2. Obtener estado de la sesión
    console.log('\n2. Obteniendo estado de sesión...');
    const statusResponse = await fetch(`${WAHA_URL}/api/sessions/${SESSION_NAME}`, {
      headers: { 'X-Api-Key': WAHA_KEY }
    });
    
    const statusData = await statusResponse.json().catch(() => null);
    console.log('Status response:', statusResponse.status, statusData);

    // 3. Intentar obtener QR
    console.log('\n3. Intentando obtener QR...');
    const qrResponse = await fetch(`${WAHA_URL}/api/${SESSION_NAME}/auth/qr?format=raw`, {
      headers: { 'X-Api-Key': WAHA_KEY }
    });
    
    const qrData = await qrResponse.json().catch(() => null);
    console.log('QR response status:', qrResponse.status);
    console.log('QR response data:', {
      type: typeof qrData,
      keys: qrData ? Object.keys(qrData) : [],
      hasValue: !!qrData?.value,
      hasData: !!qrData?.data,
      valueLength: qrData?.value?.length || 0,
      dataLength: qrData?.data?.length || 0,
      fullData: JSON.stringify(qrData).substring(0, 300)
    });

    // 4. Si no hay QR y el estado es STOPPED/FAILED, intentar iniciar
    if (statusData?.status === 'STOPPED' || statusData?.status === 'FAILED') {
      console.log('\n4. Sesión detenida, intentando iniciar...');
      const startResponse = await fetch(`${WAHA_URL}/api/sessions/${SESSION_NAME}/start`, {
        method: 'POST',
        headers: { 'X-Api-Key': WAHA_KEY }
      });
      console.log('Start response:', startResponse.status);
      
      // Esperar y verificar de nuevo
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newStatusResponse = await fetch(`${WAHA_URL}/api/sessions/${SESSION_NAME}`, {
        headers: { 'X-Api-Key': WAHA_KEY }
      });
      const newStatusData = await newStatusResponse.json().catch(() => null);
      console.log('Nuevo estado:', newStatusData?.status);
      
      // Intentar obtener QR de nuevo
      const newQrResponse = await fetch(`${WAHA_URL}/api/${SESSION_NAME}/auth/qr?format=raw`, {
        headers: { 'X-Api-Key': WAHA_KEY }
      });
      const newQrData = await newQrResponse.json().catch(() => null);
      console.log('QR después de iniciar:', {
        hasValue: !!newQrData?.value,
        hasData: !!newQrData?.data,
        valueLength: newQrData?.value?.length || 0
      });
    }

    return NextResponse.json({
      success: true,
      diagnostico: {
        conectividad: {
          status: pingResponse.status,
          ok: pingResponse.ok
        },
        sesion: {
          existe: statusResponse.status !== 404,
          status: statusData?.status,
          conectada: statusData?.status === 'WORKING'
        },
        qr: {
          disponible: qrResponse.status === 200,
          status: qrResponse.status,
          hasValue: !!qrData?.value,
          hasData: !!qrData?.data,
          valueLength: qrData?.value?.length || 0,
          dataLength: qrData?.data?.length || 0,
          value: qrData?.value || qrData?.data || null
        }
      },
      logs: 'Revisa los logs del servidor para más detalles'
    });

  } catch (error: any) {
    console.error('ERROR EN DIAGNÓSTICO:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
