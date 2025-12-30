import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, createRateLimitHeaders } from '@/lib/rate-limit/middleware';
import { redisHealthCheck } from '@/lib/rate-limit/redis';
import type { RateLimitConfig } from '@/lib/rate-limit/types';

// Configuración de prueba: 10 requests por minuto
const testConfig: RateLimitConfig = {
  identifier: 'ip',
  limit: 10,
  window: '1 m',
  prefix: 'test'
};

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

