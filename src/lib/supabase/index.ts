/**
 * Exportaciones principales de Supabase
 */

export { createClient, getSupabaseClient } from './client';
export { createServerClient, getSupabaseServerClient, getSupabaseServiceClient } from './server';
export type { Database } from '@/types/supabase-simple';

// Exportar funciones de productos de inventario
export * from './inventory-products';