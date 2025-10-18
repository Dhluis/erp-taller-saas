/**
 * Exportaciones principales de Supabase
 */

export { createClient } from './client';
export { createServerClient } from './server';
export type { Database } from './types';

// Exportar funciones de productos de inventario
export * from './inventory-products';