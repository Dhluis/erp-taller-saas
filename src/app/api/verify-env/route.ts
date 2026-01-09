import { NextResponse } from 'next/server';
import { getAppUrl, cleanEnvVar } from '@/lib/utils/env';

export async function GET() {
  // Limpiar TODAS las variables de entorno antes de usarlas
  const supabaseUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const wahaUrl = cleanEnvVar(process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL);
  const openaiKey = cleanEnvVar(process.env.OPENAI_API_KEY);
  const upstashUrl = cleanEnvVar(process.env.UPSTASH_REDIS_REST_URL);
  const cleanedAppUrl = cleanEnvVar(process.env.NEXT_PUBLIC_APP_URL);
  const vercelUrl = cleanEnvVar(process.env.VERCEL_URL);
  const finalAppUrl = getAppUrl(); // URL final usando getAppUrl()

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
      url: cleanedAppUrl,
      finalUrl: finalAppUrl, // URL final usando getAppUrl()
      vercelUrl: vercelUrl,
      // Información adicional para diagnóstico
      originalLength: process.env.NEXT_PUBLIC_APP_URL?.length,
      cleanedLength: cleanedAppUrl?.length,
      finalLength: finalAppUrl?.length,
      hasNewline: process.env.NEXT_PUBLIC_APP_URL?.includes('\r') || process.env.NEXT_PUBLIC_APP_URL?.includes('\n'),
    }
  });
}

