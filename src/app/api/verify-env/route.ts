import { NextResponse } from 'next/server';

export async function GET() {
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
      url: process.env.NEXT_PUBLIC_APP_URL,
      vercelUrl: process.env.VERCEL_URL,
    }
  });
}

