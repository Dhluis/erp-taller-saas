// src/integrations/whatsapp/utils/supabase-server-helpers.ts

/**
 * Helper para server-side (API routes, Server Components)
 * 
 * Este archivo SOLO debe ser usado en Server Components o API routes.
 * NO importar en componentes cliente ('use client').
 */

import { getSupabaseServerClient as getServerClient } from '@/lib/supabase/server';

/**
 * Helper para evitar errores de tipos "never" en Supabase
 * Temporalmente usamos 'any' hasta regenerar tipos
 * 
 * Para server-side (API routes, Server Components)
 */
export async function getSupabaseServerClient() {
  return await getServerClient() as any;
}

