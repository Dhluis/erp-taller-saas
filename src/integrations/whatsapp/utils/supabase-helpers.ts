// src/integrations/whatsapp/utils/supabase-helpers.ts

import { getSupabaseClient as getBrowserClient } from '@/lib/supabase/client';

/**
 * Helper para evitar errores de tipos "never" en Supabase
 * Temporalmente usamos 'any' hasta regenerar tipos
 * 
 * Para client-side (navegador)
 * 
 * Este archivo SOLO debe ser usado en componentes cliente.
 * Para server-side, usa supabase-server-helpers.ts
 */
export function getSupabaseClient() {
  return getBrowserClient() as any;
}

export type SupabaseClient = ReturnType<typeof getSupabaseClient>;


