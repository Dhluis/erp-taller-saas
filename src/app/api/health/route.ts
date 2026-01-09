import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Health check endpoint - Verifica conectividad básica
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message: string; details?: any }> = {};

  // 1. Verificar variables de entorno críticas
  checks.env = {
    status: 'ok',
    message: 'Variables de entorno verificadas',
    details: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasWahaUrl: !!(process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL),
      hasWahaKey: !!(process.env.WAHA_API_KEY || process.env.NEXT_PUBLIC_WAHA_API_KEY),
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    }
  };

  // 2. Verificar conexión a Supabase
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (error) {
      checks.supabase = {
        status: 'error',
        message: `Error conectando a Supabase: ${error.message}`,
        details: { code: error.code, hint: error.hint }
      };
    } else {
      checks.supabase = {
        status: 'ok',
        message: 'Conexión a Supabase OK',
        details: { canQuery: true }
      };
    }
  } catch (error: any) {
    checks.supabase = {
      status: 'error',
      message: `Error en conexión Supabase: ${error.message}`,
      details: { error: error.toString() }
    };
  }

  // 3. Verificar WAHA (opcional)
  try {
    const wahaUrl = process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL;
    const wahaKey = process.env.WAHA_API_KEY || process.env.NEXT_PUBLIC_WAHA_API_KEY;
    
    if (wahaUrl && wahaKey) {
      const response = await fetch(`${wahaUrl}/api/sessions`, {
        headers: { 'X-Api-Key': wahaKey },
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });
      
      if (response.ok) {
        checks.waha = {
          status: 'ok',
          message: 'Conexión a WAHA OK',
          details: { status: response.status }
        };
      } else {
        checks.waha = {
          status: 'error',
          message: `WAHA respondió con error: ${response.status}`,
          details: { status: response.status }
        };
      }
    } else {
      checks.waha = {
        status: 'ok',
        message: 'WAHA no configurado (opcional)',
        details: { configured: false }
      };
    }
  } catch (error: any) {
    checks.waha = {
      status: 'error',
      message: `Error conectando a WAHA: ${error.message}`,
      details: { error: error.toString() }
    };
  }

  // 4. Verificar Upstash Redis (opcional)
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (redisUrl && redisToken) {
      const response = await fetch(`${redisUrl}/ping`, {
        headers: { 'Authorization': `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(3000) // 3 segundos timeout
      });
      
      if (response.ok) {
        checks.upstash = {
          status: 'ok',
          message: 'Conexión a Upstash Redis OK',
          details: { status: response.status }
        };
      } else {
        checks.upstash = {
          status: 'error',
          message: `Upstash respondió con error: ${response.status}`,
          details: { status: response.status }
        };
      }
    } else {
      checks.upstash = {
        status: 'ok',
        message: 'Upstash Redis no configurado (opcional, rate limiting deshabilitado)',
        details: { configured: false }
      };
    }
  } catch (error: any) {
    checks.upstash = {
      status: 'ok', // No es crítico si falla
      message: `Upstash Redis no disponible: ${error.message}`,
      details: { error: error.toString(), note: 'No crítico - rate limiting deshabilitado' }
    };
  }

  // Calcular estado general
  const criticalChecks = ['env', 'supabase'];
  const criticalErrors = criticalChecks.filter(key => checks[key]?.status === 'error');
  const overallStatus = criticalErrors.length === 0 ? 'healthy' : 'unhealthy';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: Object.keys(checks).length,
      ok: Object.values(checks).filter(c => c.status === 'ok').length,
      errors: Object.values(checks).filter(c => c.status === 'error').length,
      criticalErrors: criticalErrors.length
    }
  }, {
    status: overallStatus === 'healthy' ? 200 : 503
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

