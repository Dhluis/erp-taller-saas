import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Obtener variables directamente
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Buscar todas las variables que contengan "UPSTASH" o "REDIS"
  const allEnvKeys = Object.keys(process.env);
  const redisRelatedKeys = allEnvKeys.filter(key => 
    key.toUpperCase().includes('UPSTASH') || 
    key.toUpperCase().includes('REDIS')
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL
    },
    redisVariables: {
      UPSTASH_REDIS_REST_URL: {
        exists: !!redisUrl,
        length: redisUrl?.length || 0,
        preview: redisUrl ? `${redisUrl.substring(0, 40)}...` : null,
        fullValue: redisUrl || 'NOT FOUND'
      },
      UPSTASH_REDIS_REST_TOKEN: {
        exists: !!redisToken,
        length: redisToken?.length || 0,
        preview: redisToken ? `${redisToken.substring(0, 10)}...` : null,
        fullValue: redisToken || 'NOT FOUND'
      }
    },
    allRedisRelatedKeys: redisRelatedKeys,
    allEnvKeysCount: allEnvKeys.length,
    // Mostrar todas las variables que contengan "UPSTASH" o "REDIS" con sus valores (parcialmente ocultos)
    redisEnvVars: redisRelatedKeys.reduce((acc, key) => {
      const value = process.env[key];
      acc[key] = {
        exists: !!value,
        length: value?.length || 0,
        preview: value ? `${value.substring(0, 20)}...` : null
      };
      return acc;
    }, {} as Record<string, { exists: boolean; length: number; preview: string | null }>),
    status: (redisUrl && redisToken) ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO',
    message: (redisUrl && redisToken) 
      ? 'Redis está configurado correctamente'
      : 'Redis NO está configurado. Verifica las variables de entorno en Vercel Dashboard.'
  });
}

