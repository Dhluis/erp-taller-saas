import { NextResponse } from 'next/server';

/**
 * Función helper para limpiar saltos de línea de variables de entorno
 * Esto corrige el problema cuando las variables se agregan con echo o tienen \r\n
 */
function cleanEnvVar(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
}

export async function GET() {
  // Limpiar TODAS las variables de entorno antes de usarlas
  const supabaseUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const wahaUrl = cleanEnvVar(process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL);
  const openaiKey = cleanEnvVar(process.env.OPENAI_API_KEY);
  const upstashUrl = cleanEnvVar(process.env.UPSTASH_REDIS_REST_URL);
  const appUrl = cleanEnvVar(process.env.NEXT_PUBLIC_APP_URL);
  const vercelUrl = cleanEnvVar(process.env.VERCEL_URL);

  return NextResponse.json({
    supabase: {
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : undefined,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    waha: {
      url: wahaUrl,
      hasKey: !!(process.env.WAHA_API_KEY || process.env.NEXT_PUBLIC_WAHA_API_KEY),
    },
    openai: {
      hasKey: !!openaiKey,
      keyPrefix: openaiKey ? openaiKey.substring(0, 7) : undefined,
    },
    upstash: {
      url: upstashUrl ? upstashUrl.substring(0, 30) + '...' : undefined,
      hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    },
    app: {
      url: appUrl,
      vercelUrl: vercelUrl,
      // Información adicional para diagnóstico
      originalLength: process.env.NEXT_PUBLIC_APP_URL?.length,
      cleanedLength: appUrl?.length,
      hasNewline: process.env.NEXT_PUBLIC_APP_URL?.includes('\r') || process.env.NEXT_PUBLIC_APP_URL?.includes('\n'),
    }
  });
}

