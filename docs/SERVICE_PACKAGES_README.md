# Guía: Módulo de Paquetes de Servicio

## ¿Qué es?

El módulo de **Paquetes de Servicio** permite:

1. **Crear catálogos de servicios predefinidos** con su “receta” de productos de inventario (ej. “Mantenimiento 5,000 km” = 4L aceite + 1 filtro).
2. **Agregar conceptos a órdenes de trabajo** de tres formas: paquetes, servicios libres (solo mano de obra) o productos sueltos.
3. **Descontar inventario automáticamente** cuando la orden se marca como completada.

---

## Flujo general

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Catálogo de        │     │  Orden de Trabajo    │     │  Al completar       │
│  Paquetes           │────▶│  (pestaña Servicios) │────▶│  la orden           │
│  /service-packages  │     │  Agregar conceptos   │     │  Descuento inventario│
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

---

## Vinculación con Inventario y Categorías existentes

El módulo de Paquetes de Servicio **no crea** productos ni categorías nuevas. Se apoya en lo que ya existe en el sistema.

### Qué ya existía

| Tabla / Módulo | Descripción |
|----------------|-------------|
| **`inventory_categories`** | Categorías de productos (ej. Aceites y Lubricantes, Filtros, Refacciones). |
| **`inventory`** | Productos con `name`, `current_stock`, `unit`, `category_id` (FK a `inventory_categories`). |
| Módulo **Inventarios** | CRUD de productos y categorías en `/inventarios`. |

### Cómo se vincula el módulo de paquetes

```
┌──────────────────────┐         ┌─────────────────────────┐
│ inventory_categories │         │      inventory          │
│ (categorías)         │◀────────│ (productos)             │
└──────────────────────┘         │ id, name, current_stock │
         ▲                       │ category_id             │
         │                       └───────────┬─────────────┘
         │                                   │
         │                                   │ FK: inventory_item_id
         │                       ┌───────────▼─────────────┐
         │                       │ service_package_items   │
         │                       │ (receta del paquete)    │
         │                       └───────────┬─────────────┘
         │                                   │
         │                       ┌───────────▼─────────────┐
         │                       │   service_packages      │
         │                       │   category: TEXT        │  ← Categoría del SERVICIO
         └───────────────────────│   (Motor, Frenos, etc.) │    (independiente de inventory_categories)
                                 └─────────────────────────┘
```

- **Productos (`inventory`)**: La receta de cada paquete usa productos ya registrados vía `service_package_items.inventory_item_id → inventory.id`. No se crean productos nuevos.
- **Categorías de inventario (`inventory_categories`)**: Los productos mantienen su `category_id`. El módulo de paquetes no modifica categorías; solo consume productos existentes.
- **Categoría del paquete (`service_packages.category`)**: Es un campo de texto para clasificar paquetes (Motor, Frenos, Suspensión, etc.). Es distinto de `inventory_categories`: una es categoría del producto, la otra del servicio/paquete.

### En resumen

- Los paquetes se arman con productos del inventario actual.
- El descuento usa `inventory.current_stock` de esos productos.
- No hay duplicación de catálogos: se reutiliza inventario y categorías de inventario.

---

## 1. Catálogo de paquetes (`/service-packages`)

### Qué es

Lista de paquetes que la organización define una vez y reutiliza en varias órdenes.

### Campos de un paquete

| Campo | Descripción |
|-------|-------------|
| Nombre | Ej. "Mantenimiento 5,000 km" |
| Descripción | Detalle opcional |
| Categoría | Motor, Frenos, Suspensión, etc. |
| Precio | Precio base del paquete |
| Minutos estimados | Tiempo estimado de trabajo |
| Receta | Productos del inventario + cantidades |

### Receta (items del paquete)

Define qué productos de inventario usa cada paquete y en qué cantidad:

| Producto | Cantidad |
|----------|----------|
| Aceite 5W30 | 4 (litros) |
| Filtro de aceite | 1 |
| Juego de empaques | 1 |

Cada fila es un `service_package_item`: `inventory_item_id` + `quantity`.

### Acciones

- Crear paquete nuevo
- Editar paquete existente
- Eliminar paquete (soft delete)
- Buscar productos del inventario para armar la receta

---

## 2. Servicios en la orden de trabajo

Dentro de una orden de trabajo, en la pestaña **Servicios**, se pueden agregar tres tipos de conceptos:

### Paquete (`package`)

- Usa un paquete del catálogo.
- Al agregar se copian nombre y precio del paquete.
- Puedes ajustar precio y cantidad.
- Si algún producto de la receta tiene stock insuficiente, se muestra advertencia pero **se permite agregar** (no bloquea).

### Servicio libre (`free_service`)

- Solo mano de obra (ej. “Revisión de frenos”).
- No consume inventario.
- Campos: nombre, precio unitario, cantidad, descripción.

### Producto suelto (`loose_product`)

- Un producto individual (ej. “Bomba de agua”).
- Opcionalmente vinculado a un ítem del inventario (para descontar stock).
- Si no se vincula, es solo un concepto de cobro sin descuento.

---

## 3. Descuento de inventario al completar

### Cuándo ocurre

Al cambiar el estado de la orden a **Completada** (`status = 'completed'`).

### Qué se descuenta

| Tipo de concepto | Acción |
|------------------|--------|
| **Paquete** | Por cada item de la receta: `current_stock -= (quantity del item × cantidad del servicio)` |
| **Producto suelto** (con `inventory_item_id`) | `current_stock -= cantidad del servicio` |
| **Servicio libre** | No se descuenta nada |

### Importante

- El descuento solo se hace **una vez**: se usa `inventory_deducted = true` para no repetir.
- Si hay stock insuficiente: **se descuenta igual** (hasta 0), no se bloquea la orden.
- Tras el descuento se registra en `inventory_movements` con `reference_type = 'work_order'` y `reference_id = orderId`.
- Si algún producto queda en o por debajo de `min_stock`, se incluye en `low_stock_alerts` en la respuesta del API.

---

## 4. Estructura de datos (tablas)

### `service_packages`

Catálogo de paquetes por organización.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK a organizations |
| name | TEXT | Nombre del paquete |
| description | TEXT | Descripción opcional |
| category | TEXT | Motor, Frenos, etc. |
| price | DECIMAL | Precio base |
| estimated_minutes | INTEGER | Minutos estimados |
| is_active | BOOLEAN | Activo/inactivo |
| deleted_at | TIMESTAMPTZ | Soft delete |

### `service_package_items`

Receta de cada paquete: qué productos usa y en qué cantidad.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| service_package_id | UUID | FK al paquete |
| inventory_item_id | UUID | FK a inventory |
| quantity | DECIMAL | Cantidad requerida |

### `work_order_services`

Conceptos agregados a cada orden.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| work_order_id | UUID | FK a work_orders |
| line_type | TEXT | `package` \| `free_service` \| `loose_product` |
| service_package_id | UUID | FK al paquete (si `line_type = 'package'`) |
| inventory_item_id | UUID | FK a inventory (si `line_type = 'loose_product'`) |
| name | TEXT | Nombre del concepto |
| description | TEXT | Descripción opcional |
| unit_price | DECIMAL | Precio unitario |
| quantity | DECIMAL | Cantidad |
| total_price | DECIMAL | Calculado: `unit_price × quantity` |
| inventory_deducted | BOOLEAN | Si ya se descontó inventario |
| inventory_deducted_at | TIMESTAMPTZ | Momento del descuento |

---

## 5. APIs

### Catálogo de paquetes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/service-packages` | Lista paquetes activos con items e inventario |
| POST | `/api/service-packages` | Crear paquete con items |
| GET | `/api/service-packages/[id]` | Obtener un paquete |
| PUT | `/api/service-packages/[id]` | Actualizar paquete |
| DELETE | `/api/service-packages/[id]` | Eliminar paquete |

### Servicios en la orden

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/work-orders/[id]/services` | Lista servicios de la orden + total |
| POST | `/api/work-orders/[id]/services` | Agregar concepto (package/free_service/loose_product) |
| PUT | `/api/work-orders/[id]/services/[serviceId]` | Editar concepto |
| DELETE | `/api/work-orders/[id]/services/[serviceId]` | Eliminar concepto |

---

## 6. Rutas y componentes

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/service-packages` | `src/app/(dashboard)/service-packages/page.tsx` | Página de catálogo |
| Orden → pestaña Servicios | `WorkOrderServices.tsx` | Agregar/editar/eliminar conceptos |
| Descuento al completar | `deduct-inventory-on-complete.ts` | Lógica de descuento de inventario |

---

## 7. Ejemplo de uso

1. Crear paquete “Mantenimiento 5,000 km”:
   - Precio: $1,800
   - Receta: Aceite 5W30 x4L, Filtro de aceite x1
2. Abrir una orden de trabajo → pestaña **Servicios**.
3. Clic en **+ Paquete** → elegir “Mantenimiento 5,000 km”.
4. Opcional: ajustar precio o cantidad.
5. Agregar otros conceptos (servicios libres, productos sueltos) si aplica.
6. Al finalizar la reparación, cambiar el estado a **Completada**.
7. El sistema descuenta automáticamente 4L de aceite y 1 filtro del inventario.

---

## 8. Multi-tenant y permisos

- Todas las tablas filtran por `organization_id`.
- RLS usa el patrón: `organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())`.
- Cada organización solo ve y modifica sus propios paquetes y conceptos en órdenes.
