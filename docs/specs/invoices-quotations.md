# Spec: Facturas (Notas de Venta) y Cotizaciones

**Última actualización:** Mayo 2026
**Tablas:** `invoices`, `invoice_items`, `invoice_payments`, `quotations`, `quotation_items`

---

## Cotizaciones (`quotations`)

### Estados
```
draft → sent → approved → rejected
                └→ converted_to_invoice
                └→ converted_to_work_order
```

### Reglas
- Solo `admin` puede aprobar o rechazar cotizaciones
- Al aprobar se puede convertir a nota de venta o a orden de trabajo
- Versioning: cada cotización tiene `version` (1, 2, 3...) al editarse

### APIs Cotizaciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/quotations` | Listar / crear |
| GET/PUT/DELETE | `/api/quotations/[id]` | CRUD |
| POST | `/api/quotations/[id]/approve` | Aprobar (solo admin) |
| POST | `/api/quotations/[id]/reject` | Rechazar (solo admin) |
| POST | `/api/quotations/[id]/convert` | Convertir a factura u orden |
| GET/POST | `/api/quotations/[id]/items` | Items |

---

## Notas de Venta / Facturas (`invoices`)

### Estados
```
draft → pending → partial → paid
              └→ cancelled
```

| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador |
| `pending` | Emitida, sin pago |
| `partial` | Pago parcial registrado |
| `paid` | Pagada completamente |
| `cancelled` | Cancelada |

### Reglas
- Solo `admin` puede cobrar facturas (`hasPermission(role, 'invoices', 'pay')`)
- No se puede eliminar una factura con estado `paid`
- No se pueden editar items de facturas con estado `paid`
- El descuento no puede ser negativo

### Cálculo de Totales
```
subtotal = sum(items.total)
discount = subtotal * discount_rate
tax = (subtotal - discount) * tax_rate
total = subtotal - discount + tax
paid_amount = sum(invoice_payments.amount)
status = paid si paid_amount >= total, partial si 0 < paid_amount < total
```

**Trigger:** `update_invoices_updated_at` — actualiza `updated_at` automáticamente.

### APIs Facturas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/invoices` | Listar / crear |
| GET/PUT/PATCH/DELETE | `/api/invoices/[id]` | CRUD |
| PUT | `/api/invoices/[id]/discount` | Actualizar descuento |
| GET/POST/PUT | `/api/invoices/[id]/items` | Items |
| GET/PUT/DELETE | `/api/invoices/[id]/items/[itemId]` | Item específico |
| POST | `/api/invoices/[id]/pay` | Marcar como pagada |
| GET/POST | `/api/invoices/[id]/payments` | Registrar/listar pagos |

---

## Pagos (`invoice_payments`)

```typescript
id, organization_id, invoice_id
amount: decimal
payment_method: 'cash' | 'card' | 'transfer' | 'check' | 'other'
payment_date: date
reference: string | null
notes: string | null
cash_account_id: uuid | null     // si pago va a una cuenta de caja
```

Al registrar un pago, el estado de la factura se recalcula automáticamente.

---

## Items

### `invoice_items`
```typescript
id, organization_id, invoice_id
description: string              // nombre del producto/servicio
quantity, unit_price, total_price
```
> **Nota:** La interfaz TypeScript tiene `item_name` → mapear a `description` en la BD.

### `quotation_items`
```typescript
id, quotation_id, organization_id
item_type: 'service' | 'part'
item_name, description
quantity, unit_price
discount_percent, tax_percent
subtotal, discount_amount, tax_amount, total
```
**Trigger:** `trg_quotation_items_totals` calcula totales automáticamente.
