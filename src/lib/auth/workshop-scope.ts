import type { TenantContext } from '@/lib/core/multi-tenant-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Restringe una query de Supabase a la sucursal (workshop) del usuario, cuando corresponde.
 *
 * ADMIN siempre ve todas las sucursales de la organización. ASESOR/MECANICO solo ven
 * filas de su propia sucursal — excepto filas sin sucursal asignada (workshop_id NULL),
 * que se consideran compartidas/sin clasificar y siguen siendo visibles para todos.
 * Esto evita romper talleres de una sola sucursal que nunca configuraron workshop_id
 * (la inmensa mayoría de los datos existentes hoy).
 */
export function applyWorkshopScope<Q extends { or: (filter: string) => Q }>(
  query: Q,
  tenantContext: Pick<TenantContext, 'role' | 'workshopId'>
): Q {
  if (tenantContext.role === 'ADMIN') return query
  if (!tenantContext.workshopId || !UUID_REGEX.test(tenantContext.workshopId)) return query

  return query.or(`workshop_id.is.null,workshop_id.eq.${tenantContext.workshopId}`)
}
