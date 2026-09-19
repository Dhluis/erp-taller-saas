# Spec: Autenticación y Permisos

**Última actualización:** Septiembre 2026
**Fuente de verdad del código:** `src/lib/auth/permissions.ts`

---

## Proveedores de Auth

- Email + contraseña
- Google OAuth
- Magic link
Todos vía **Supabase Auth**. Implementado en `src/middleware.ts` → `src/lib/auth/middleware.ts` (orden crítico, no modificar).

---

## Roles

Los strings reales en código son en MAYÚSCULAS y en español (no `admin`/`advisor`/`mechanic`):

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| `ADMIN` | 3 | Dueño/gerente. Acceso total, todas las sucursales. |
| `ASESOR` | 2 | Recepcionista. Gestión operativa, sin finanzas. |
| `MECANICO` | 1 | Técnico. Solo órdenes asignadas a él. |

**Regla de jerarquía:** NO está implementada realmente. `isRoleSuperior()`/`getInferiorRoles()` existen en `permissions.ts` pero no los usa nadie — en la práctica, gestionar usuarios (`users` resource) es un gate binario: solo ADMIN, punto.

---

## Matriz de Permisos

| Módulo | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Clientes — ver/crear/editar/eliminar | ✅✅✅✅ | ✅✅✅✅ | ❌❌❌❌ (solo vía orden asignada) |
| Vehículos — ver/crear/editar/eliminar | ✅✅✅✅ | ✅✅✅✅ | ❌❌❌❌ (solo vía orden asignada) |
| Cotizaciones — ver/crear/editar/eliminar/aprobar | ✅✅✅✅✅ | ✅✅✅❌❌ | ✅❌❌❌❌ |
| Órdenes de trabajo — ver/crear/editar/eliminar | ✅✅✅✅ | ✅✅✅✅ | ⚠️solo asignadas |
| Facturas — ver/crear/editar/eliminar/cobrar | ✅✅✅✅✅ | ✅❌❌❌❌ | ❌❌❌❌❌ |
| Pagos — ver/crear/eliminar | ✅✅✅ | ❌❌❌ | ❌❌❌ |
| Inventario — ver/crear/editar/eliminar | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ |
| Empleados — ver/crear/editar/eliminar | ✅✅✅✅ | ✅❌❌❌ | ❌❌❌❌ |
| Reportes — ver | ✅ | ✅ | ❌ |
| Configuración — editar | ✅ | ❌ | ❌ |
| Usuarios — gestionar | ✅ | ❌ | ❌ |

**Mecánico y órdenes:** usar `canAccessWorkOrder(userId, workOrderId, userRole)` de `src/lib/auth/permissions.ts` para validar acceso a orden específica.

### Cobertura real de `hasPermission()` en API routes (auditado sept. 2026)

Antes de esta fecha, solo 11 de ~200 archivos `route.ts` bajo `src/app/api/` llamaban a `hasPermission`/`canAccessWorkOrder` — los endpoints de facturas, pagos, aprobación de cotizaciones y listado de empleados NO validaban rol en absoluto (solo `organization_id`). Se corrigió: `invoices/route.ts`, `invoices/[id]/payments|discount|items(/[itemId])/route.ts`, `payments/route.ts`, `payments/[id]/route.ts`, `payments/invoice/[invoiceId]/route.ts`, `quotations/[id]/status/route.ts`, `employees/route.ts` (GET), y se creó `company-settings/route.ts` (antes se escribía directo desde el navegador a Supabase sin control de rol server-side).

De yapa se encontraron y corrigieron varios IDOR: `getInvoiceById`, `getPaymentById`, `getQuotationById`, `updatePayment`, `deletePayment` en `src/lib/supabase/quotations-invoices.ts` no filtraban por `organization_id` — cualquier usuario autenticado de cualquier organización podía leer/editar/borrar el recurso de otra si conocía el UUID. Se corrigió con un check explícito en cada ruta ya tocada; **la función compartida y ~15 call sites restantes (mayormente `src/lib/api/*-migration.ts`, un refactor que parece abandonado) no se tocaron** — pendiente de auditoría dedicada.

También se encontró que `quotations/[id]/status/route.ts` tenía un bug pre-existente no relacionado con permisos: `id` nunca se extraía de `params`, el endpoint entero tiraba `ReferenceError`/500 en cualquier request. Se corrigió de paso (si no, el chequeo de permiso agregado hubiera quedado muerto).

**Solo admin cobra:** `hasPermission(role, 'invoices', 'pay')` debe ser `true` para procesar pagos.

---

## Flujo de Sesión

1. Supabase Auth emite JWT con `auth_user_id`
2. `SessionContext` (`src/lib/context/SessionContext.tsx`) carga `organization_id`, `workshop_id`, `role` (vía `/api/users/me`)
3. `useSession()` expone estos valores a todos los componentes — **solo para UI** (esconder/mostrar menú), nunca confiar en el rol del cliente para autorizar nada
4. API routes usan `getTenantContext(request)` de `src/lib/core/multi-tenant-server.ts` → devuelve `{ organizationId, workshopId, userId, role }`. Desde sept. 2026 incluye `role` (evita que cada ruta repita su propia query) y `workshopId` es `string | null` honesto (antes hacía fallback a `organizationId`, un valor que nunca coincide con un workshop real — bug ya corregido).

**Nunca modificar:** `SessionContext.tsx`, `src/middleware.ts`, `src/lib/auth/middleware.ts`

**Código muerto a tener en cuenta:** `src/lib/auth/middleware.ts` (con su propio `hasPermission()` de firma distinta, roles `'user'/'admin'/'manager'` en minúscula) y `src/lib/core/multi-tenant.ts` (`getTenantContextClient`) no los importa nadie. No confundir con el sistema de permisos real.

---

## Multi-tenancy

- Cada query **debe** incluir `organization_id`
- RLS en 41+ tablas — nunca agregar políticas "allow all"
- `workshop_id` es opcional (NULL permitido) — para organizaciones con múltiples sucursales
- Patrón RLS: `organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())`

### Aislamiento por sucursal (sept. 2026)

ASESOR/MECANICO solo ven filas de su propia sucursal (`workshop_id`); ADMIN ve toda la organización. Filas con `workshop_id IS NULL` (talleres de una sola sucursal, la mayoría de los datos hoy) siguen siendo visibles para todos — así no se rompe nada existente.

- **Capa de aplicación** (protege TODAS las rutas, incluidas las que usan Service Role): `applyWorkshopScope()` en `src/lib/auth/workshop-scope.ts`, aplicado en el listado (GET) de `customers`, `vehicles`, `quotations`, `invoices`, `appointments`, `work-orders` (combina con el filtro existente por `assigned_to` de MECANICO).
- **Capa RLS** (defensa en profundidad, solo protege accesos que sí pasan por RLS — ej. llamadas directas desde el navegador con la anon key, como `company_settings`): migración `supabase/migrations/20260919000000_workshop_scoping_rls.sql`, políticas RESTRICTIVE (se combinan con AND sobre las políticas de organización existentes, sin reemplazarlas) sobre `customers`, `vehicles`, `work_orders`, `order_items`, `quotations`, `quotation_items`, `invoices`, `invoice_items`, `payments`, `appointments`. **Aplicada en producción el 2026-09-19** (proyecto `igshgleciwknpupbmvhn`), verificada con `pg_policies` y `get_advisors`.
- **Bug de producción corregido de paso**: `get_user_role()`/`get_user_workshop_id()` ya existían en la base (de un intento previo no documentado en migraciones locales) comparando `users.id = auth.uid()` en vez de `users.auth_user_id = auth.uid()` — devolvían `NULL` para 19 de 28 usuarios reales. El `CREATE OR REPLACE` de la migración lo corrigió, arreglando de paso el scoping por sucursal (ya existente pero roto) de `workshops`, `order_items`, `quotation_versions`, `quotation_tracking`, `invoice_items`, `products`, `services`, `price_history`, `leads`, `campaigns`, `notifications`.
- **Corregido también (2026-09-19)**: `invoice_items` y `notifications` tenían una política `"Enable all"` (`qual: true`) sin ningún filtro — ni de organización. Migración `20260919010000_fix_enable_all_invoice_items_notifications.sql` la reemplazó por políticas de organización reales, mismo patrón que `invoices`/`payments`. Aplicada y verificada en producción.
- **Importante:** `getSupabaseServiceClient()` (Service Role) bypasea RLS por diseño de Supabase — para las rutas que lo usan (la mayoría), la capa RLS no es suficiente por sí sola; la capa de aplicación es la que realmente protege.
- **Fuera de alcance inicial** (mismo patrón, agregar si se necesita): `inventory`, `products`, `services`, `suppliers`, `purchase_orders`, `employees`, `leads`, `campaigns`, `notifications`, `vehicle_inspections`, `quotation_tracking`, `quotation_versions`, `price_history`; y el listado de `payments` (delega en una función compartida en `quotations-invoices.ts` usada por varios endpoints).
