import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Función helper para limpiar saltos de línea de variables de entorno
function cleanEnvVar(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
}

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

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: cleanedAppUrl,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    allAppUrls: {
      fromEnv: cleanedAppUrl,
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
      appUrlIncludesCorrect: cleanedAppUrl?.includes('erp-taller-saas-correct') || false,
      appUrlIncludesOld: cleanedAppUrl?.includes('erp-taller-saas.vercel.app') || false,
      hasNewline: process.env.NEXT_PUBLIC_APP_URL?.includes('\r\n') || process.env.NEXT_PUBLIC_APP_URL?.includes('\n') || false,
      originalLength: process.env.NEXT_PUBLIC_APP_URL?.length || 0,
      cleanedLength: cleanedAppUrl?.length || 0,
    }
  });
}

