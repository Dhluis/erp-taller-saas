/**
 * TEST ENDPOINT - Verificar variables de entorno
 * 
 * GET /api/whatsapp/test-env
 * 
 * Este endpoint ayuda a diagnosticar problemas con variables de entorno
 * en Vercel. NO usar en producción sin autenticación.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const wahaUrl = process.env.WAHA_API_URL;
    const wahaKey = process.env.WAHA_API_KEY;
    const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Obtener todas las variables relacionadas con WAHA
    const envVars = {
      WAHA_API_URL: wahaUrl ? '✅ Configurada' : '❌ No configurada',
      WAHA_API_KEY: wahaKey ? '✅ Configurada' : '❌ No configurada',
      NEXT_PUBLIC_WAHA_API_URL: process.env.NEXT_PUBLIC_WAHA_API_URL ? '✅ Configurada' : '❌ No configurada',
      NEXT_PUBLIC_WAHA_API_KEY: process.env.NEXT_PUBLIC_WAHA_API_KEY ? '✅ Configurada' : '❌ No configurada',
      NEXT_PUBLIC_APP_URL: nextPublicAppUrl ? '✅ Configurada' : '❌ No configurada',
    };

    // Obtener todas las claves de entorno que contienen "WAHA"
    const allWahaKeys = Object.keys(process.env).filter(key => 
      key.includes('WAHA') || key.includes('waha')
    );

    // Intentar conectar a WAHA si las variables están configuradas
    let wahaConnectionTest = null;
    if (wahaUrl && wahaKey) {
      try {
        const testResponse = await fetch(`${wahaUrl}/api/sessions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaKey
          },
          // Timeout de 5 segundos
          signal: AbortSignal.timeout(5000)
        });

        wahaConnectionTest = {
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
          message: testResponse.ok 
            ? '✅ Conexión exitosa con WAHA' 
            : `❌ Error HTTP ${testResponse.status}: ${testResponse.statusText}`
        };
      } catch (error: any) {
        wahaConnectionTest = {
          success: false,
          error: error.message || 'Error desconocido',
          message: `❌ No se pudo conectar a WAHA: ${error.message}`,
          type: error.name || 'UnknownError'
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'unknown',
        variables: envVars,
        allWahaKeys: allWahaKeys,
        hasWAHA_API_URL: !!wahaUrl,
        hasWAHA_API_KEY: !!wahaKey,
        wahaUrlValue: wahaUrl ? 
          `${wahaUrl.substring(0, 30)}...` : 
          'No disponible',
        wahaConnectionTest,
        instructions: {
          step1: 'Ve a Vercel Dashboard > Tu Proyecto > Settings > Environment Variables',
          step2: 'Agrega WAHA_API_URL con valor: https://waha-erp-eagles-sistem.0rfifc.easypanel.host',
          step3: 'Agrega WAHA_API_KEY con valor: mi_clave_segura_2025',
          step4: 'Selecciona todos los ambientes (Production, Preview, Development)',
          step5: 'Guarda y haz REDEPLOY completo (no solo push)',
          step6: 'Espera a que el deployment termine completamente'
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

