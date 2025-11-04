// src/integrations/whatsapp/utils/supabase-helpers.ts

import { getSupabaseClient as getBrowserClient } from '@/lib/supabase/client';
import { getSupabaseServerClient as getServerClient } from '@/lib/supabase/server';

/**
 * Helper para evitar errores de tipos "never" en Supabase
 * Temporalmente usamos 'any' hasta regenerar tipos
 * 
 * Para client-side (navegador)
 */
export function getSupabaseClient() {
  return getBrowserClient() as any;
}

/**
 * Helper para server-side (API routes, Server Components)
 */
export async function getSupabaseServerClient() {
  return await getServerClient() as any;
}

export type SupabaseClient = ReturnType<typeof getSupabaseClient>;


