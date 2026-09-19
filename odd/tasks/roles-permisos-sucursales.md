# Roles, permisos y aislamiento por sucursal

## Objetivo
Cerrar los huecos de autorización encontrados en la auditoría de roles/permisos (2026-09-18/19) y agregar aislamiento de datos por sucursal (workshop_id) para ASESOR/MECANICO.

## Por qué
Auditoría verificada contra el código real (no solo la spec) encontró:
- Endpoints sensibles (facturas, pagos, aprobación de cotizaciones, listado de empleados) sin chequeo de `hasPermission()`, violando la matriz de permisos documentada.
- Configuración de empresa escrita directo desde el navegador a Supabase, sin pasar por una API route con control de rol.
- Ningún control de sucursal: cualquier ASESOR/MECANICO de la organización ve datos de todas las sucursales, no solo la suya.

Usuario autorizó explícitamente ambos trabajos el 2026-09-19.

## Nota sobre Engram
El MCP de Engram está desconectado en esta sesión — el espejo en memoria persistente queda pendiente. Este archivo es la única fuente de verdad hasta que se pueda sincronizar.

## Hecho hasta ahora
- ✅ `src/lib/core/multi-tenant-server.ts`: `TenantContext` ahora incluye `role` (evita que cada ruta repita su propia query de rol) y `workshopId` pasa a ser `string | null` honesto (antes hacía fallback silencioso a `organizationId`, un UUID que nunca coincide con un `workshop_id` real — bug que impedía cualquier intento futuro de filtrar por sucursal). Type-check limpio.

## Tarea A — Opción A: parchar endpoints sin control de rol ✅ COMPLETA (2026-09-19)
Usar `tenantContext.role` (ya disponible, sin query extra) + `hasPermission()` de `src/lib/auth/permissions.ts`.

- [x] `src/app/api/invoices/route.ts` — GET (`invoices`,`read`) + workshop scope, POST (`invoices`,`create`)
- [x] `src/app/api/invoices/[id]/payments/route.ts` — GET (`payments`,`read`), POST (`payments`,`create`)
- [x] `src/app/api/invoices/[id]/discount/route.ts` — PUT (`invoices`,`update`) + fix IDOR (getInvoiceById sin check de organización)
- [x] `src/app/api/invoices/[id]/items/route.ts` — GET (`invoices`,`read`), POST (`invoices`,`update`), PUT (`invoices`,`update`) + fix IDOR (3 call sites)
- [x] `src/app/api/invoices/[id]/items/[itemId]/route.ts` — GET/PUT/DELETE (`invoices`,`read`/`update`) + fix IDOR (3 call sites)
- [x] `src/app/api/payments/route.ts` — GET (`payments`,`read`) [POST ya lo tenía]
- [x] `src/app/api/payments/[id]/route.ts` — GET/PUT/DELETE (`payments`,...) + fix IDOR (getPaymentById/updatePayment/deletePayment sin check de organización — cualquier usuario autenticado de cualquier org podía tocar el pago de otra)
- [x] `src/app/api/payments/invoice/[invoiceId]/route.ts` — GET (`payments`,`read`) + fix IDOR
- [x] `src/app/api/quotations/[id]/status/route.ts` — approve/reject requiere (`quotations`,`approve`), resto requiere (`quotations`,`update`) + **bug pre-existente arreglado**: `id` nunca se extraía de `params`, el endpoint entero tiraba ReferenceError/500 en cualquier request + fix IDOR
- [x] `src/app/api/employees/route.ts` — GET (`employees`,`read`) [POST ya lo tenía]
- [x] Company settings: creado `src/app/api/company-settings/route.ts` (GET/PUT con `hasPermission(role,'settings',...)`); actualizados `src/app/configuraciones/empresa/page.tsx` y `src/app/configuraciones/sistema/page.tsx` para llamar a la API route en vez de escribir directo a Supabase desde el navegador.

### Hallazgo adicional durante la Tarea A (no estaba en la auditoría original)
`getInvoiceById`, `getPaymentById`, `getQuotationById`, `updatePayment`, `deletePayment` en `src/lib/supabase/quotations-invoices.ts` **no filtran por `organization_id`** — son IDOR de libro de texto (cualquier usuario autenticado, de cualquier organización, podía leer/editar/borrar el recurso de otra organización si conocía o adivinaba el UUID). Se corrigió con un check `(recurso as any).organization_id !== organizationId` en cada ruta ya tocada arriba. **No se tocó la función compartida ni los ~15 call sites restantes** (mayormente archivos `*-migration.ts` en `src/lib/api/` que parecen un refactor abandonado, sin confirmar si están vivos). Recomendado: auditoría dedicada de ese archivo (`quotations-invoices.ts`) y de los archivos `*-migration.ts`.

## Tarea B — Aislamiento por sucursal (ASESOR/MECANICO no ven otra sucursal) — mayormente completa (2026-09-19)
Diseño: ADMIN sin restricción. ASESOR/MECANICO solo ven filas donde `workshop_id` coincide con el suyo. Si la fila o el usuario tienen `workshop_id` NULL, se permite (preserva comportamiento actual de talleres de una sola sucursal).

- [x] Helper compartido `applyWorkshopScope()` en `src/lib/auth/workshop-scope.ts`.
- [x] Aplicado en GET de: `customers`, `vehicles`, `quotations`, `invoices` (Tarea A), `appointments`, `work-orders` (autorización explícita del usuario obtenida 2026-09-19 para este archivo protegido — combina con el filtro existente por `assigned_to` de MECANICO).
- [ ] `payments/route.ts` (listado) — NO se aplicó workshop scope: delega en `getAllPayments()` de `quotations-invoices.ts`, una función compartida usada también por `searchPayments`/`getPaymentStats`; cambiar su firma para aceptar scope queda fuera de esta sesión (ver hallazgo de IDOR en Tarea A, mismo archivo).
- [x] **Migración aplicada en producción (2026-09-19, proyecto `igshgleciwknpupbmvhn` "Software Para Talleres")**: `supabase/migrations/20260919000000_workshop_scoping_rls.sql`. 30 políticas RESTRICTIVE creadas (10 tablas × select/update/delete) sobre customers, vehicles, work_orders, order_items, quotations, quotation_items, invoices, invoice_items, payments, appointments. Verificado con `pg_policies` y `get_advisors` (mismo baseline de advisories que antes de aplicar, nada nuevo).
  - **Hallazgo importante durante la aplicación**: `get_user_role()`/`get_user_workshop_id()` YA EXISTÍAN en la base (de un intento previo no documentado en las migraciones locales del repo) con un bug: comparaban `users.id = auth.uid()` en vez de `users.auth_user_id = auth.uid()`, devolviendo `NULL` para 19 de 28 usuarios reales (68%). El `CREATE OR REPLACE` de esta migración corrigió el bug de paso (mismo patrón que `get_user_organization_id()`, que sí estaba bien). Efecto colateral positivo: esto también arregla el scoping por sucursal que ya existía —y estaba roto— en `workshops`, `order_items`, `quotation_versions`, `quotation_tracking`, `invoice_items`, `products`, `services`, `price_history`, `leads`, `campaigns`, `notifications` (políticas PERMISSIVE preexistentes que dependían de estas funciones).
  - **Corregido también (2026-09-19)**: `invoice_items` y `notifications` tenían una política `"Enable all"` con `qual: true` — sin ningún filtro, ni siquiera de `organization_id`. Migración `supabase/migrations/20260919010000_fix_enable_all_invoice_items_notifications.sql` aplicada: se eliminaron ambas políticas y se agregaron políticas de organización reales (SELECT/INSERT/UPDATE/DELETE, mismo patrón que `invoices`/`payments`: `organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())`). Verificado: 0 filas en ambas tablas tenían `workshop_id` asignado, así que sin este reemplazo, solo borrar "Enable all" hubiera dejado ambas tablas inaccesibles vía RLS. Advisors revisados antes/después — mismo baseline, nada nuevo introducido.
- [ ] Tablas fuera de este alcance inicial (mismo patrón, se pueden agregar después si se quiere): `inventory`, `products`, `services`, `suppliers`, `purchase_orders`, `employees`, `leads`, `campaigns`, `notifications`, `vehicle_inspections`, `quotation_tracking`, `quotation_versions`, `price_history`.

### Nota importante sobre alcance de la protección
Las políticas RLS RESTRICTIVE solo protegen accesos que pasan por RLS (ej. llamadas directas desde el navegador con la anon key, como el caso de company-settings que se corrigió en la Tarea A). La mayoría de las API routes de este proyecto usan `getSupabaseServiceClient()` (Service Role), que **bypasea RLS por diseño de Supabase** — para esas rutas la única protección real es la de capa de aplicación (`applyWorkshopScope()` ya aplicado arriba). Ambas capas son necesarias, ninguna sustituye a la otra.

## Verificación
- `npm run type-check` limpio en todos los archivos tocados (comparar contra el baseline de errores preexistentes ya conocido — conflicto de mayúsculas `Button.tsx`/`button.tsx`, no relacionado).
- Lectura manual de cada endpoint parchado confirmando el par (resource, action) correcto contra `PERMISSIONS` en `permissions.ts`.
- La migración SQL no se ejecuta en esta sesión (sin acceso a Supabase MCP) — queda para que el usuario la aplique.

## Siguiente paso
Cerrar Tarea A y Tarea B, actualizar `docs/specs/auth-permissions.md` con el estado real (roles en mayúsculas, cobertura de permisos, aislamiento por sucursal, migración pendiente de aplicar).
