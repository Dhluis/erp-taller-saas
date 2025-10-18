/**
 * Configuración Centralizada de Supabase
 * Re-exporta funciones del cliente para compatibilidad
 */

// Re-exportar desde el cliente
export { 
  getSupabaseClient,
  testSupabaseConnection,
  getSupabaseInfo,
  clearSupabaseCache,
  type SupabaseClient
} from './supabase/client'

// Exportar cliente por defecto para compatibilidad
export { default } from './supabase/client'
