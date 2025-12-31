import { NextResponse } from 'next/server';

export async function GET() {
  // Obtener todas las variables relacionadas
  const allEnvVars = Object.keys(process.env)
    .filter(key => 
      key.includes('APP_URL') || 
      key.includes('VERCEL') || 
      key.includes('URL')
    )
    .reduce((acc, key) => {
      acc[key] = process.env[key];
      return acc;
    }, {} as Record<string, string | undefined>);

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    allAppUrls: {
      fromEnv: process.env.NEXT_PUBLIC_APP_URL,
      fromVercelUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    },
    // Información adicional para debugging
    allRelatedEnvVars: allEnvVars,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
    // Verificar si hay variables duplicadas o conflictivas
    checks: {
      hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      hasVercelUrl: !!process.env.VERCEL_URL,
      appUrlLength: process.env.NEXT_PUBLIC_APP_URL?.length || 0,
      appUrlIncludesCorrect: process.env.NEXT_PUBLIC_APP_URL?.includes('erp-taller-saas-correct') || false,
      appUrlIncludesOld: process.env.NEXT_PUBLIC_APP_URL?.includes('erp-taller-saas.vercel.app') || false,
    }
  });
}

