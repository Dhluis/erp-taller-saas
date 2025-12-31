import { NextResponse } from 'next/server';

/**
 * Función helper para limpiar saltos de línea de variables de entorno
 */
function cleanEnvVar(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
}

export async function GET() {
  const appUrl = cleanEnvVar(process.env.NEXT_PUBLIC_APP_URL);
  const appUrlOriginal = process.env.NEXT_PUBLIC_APP_URL;
  const hasNewline = appUrlOriginal ? (
    appUrlOriginal.includes('\r\n') || 
    appUrlOriginal.includes('\n') || 
    appUrlOriginal.includes('\r')
  ) : false;

  return NextResponse.json({
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    waha: {
      url: process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL,
      hasKey: !!(process.env.WAHA_API_KEY || process.env.NEXT_PUBLIC_WAHA_API_KEY),
    },
    openai: {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7),
    },
    upstash: {
      url: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) + '...',
      hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    },
    app: {
      url: appUrl,
      urlOriginal: appUrlOriginal,
      hasNewline: hasNewline,
      vercelUrl: process.env.VERCEL_URL,
      vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      issues: [
        hasNewline && '❌ NEXT_PUBLIC_APP_URL tiene saltos de línea',
        !appUrl && '❌ NEXT_PUBLIC_APP_URL no está configurada',
        appUrl && !appUrl.includes('erp-taller-saas-correct') && '⚠️ NEXT_PUBLIC_APP_URL no apunta a erp-taller-saas-correct'
      ].filter(Boolean)
    }
  });
}

