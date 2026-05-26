# Spec: Inventario

**Última actualización:** Mayo 2026
**Rutas:** `src/app/(dashboard)/inventario/`, `src/app/api/inventory/`
**Tablas:** `inventory`, `inventory_categories`, `inventory_movements`

---

## Modelo de Datos

### `inventory` (items de inventario)

```typescript
id, organization_id
code: string | null              // código interno (campo original)
name, description
category_id: uuid | null         // → inventory_categories (UUID, mig 007)
category: string | null          // texto libre de categoría (campo original)
sku: string | null               // SKU (agregado mig 007)
barcode: string | null
unit: string                     // "pieza", "litro", "kit", etc.
unit_price: decimal              // precio de venta al cliente
purchase_price: decimal | null   // costo de compra al proveedor (Mayo 2026)
quantity: integer                // stock actual  ← columna correcta
min_quantity: integer            // umbral de alerta de stock bajo
max_stock: integer | null
status: 'active' | 'inactive'
created_at, updated_at
```

### `inventory_categories`

```typescript
id, organization_id, name, description, color, icon, is_active
```

### `inventory_movements`

```typescript
id, organization_id, product_id
movement_type: 'entrada' | 'salida' | 'ajuste'
quantity: decimal
previous_stock, new_stock
reference: string | null         // referencia externa (ej. orden de compra)
notes, created_by
```

---

## Reglas de Negocio

- **Stock bajo:** alerta cuando `quantity <= min_quantity`. Visible en dashboard y notificaciones.
- **Stock negativo:** permitido con `movementType = 'salida'` si el negocio lo requiere (validar por config).
- **Movimiento automático:** cuando se usa un producto en una orden de trabajo, se registra salida automáticamente.
- **`purchase_price`:** campo agregado en migración `20260519130000`. Usado para calcular margen en reportes.

---

## Anti-fraude en Inventario (Mayo 2026)

Sistema de detección de anomalías activo. Ver `src/lib/agent/erp-tools.ts`.
- Detecta entradas/salidas inusualmente grandes
- Detecta patrones de ajuste frecuente
- Alerta en dashboard de administrador

---

## APIs

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory` | Listar productos |
| POST | `/api/inventory` | Crear producto |
| GET/PUT/DELETE | `/api/inventory/[id]` | CRUD por ID |
| POST | `/api/inventory/[id]/stock` | Ajustar stock |
| GET/POST/PUT/DELETE | `/api/inventory/categories/[id]` | CRUD categorías |

---

## Hooks y Componentes Clave

- `src/hooks/useInventory.ts` — hook principal de datos
- `src/components/inventory/InventoryForm.tsx` — formulario de creación/edición
- Reportes de inventario: `src/app/reportes/inventario/page.tsx`
