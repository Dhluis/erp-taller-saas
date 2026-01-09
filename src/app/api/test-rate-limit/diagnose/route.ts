import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Obtener TODAS las variables de entorno (para diagnóstico completo)
    const allEnvKeys = Object.keys(process.env).sort();
    const envKeysWithRedis = allEnvKeys.filter(key => 
      key.toUpperCase().includes('UPSTASH') || 
      key.toUpperCase().includes('REDIS')
    );

    // Obtener todas las variables relacionadas con Redis
    const envVars = {
      UPSTASH_REDIS_REST_URL: redisUrl ? '✅ Configurada' : '❌ No configurada',
      UPSTASH_REDIS_REST_TOKEN: redisToken ? '✅ Configurada' : '❌ No configurada',
    };

    // Intentar conectar a Redis si las variables están configuradas
    let redisConnectionTest = null;
    if (redisUrl && redisToken) {
      try {
        const { redisHealthCheck } = await import('@/lib/rate-limit/redis');
        const health = await redisHealthCheck();
        redisConnectionTest = {
          success: health.healthy,
          latency: health.latency,
          error: health.error || null
        };
      } catch (error) {
        redisConnectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.name : 'UnknownError'
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'unknown',
        vercelUrl: process.env.VERCEL_URL || 'unknown',
        variables: envVars,
        allRedisKeys: envKeysWithRedis,
        envKeysWithRedis: envKeysWithRedis,
        totalEnvKeys: allEnvKeys.length,
        hasUPSTASH_REDIS_REST_URL: !!redisUrl,
        hasUPSTASH_REDIS_REST_TOKEN: !!redisToken,
        redisUrlValue: redisUrl ? 
          `${redisUrl.substring(0, 30)}...` : 
          'No disponible',
        redisTokenLength: redisToken ? redisToken.length : 0,
        redisConnectionTest,
        // Mostrar las primeras 20 variables de entorno (para diagnóstico)
        sampleEnvKeys: allEnvKeys.slice(0, 20),
        instructions: {
          step1: 'Ve a Vercel Dashboard > Tu Proyecto > Settings > Environment Variables',
          step2: 'Verifica que UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN estén configuradas',
          step3: 'Asegúrate de que estén seleccionadas para Production, Preview y Development',
          step4: 'IMPORTANTE: Haz REDEPLOY completo (sin usar caché)',
          step5: 'Ve a Deployments > Último deployment > ⋯ > Redeploy',
          step6: 'Desmarca "Use existing Build Cache"',
          step7: 'Espera a que el deployment termine completamente',
          step8: 'Recarga esta página para verificar'
        },
        troubleshooting: {
          note: 'Si las variables están configuradas pero no aparecen aquí, necesitas hacer redeploy',
          checkLogs: 'Revisa los logs de Vercel para ver si hay errores durante el build',
          verifyFormat: 'Asegúrate de que los nombres de las variables sean exactamente: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (sin espacios)',
          checkScope: 'Verifica que las variables estén configuradas para el ambiente correcto (Production, Preview, Development)'
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

