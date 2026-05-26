# Spec: Compras y Proveedores

**Última actualización:** Mayo 2026
**Tablas:** `suppliers`, `purchase_orders`, `purchase_order_items`, `supplier_payments`
**Rutas:** `src/app/compras/`, `src/app/api/purchase-orders/`, `src/app/api/suppliers/`

---

## Proveedores (`suppliers`)

```typescript
id, organization_id
name, email, phone
contact_name: string | null
address: text | null
rfc: string | null
notes: text | null
is_active: boolean
```

---

## Órdenes de Compra (`purchase_orders`)

### Estados
```
draft → sent → received → cancelled
```

```typescript
id, organization_id
supplier_id: uuid
order_number: string            // generado automáticamente
status: PurchaseOrderStatus
subtotal, tax_amount, total
notes: text | null
expected_date: date | null
received_date: date | null
```

### Items (`purchase_order_items`)
```typescript
product_id: uuid | null         // referencia a inventario
description: string
quantity, unit_price, total
received_quantity: decimal | null
```

### Aprobación de Órdenes de Compra (Mayo 2026)

- `POST /api/purchase-orders/[id]/approve` — aprobar orden
- Solo `admin` puede aprobar
- Al aprobar y marcar como recibida, actualiza stock en `products` automáticamente

**Anticipo de Compra:**
- Tabla: `cash_advances` (agregada en sistema antifraude / May 2026)
- Rutas: `src/app/compras/anticipos/`, `src/app/api/cash-advances/`
- Representa pagos anticipados a proveedores antes de recibir mercancía

---

## Pagos a Proveedores (`supplier_payments`)

```typescript
id, organization_id, supplier_id
purchase_order_id: uuid | null
amount, payment_date
payment_method: string
reference: string | null
```

---

## APIs

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/suppliers` | Listar / crear |
| GET/PUT/DELETE | `/api/suppliers/[id]` | CRUD |
| GET/POST | `/api/purchase-orders` | Listar / crear |
| GET/PUT/DELETE | `/api/purchase-orders/[id]` | CRUD |
| POST | `/api/purchase-orders/[id]/approve` | Aprobar (admin) |
| GET/POST | `/api/cash-advances` | Anticipos |
| GET/PUT/DELETE | `/api/cash-advances/[id]` | CRUD anticipos |
