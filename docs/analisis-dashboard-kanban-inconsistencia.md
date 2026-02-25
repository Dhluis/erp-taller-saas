# Análisis: Inconsistencias Dashboard vs Kanban

## Síntoma
- **Dashboard**: muestra X órdenes en "Recepción" (ej. 1 o más).
- **Kanban**: columna "Recepción" muestra 0.

Con filtro "Todas" en ambos, los números deberían coincidir.

---

## Causa raíz

### 1. Fuentes de datos distintas

| Vista      | API llamada              | Comportamiento |
|-----------|---------------------------|-----------------|
| Dashboard | `GET /api/orders/stats`   | Consulta **todas** las órdenes de la organización (sin paginación), cuenta por `status` y devuelve `reception`, `diagnosis`, etc. |
| Kanban    | `GET /api/work-orders`    | Consulta **solo una página** de órdenes (paginación por defecto: **page=1, pageSize=20**). |

### 2. Paginación en `/api/work-orders`

- En `src/app/api/work-orders/route.ts` se usa `extractPaginationFromURL(url)`.
- Si el Kanban **no** envía `page` ni `pageSize`, se usan los valores por defecto de `validatePaginationParams()` en `src/lib/utils/pagination.ts`:
  - **page = 1**
  - **pageSize = 20** (máximo permitido 100).
- La query aplica `.range(offset, offset + pageSize - 1)`, es decir, solo devuelve las **primeras 20 órdenes** (orden por `created_at` descendente por defecto).

### 3. Consecuencia

- Las órdenes en estado "Recepción" pueden ser **antiguas** (poco movimiento).
- Al estar el listado ordenado por `created_at` desc, las 20 primeras suelen ser las más recientes.
- Si todas esas 20 están en otros estados (Cotización, Esperando Piezas, etc.), en el Kanban **Recepción = 0**.
- El dashboard, en cambio, cuenta **todas** las órdenes de la organización, por eso sigue mostrando 1 (o más) en Recepción.

Resumen: **Dashboard cuenta sobre el total; Kanban solo sobre la primera página (20 ítems).**

---

## Otros posibles factores (secundarios)

- **Filtro de fecha**: ambos pueden usar "Todas". Dashboard con `timeFilter=all` no filtra por fecha; Kanban con `dateFilter='all'` tampoco aplica filtro de fecha en cliente. No deberían generar diferencia si ambos están en "Todas".
- **Rol mecánico**: tanto stats como work-orders filtran por `assigned_to` cuando el usuario es MECANICO. Misma regla en ambos.
- **Soft delete**: ambos excluyen `deleted_at` no nulo. Misma regla.

---

## Solución recomendada

Para que Kanban refleje los mismos conteos que el Dashboard cuando el usuario elige "Todas":

1. **Opción A (recomendada)**  
   Que el Kanban pida **todas** las órdenes necesarias para el tablero:
   - Al llamar a `GET /api/work-orders` desde el Kanban, enviar un `pageSize` alto (ej. `500` o `1000`) o un parámetro específico (ej. `forKanban=true`) que el API interprete como "devolver todas las órdenes del tablero" (o con un límite alto acordado).
   - Así el Kanban trabaja sobre el mismo conjunto que usa el dashboard para los conteos (misma org, mismos filtros de rol/eliminación).

2. **Opción B**  
   Que el Kanban use también `/api/orders/stats` para los **números** de cada columna y solo use `/api/work-orders` para los ítems visibles (paginados). Implica más cambios en la UI (dos fuentes) y posible desincronización entre números y tarjetas.

La opción A es más simple y mantiene una sola fuente de verdad para las tarjetas y los conteos en el Kanban, alineada con el dashboard.

---

## Archivos implicados

- Dashboard: `src/app/dashboard/page.tsx` (llamada a `/api/orders/stats`).
- Stats: `src/app/api/orders/stats/route.ts` (conteo sin paginación).
- Kanban: `src/components/ordenes/KanbanBoard.tsx` (llamada a `fetch('/api/work-orders')` sin `pageSize`).
- Work-orders API: `src/app/api/work-orders/route.ts` (paginación con `extractPaginationFromURL`).
- Paginación: `src/lib/utils/pagination.ts` (defaults `pageSize = 20`).
