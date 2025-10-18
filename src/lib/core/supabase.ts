/**
 * Cliente Supabase para Navegador - DEPRECATED
 * Usar src/lib/supabase.ts en su lugar
 */

import { getSupabaseClient, testSupabaseConnection } from '../supabase'

// Re-exportar para compatibilidad
export const getBrowserClient = getSupabaseClient
export { testSupabaseConnection }

// Deprecation warning
console.warn('⚠️ DEPRECATED: Use src/lib/supabase.ts instead of src/lib/core/supabase.ts')