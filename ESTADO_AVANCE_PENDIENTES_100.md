# Estado de avance del proyecto — Pendientes cerrados (100%)

**Fecha:** 26 de febrero de 2025  
**Objetivo:** Documentar el cierre de los 3 ítems que quedaban con placeholders o comportamiento incompleto, considerando esta parte del proyecto al **100%**.

---

## Resumen ejecutivo

Se completaron los tres pendientes identificados en el análisis de avance:

1. **Cotizaciones:** `saveQuotationVersion` y `trackQuotationChange` en la capa de datos (inserción real en BD).
2. **Rate limit:** Identificador por usuario usando JWT de Supabase (aislamiento real por usuario).
3. **Kanban órdenes:** `KanbanBoardSimple` con datos reales desde API, estados de carga/error y navegación correcta.

Con esto se eliminan los últimos stubs/placeholders y comportamientos mock en esas áreas.

---

## 1. Cotizaciones — `quotations.ts`

**Archivo:** `src/lib/database/queries/quotations.ts`

### Antes
- `saveQuotationVersion`: stub con `console.log`, sin escritura en BD.
- `trackQuotationChange`: firma de 4 parámetros y stub; call sites usaban 3 parámetros.

### Ahora

| Función | Comportamiento |
|--------|-----------------|
| **saveQuotationVersion(quotationId, data)** | Obtiene el `version_number` máximo en `quotation_versions` para la cotización, calcula `nextVersion` (max + 1 o 1), inserta en `quotation_versions` con `quotation_id`, `version_number` y `data` (JSONB). Retorna `{ success, version }` o `{ success: false, error? }`. |
| **trackQuotationChange(quotationId, action, changes?)** | Firma de 3 parámetros alineada con todos los call sites. Inserta en `quotation_tracking` con `quotation_id`, `action` y `description` (derivada de `changes` si se pasa). Retorna `{ success }` o `{ success: false, error? }`. |

**Tablas:** `quotation_versions`, `quotation_tracking`.  
**Call sites verificados:** `src/app/api/quotations/[id]/send/route.ts`, `approve/route.ts`, `reject/route.ts` (todos con 3 argumentos).

---

## 2. Rate limit por usuario — middleware

**Archivo:** `src/lib/rate-limit/middleware.ts`

### Antes
- `case 'user'`: no implementado; fallback a IP con `console.warn`.

### Ahora
- Se usa `createClientFromRequest(request)` para obtener el cliente de Supabase del request.
- Se llama a `supabase.auth.getUser()` (JWT desde cookies).
- Si existe `user?.id`, el identificador del rate limit es `user:${user.id}`.
- Si no hay usuario (no autenticado o error), fallback a `ip:${getClientIp(request)}`.

Con esto el rate limit con `identifier: 'user'` queda aislado por usuario cuando hay sesión.

---

## 3. Kanban de órdenes — KanbanBoardSimple

**Archivo:** `src/components/ordenes/KanbanBoardSimple.tsx`

### Antes
- Tres órdenes mock estáticas.
- Uso incorrecto de `useState(() => { ... })` que reiniciaba el estado en cada render.
- Click en tarjeta abría `alert`.

### Ahora
- **Datos:** `useEffect` que hace `fetch('/api/work-orders?limit=200', { credentials: 'include' })`, parsea la respuesta y asigna órdenes a columnas según `o.status === col.id`. Cleanup con flag `cancelled` para evitar actualizaciones tras desmontaje.
- **Estados:** `loading` y `error` con UI (mensaje de carga y mensaje de error).
- **Click:** `handleOrderClick(orderId)` usa `router.push(\`/ordenes/${orderId}\`)` en lugar de `alert`.
- **Empty state:** Mensaje cuando no hay órdenes (`totalOrders === 0`).

---

## Referencia rápida

| Ítem | Archivo | Estado |
|-----|---------|--------|
| saveQuotationVersion + trackQuotationChange | `src/lib/database/queries/quotations.ts` | ✅ Implementado |
| Rate limit por usuario | `src/lib/rate-limit/middleware.ts` | ✅ Implementado |
| KanbanBoardSimple (datos reales + navegación) | `src/components/ordenes/KanbanBoardSimple.tsx` | ✅ Implementado |

---

## Relación con otra documentación

- **Endpoints:** Ver `src/app/api/ENDPOINTS-COMPLETE-VERIFICATION.md` para el estado de los API routes (cotizaciones, notas de venta, pagos, conversiones).
- **Estado general del proyecto:** Ver `docs/PROJECT_STATUS.md` para funcionalidades, arquitectura, configuración y próximos pasos sugeridos.

---

**Última actualización:** 26 de febrero de 2025
