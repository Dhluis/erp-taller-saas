import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Obtener TODAS las variables de entorno
  const allEnvKeys = Object.keys(process.env).sort();
  
  // Filtrar variables relacionadas con Redis/Upstash
  const redisRelatedKeys = allEnvKeys.filter(key => 
    key.toUpperCase().includes('UPSTASH') || 
    key.toUpperCase().includes('REDIS')
  );

  // Crear objeto con todas las variables (valores parcialmente ocultos por seguridad)
  const allEnvVars = allEnvKeys.reduce((acc, key) => {
    const value = process.env[key];
    // No mostrar valores completos por seguridad, solo preview
    acc[key] = {
      exists: !!value,
      length: value?.length || 0,
      preview: value ? 
        (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') || key.includes('PASSWORD') ?
          `${value.substring(0, 5)}...${value.substring(value.length - 3)}` :
          value.length > 50 ? `${value.substring(0, 30)}...` : value
        ) : null,
      // Para variables de Redis, mostrar más información
      isRedisRelated: key.toUpperCase().includes('UPSTASH') || key.toUpperCase().includes('REDIS')
    };
    return acc;
  }, {} as Record<string, { exists: boolean; length: number; preview: string | null; isRedisRelated: boolean }>);

  // Variables específicas de Redis
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: {
      totalEnvVars: allEnvKeys.length,
      redisRelatedCount: redisRelatedKeys.length,
      redisConfigured: !!(redisUrl && redisToken),
      redisUrlExists: !!redisUrl,
      redisTokenExists: !!redisToken
    },
    redisVariables: {
      UPSTASH_REDIS_REST_URL: {
        exists: !!redisUrl,
        length: redisUrl?.length || 0,
        value: redisUrl || 'NOT FOUND',
        preview: redisUrl ? `${redisUrl.substring(0, 40)}...` : null
      },
      UPSTASH_REDIS_REST_TOKEN: {
        exists: !!redisToken,
        length: redisToken?.length || 0,
        value: redisToken ? '***HIDDEN***' : 'NOT FOUND',
        preview: redisToken ? `${redisToken.substring(0, 10)}...` : null
      }
    },
    allRedisRelatedKeys: redisRelatedKeys,
    // Mostrar todas las variables que contengan "UPSTASH" o "REDIS"
    redisEnvVars: redisRelatedKeys.reduce((acc, key) => {
      const value = process.env[key];
      acc[key] = {
        exists: !!value,
        length: value?.length || 0,
        preview: key.includes('TOKEN') || key.includes('KEY') ?
          `${value?.substring(0, 5)}...${value?.substring((value?.length || 0) - 3)}` :
          value ? (value.length > 50 ? `${value.substring(0, 30)}...` : value) : null
      };
      return acc;
    }, {} as Record<string, { exists: boolean; length: number; preview: string | null }>),
    // Mostrar primeras 30 variables de entorno (para debugging)
    sampleEnvVars: allEnvKeys.slice(0, 30).reduce((acc, key) => {
      const value = process.env[key];
      acc[key] = {
        exists: !!value,
        length: value?.length || 0,
        preview: value ? 
          (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') ?
            `${value.substring(0, 5)}...` :
            value.length > 30 ? `${value.substring(0, 30)}...` : value
          ) : null
      };
      return acc;
    }, {} as Record<string, { exists: boolean; length: number; preview: string | null }>),
    instructions: {
      step1: 'Verifica en Vercel Dashboard > Settings > Environment Variables',
      step2: 'Asegúrate de que las variables estén configuradas para "Production"',
      step3: 'Verifica que los nombres sean EXACTAMENTE: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN',
      step4: 'Haz redeploy SIN caché después de agregar/modificar variables',
      step5: 'Si las variables no aparecen aquí, pueden estar en otro ambiente o con otro nombre'
    },
    troubleshooting: {
      commonIssues: [
        'Variables configuradas solo para Development/Preview pero no para Production',
        'Nombres de variables con espacios o mayúsculas/minúsculas incorrectas',
        'Variables agregadas después del último deployment (necesita redeploy)',
        'Variables en otro proyecto de Vercel',
        'Variables con valores vacíos'
      ],
      checkInVercel: [
        'Ve a Vercel Dashboard > Tu Proyecto > Settings > Environment Variables',
        'Busca UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN',
        'Verifica que el scope incluya "Production"',
        'Verifica que los valores no estén vacíos',
        'Si están ahí, elimínalas y vuelve a crearlas',
        'Haz redeploy sin caché'
      ]
    }
  });
}

