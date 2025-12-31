import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    allAppUrls: {
      fromEnv: process.env.NEXT_PUBLIC_APP_URL,
      fromVercelUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    }
  });
}

