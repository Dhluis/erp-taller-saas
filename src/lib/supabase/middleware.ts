// ✅ CORRECTO: Cliente de Supabase para middleware
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return undefined; // No hay cookies en middleware
        },
        set(name: string, value: string, options: any) {
          // No se pueden establecer cookies en middleware
        },
        remove(name: string, options: any) {
          // No se pueden eliminar cookies en middleware
        },
      },
    }
  );
}



















