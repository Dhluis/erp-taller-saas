# Estado del proyecto: Inventarios y su relación con Órdenes de Trabajo

## 1. Status del proyecto (consistencia actual)

### Módulo Inventarios (sidebar)

| Página | Ruta | Fuente de datos | Consistencia con el resto del ERP |
|--------|------|-----------------|-----------------------------------|
| **Hub Inventarios** | `/inventarios` | `useInventory` → `/api/inventory` (tabla `inventory`) | ✅ Misma tabla que Productos y que el descuento al completar OT. |
| **Productos** | `/inventarios/productos` | `/api/inventory`, categorías `/api/inventory/categories` | ✅ CRUD sobre `inventory`. Son los mismos ítems que usan Paquetes de Servicio y la OT. |
| **Categorías** | `/inventarios/categorias` | `/api/inventory/categories` | ✅ Clasificación de ítems de `inventory`. |
| **Movimientos** | `/inventarios/movimientos` | `/api/inventory/movements` (tabla `inventory_movements` con `inventory_id`) | ✅ Muestra entradas/salidas/ajustes; incluye movimientos con `reference_type: 'work_order'` generados al completar la OT. |
| **Paquetes de Servicio** | `/service-packages` | `service_packages` + `service_package_items` (referencian `inventory`) | ✅ Los paquetes definen qué ítems de inventario se consumen; se usan al agregar líneas tipo "package" a la OT. |

### Punto importante: una sola fuente de “productos” para Inventarios y OT

- **Inventarios (Productos, Categorías, Movimientos)** y **descuento al completar la OT** usan la tabla **`inventory`** (y `inventory_movements` con `inventory_id`).
- **Paquetes de Servicio** usan `inventory` vía `service_package_items.inventory_item_id`.
- En el código no se mezcla con la tabla `products` para este flujo; el flujo OT → inventario está unificado con `inventory`.

### Inconsistencias o riesgos

1. **Ruta de Paquetes de Servicio:** En el sidebar está como `/service-packages` (fuera de `/inventarios`). Funcionalmente es parte del mismo módulo (servicios que consumen inventario).
2. **Otras partes del sistema:** Algunos reportes o KPIs usan la tabla `products`; si en tu base existen tanto `inventory` como `products`, hay que tener claro cuál es la “fuente de verdad” para stock (en el flujo actual es `inventory`).
3. **Movimientos:** La API de movimientos usa `inventory_id` y join a `inventory`. Si en base de datos `inventory_movements` tuviera solo `product_id` (por migraciones viejas), habría que alinear esquema y código.

---

## 2. Cómo se relacionan con las Órdenes de Trabajo y sus etapas

### Etapas de la OT (status)

Flujo típico en el código:

- `reception` → `diagnosis` → `initial_quote` → `waiting_approval` → `disassembly` → `waiting_parts` → `assembly` → `testing` → `ready` → **`completed`** (o `cancelled`).

### Dónde interviene Inventarios en cada etapa

| Etapa | Relación con Inventarios |
|-------|---------------------------|
| **Recepción / Diagnóstico / Cotización** | No se descuenta inventario. Solo se puede **agregar servicios** a la OT (paquete, servicio libre, producto suelto). |
| **Agregar servicios a la OT** | En cualquier momento antes de completar se pueden agregar líneas vía `POST /api/work-orders/[id]/services` con `line_type`: `package` (usa `service_package_id` y por tanto ítems de inventario del paquete), `free_service` (solo mano de obra/concepto), `loose_product` (usa `inventory_item_id` directo). |
| **Espera de piezas / Armado / Pruebas / Listo** | Siguen sin descontar; el stock no cambia hasta **completar**. |
| **Completado** | Al pasar la OT a `status: 'completed'` (PUT en `/api/work-orders/[id]`): 1) Se ejecuta **descuento de inventario** (`deductInventoryOnOrderComplete`); 2) Se marcan las líneas de `work_order_services` con `inventory_deducted: true`; 3) Opcionalmente se crea factura desde la OT. |

### Flujo cuando la OT pasa a “Completado”

1. **Descuento de inventario** (`src/lib/work-orders/deduct-inventory-on-complete.ts`):
   - Solo se procesan líneas de `work_order_services` con `inventory_deducted = false`.
   - **Si `line_type === 'package'`:** se leen `service_package_items` del paquete; por cada ítem se descuenta cantidad × cantidad del servicio en la tabla **`inventory`** y se inserta un movimiento en **`inventory_movements`** con `reference_type: 'work_order'`, `reference_id: orderId`.
   - **Si `line_type === 'loose_product'`:** se descuenta la cantidad del ítem indicado en `inventory_item_id` en **`inventory`** y se crea el movimiento con la misma referencia a la OT.
   - **`free_service`:** no descuenta inventario.
   - Luego se actualiza `work_order_services` con `inventory_deducted: true` para no volver a descontar.

2. **Movimientos visibles en Inventarios:**
   - En **Inventarios → Movimientos** deberían aparecer esos movimientos con referencia tipo “work_order” (o el label que use la UI para `reference_type: 'work_order'`).

3. **Factura:**
   - Si no existe factura para esa OT, se crea una (por ejemplo vía `createInvoiceFromWorkOrder`). La facturación y cobro no modifican inventario; el descuento ya se hizo en el paso anterior.

---

## 3. Resumen: “¿Está completo?” y dependencias

- **Inventarios (Productos, Categorías, Movimientos, Paquetes de Servicio)** están alineados entre sí y con la tabla **`inventory`** y **`inventory_movements`**.
- **Órdenes de trabajo** usan esos mismos ítems al agregar líneas (`work_order_services`) y al **completar** la OT se descuenta stock y se registra en Movimientos con referencia a la OT.
- No hay un segundo descuento “por etapa”; el único momento en que se descuenta inventario por la OT es al pasar a **completado**.

Si quieres, el siguiente paso puede ser revisar en tu base si `inventory_movements` usa `inventory_id` o `product_id` y que la página de Movimientos y el deduct usen el mismo esquema, o documentar en la UI qué significa “reference_type: work_order” en Movimientos.
