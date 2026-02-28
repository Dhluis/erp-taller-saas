/**
 * Detecta si un error de Supabase indica que la tabla no existe.
 * Útil para devolver respuestas amigables cuando la migración 045 no se ha aplicado.
 * Incluye el mensaje de PostgREST: "Could not find the table 'public.xxx' in the schema cache".
 */
export function isSupabaseTableMissingError(error: unknown): boolean {
  if (error == null) return false
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: string }).code
    : undefined
  return (
    code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('Could not find the table') ||
    message.includes('in the schema cache') ||
    (message.includes('relation ') && message.includes(' does not exist'))
  )
}

export const MIGRATION_045_MESSAGE =
  'Las tablas de gastos, notas de crédito, entregas o arqueo de caja no existen. Ejecute la migración 045 en su proyecto Supabase (Dashboard > SQL Editor > migración 045_credit_notes_delivery_cash_closures_expenses.sql).'
