# Spec: Autenticación y Permisos

**Última actualización:** Mayo 2026
**Fuente de verdad del código:** `src/lib/auth/permissions.ts`

---

## Proveedores de Auth

- Email + contraseña
- Google OAuth
- Magic link
Todos vía **Supabase Auth**. Implementado en `src/middleware.ts` → `src/lib/auth/middleware.ts` (orden crítico, no modificar).

---

## Roles

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| `admin` | 3 | Dueño/gerente. Acceso total. |
| `advisor` | 2 | Recepcionista. Gestión operativa, sin finanzas. |
| `mechanic` | 1 | Técnico. Solo órdenes asignadas a él. |

**Regla de jerarquía:** un rol solo puede gestionar roles de nivel inferior.

---

## Matriz de Permisos

| Módulo | Admin | Advisor | Mechanic |
|--------|:-----:|:-------:|:--------:|
| Clientes — ver/crear/editar/eliminar | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
| Vehículos — ver/crear/editar/eliminar | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
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

**Solo admin cobra:** `hasPermission(role, 'invoices', 'pay')` debe ser `true` para procesar pagos.

---

## Flujo de Sesión

1. Supabase Auth emite JWT con `auth_user_id`
2. `SessionContext` (`src/lib/context/SessionContext.tsx`) carga `organization_id`, `workshop_id`, `role`
3. `useSession()` expone estos valores a todos los componentes
4. API routes validan con `getTenantContext(request)` → devuelve `{ organizationId, workshopId, userId }`

**Nunca modificar:** `SessionContext.tsx`, `src/middleware.ts`, `src/lib/auth/middleware.ts`

---

## Multi-tenancy

- Cada query **debe** incluir `organization_id`
- RLS en 41+ tablas — nunca agregar políticas "allow all"
- `workshop_id` es opcional (NULL permitido) — para organizaciones con múltiples sucursales
- Patrón RLS: `organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())`
