# Spec: Órdenes de Trabajo

**Última actualización:** Mayo 2026
**Rutas principales:** `src/app/(dashboard)/ordenes/`, `src/app/api/work-orders/`, `src/app/api/orders/`
**Tabla principal:** `work_orders`

---

## Estados y Flujo

```
pending → in_progress → waiting_approval → waiting_parts → ready → completed
                                                               └→ cancelled (desde cualquier estado)
```

| Estado | Descripción |
|--------|-------------|
| `pending` | Recién creada, sin asignar |
| `in_progress` | Mecánico trabajando |
| `waiting_approval` | Esperando aprobación del cliente |
| `waiting_parts` | Esperando repuestos |
| `ready` | Lista para entregar |
| `completed` | Entregada y cobrada |
| `cancelled` | Cancelada |

**Notificaciones automáticas** al cliente en: `waiting_approval`, `waiting_parts`, `ready`, `completed`
→ Implementado en `src/lib/orders/notifications.ts` → `notifyOrderStatus()`
→ Trigger en `PUT /api/work-orders/[id]`

---

## Estructura de Datos

```typescript
// Campos principales de work_orders
id: uuid
organization_id: uuid          // requerido (multi-tenancy)
workshop_id: uuid | null       // opcional (multi-sucursal)
order_number: string           // generado automáticamente
status: OrderStatus
customer_id: uuid
vehicle_id: uuid
assigned_mechanic_id: uuid | null
estimated_delivery: date | null
total_amount: decimal
notes: text | null
images: jsonb                  // URLs de imágenes en Supabase Storage
```

---

## Items de Orden (`order_items`)

Cada item puede ser servicio o repuesto:
```typescript
order_id, description, quantity, unit_price
discount_percent, discount_amount, tax_percent, tax_amount
subtotal, total
mechanic_id | null   // mecánico asignado al item
status               // pendiente, en progreso, completado
```

**Trigger automático:** `trg_order_items_totals` calcula `subtotal`, `discount_amount`, `tax_amount`, `total` en INSERT/UPDATE.

---

## APIs

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/work-orders` | Listar órdenes (con filtros) |
| POST | `/api/work-orders` | Crear orden |
| GET | `/api/work-orders/[id]` | Detalle |
| PUT | `/api/work-orders/[id]` | Actualizar (dispara notificaciones) |
| DELETE | `/api/work-orders/[id]` | Eliminar |
| GET | `/api/orders/[id]/items` | Items de orden |
| PUT | `/api/orders/[id]/items/[itemId]` | Actualizar item |
| POST | `/api/orders/[id]/totals` | Recalcular totales |
| POST | `/api/work-orders/[id]/notify` | Notificar manualmente al cliente |

**PROTEGIDO — nunca modificar:** `src/app/api/work-orders/route.ts`

---

## Conversión

- Cotización → Orden de trabajo: `POST /api/quotations/[id]/convert-to-work-order`
- Orden → Nota de venta: crea `invoice` con los items de la orden

---

## Permisos por Rol

- **Admin/Advisor:** pueden ver, crear, editar y eliminar todas las órdenes
- **Mechanic:** solo ve/edita órdenes donde `assigned_mechanic_id = su userId`
  - Validar con `canAccessWorkOrder()` en toda API route
