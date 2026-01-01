import { NextResponse } from 'next/server';
import { getAppUrl, cleanEnvVar } from '@/lib/utils/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Obtener todas las variables relacionadas
  const allEnvVars = Object.keys(process.env)
    .filter(key => 
      key.includes('APP_URL') || 
      key.includes('VERCEL') || 
      key.includes('URL')
    )
    .reduce((acc, key) => {
      acc[key] = cleanEnvVar(process.env[key]);
      return acc;
    }, {} as Record<string, string | undefined>);

  const cleanedAppUrl = cleanEnvVar(process.env.NEXT_PUBLIC_APP_URL);
  const finalAppUrl = getAppUrl();

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: cleanedAppUrl,
    finalAppUrl: finalAppUrl, // URL final usando getAppUrl()
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    allAppUrls: {
      fromEnv: cleanedAppUrl,
      fromGetAppUrl: finalAppUrl,
      fromVercelUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    },
    // Información adicional para debugging
    allRelatedEnvVars: allEnvVars,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
    // Verificar si hay variables duplicadas o conflictivas
    checks: {
      hasNextPublicAppUrl: !!cleanedAppUrl,
      hasVercelUrl: !!process.env.VERCEL_URL,
      appUrlLength: cleanedAppUrl?.length || 0,
      finalAppUrlLength: finalAppUrl?.length || 0,
      appUrlIncludesCorrect: cleanedAppUrl?.includes('erp-taller-saas-correct') || false,
      finalAppUrlIncludesCorrect: finalAppUrl?.includes('erp-taller-saas-correct') || false,
      appUrlIncludesOld: cleanedAppUrl?.includes('erp-taller-saas.vercel.app') || false,
      hasNewline: process.env.NEXT_PUBLIC_APP_URL?.includes('\r\n') || process.env.NEXT_PUBLIC_APP_URL?.includes('\n') || false,
      originalLength: process.env.NEXT_PUBLIC_APP_URL?.length || 0,
      cleanedLength: cleanedAppUrl?.length || 0,
    }
  });
}

