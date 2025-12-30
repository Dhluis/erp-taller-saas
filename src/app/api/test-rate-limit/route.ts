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
    // Importar módulos solo si Redis está disponible
    const modules = await getRateLimitModules();
    
    if (!modules) {
      return NextResponse.json({
        error: 'Redis not configured',
        message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in Vercel Dashboard',
        config: testConfig
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

