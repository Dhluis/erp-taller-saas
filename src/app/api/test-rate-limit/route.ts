import { NextRequest, NextResponse } from 'next/server';
import type { RateLimitConfig } from '@/lib/rate-limit/types';

// Configuración de prueba: 10 requests por minuto
const testConfig: RateLimitConfig = {
  identifier: 'ip',
  limit: 10,
  window: '1 m',
  prefix: 'test'
};

// Lazy import para evitar ejecución durante el build
async function getRateLimitModules() {
  // Verificar si Redis está disponible antes de importar módulos
  const { isRedisAvailable } = await import('@/lib/rate-limit/redis');
  
  if (!isRedisAvailable()) {
    return null;
  }

  const { applyRateLimit, createRateLimitHeaders } = await import('@/lib/rate-limit/middleware');
  const { redisHealthCheck } = await import('@/lib/rate-limit/redis');
  return { applyRateLimit, createRateLimitHeaders, redisHealthCheck };
}

export async function GET(request: NextRequest) {
  try {
    // DEBUG: Verificar variables de entorno directamente
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    console.log('\n' + '='.repeat(60));
    console.log('[Test Rate Limit] 🔍 DIAGNÓSTICO DE VARIABLES DE ENTORNO');
    console.log('='.repeat(60));
    console.log('[Test Rate Limit] NODE_ENV:', process.env.NODE_ENV);
    console.log('[Test Rate Limit] VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('[Test Rate Limit] UPSTASH_REDIS_REST_URL presente:', !!redisUrl);
    console.log('[Test Rate Limit] UPSTASH_REDIS_REST_URL length:', redisUrl?.length || 0);
    console.log('[Test Rate Limit] UPSTASH_REDIS_REST_URL preview:', redisUrl ? `${redisUrl.substring(0, 30)}...` : 'NO ENCONTRADA');
    console.log('[Test Rate Limit] UPSTASH_REDIS_REST_TOKEN presente:', !!redisToken);
    console.log('[Test Rate Limit] UPSTASH_REDIS_REST_TOKEN length:', redisToken?.length || 0);
    console.log('[Test Rate Limit] UPSTASH_REDIS_REST_TOKEN preview:', redisToken ? `${redisToken.substring(0, 10)}...` : 'NO ENCONTRADA');
    
    // Buscar todas las variables que contengan "UPSTASH" o "REDIS"
    const allEnvKeys = Object.keys(process.env).filter(key => 
      key.toUpperCase().includes('UPSTASH') || 
      key.toUpperCase().includes('REDIS')
    );
    console.log('[Test Rate Limit] Variables relacionadas encontradas:', allEnvKeys);
    console.log('='.repeat(60) + '\n');

    // Importar módulos solo si Redis está disponible
    const modules = await getRateLimitModules();
    
    if (!modules) {
      return NextResponse.json({
        error: 'Redis not configured',
        message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in Vercel Dashboard',
        config: testConfig,
        debug: {
          hasUrl: !!redisUrl,
          hasToken: !!redisToken,
          urlLength: redisUrl?.length || 0,
          tokenLength: redisToken?.length || 0,
          relatedEnvKeys: allEnvKeys,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV
        }
      }, { status: 503 });
    }

    const { applyRateLimit, createRateLimitHeaders, redisHealthCheck } = modules;

    // Health check de Redis
    const health = await redisHealthCheck();
    
    if (!health.healthy) {
      return NextResponse.json({
        error: 'Redis not connected',
        details: health.error,
        latency: health.latency
      }, { status: 503 });
    }

    // Aplicar rate limit
    const result = await applyRateLimit(request, testConfig);
    
    // Crear headers
    const headers = createRateLimitHeaders(result);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: result.limit,
          remaining: result.remaining,
          resetAt: new Date(result.reset).toISOString()
        },
        { 
          status: 429,
          headers
        }
      );
    }

    // Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        message: 'Rate limit test passed!',
        rateLimit: {
          limit: result.limit,
          remaining: result.remaining,
          reset: new Date(result.reset).toISOString(),
          warning: result.warning
        },
        redis: {
          healthy: health.healthy,
          latency: health.latency
        },
        timestamp: new Date().toISOString()
      },
      { headers }
    );

  } catch (error) {
    console.error('[Test Rate Limit] ❌ Error:', error);
    
    // Si el error es sobre Redis no configurado, retornar 503
    if (error instanceof Error && error.message.includes('Redis not configured')) {
      return NextResponse.json({
        error: 'Redis not configured',
        message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in Vercel Dashboard',
        details: error.message
      }, { status: 503 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

