# Spec: Módulo Financiero

**Última actualización:** Mayo 2026
**Tablas:** `cash_accounts`, `cash_account_movements`, `financial_transactions`, `collections`, `invoice_payments`, `supplier_payments`

---

## Cuentas de Efectivo (`cash_accounts`)

```typescript
id, organization_id
name: string
type: 'cash' | 'bank' | 'card'
balance: decimal                // saldo actual
is_active: boolean
```

---

## Movimientos de Caja (`cash_account_movements`)

```typescript
id, organization_id, cash_account_id
movement_type: 'ingreso' | 'retiro'
amount: decimal
description: text
reference_id: uuid | null       // referencia a pago/cobro
reference_type: string | null
created_by: uuid
```

---

## Transacciones Financieras (`financial_transactions`)

Libro de movimientos diario. Registro de todas las entradas y salidas.

```typescript
id, organization_id
transaction_type: 'income' | 'expense'
amount, date, description
category: string | null
reference_id, reference_type
```

---

## Cobros a Clientes (`collections`)

Cobros directos (independientes de facturas):
```typescript
id, organization_id, customer_id
amount, collection_date
payment_method, reference, notes
```

---

## KPIs del Dashboard

Los siguientes KPIs se calculan en tiempo real:
- **Ingresos del mes:** suma de `invoice_payments` en el mes actual
- **Efectivo disponible:** suma de `cash_accounts` donde `type = 'cash'`
- **Bancos/tarjetas:** suma de `cash_accounts` donde `type IN ('bank', 'card')`
- **Ticket promedio:** total_ingresos / número_de_órdenes_completadas

**Implementación:** `src/lib/database/queries/reports.ts`

---

## APIs Financieras

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/cash-accounts` | Cuentas |
| GET/POST | `/api/cash-movements` | Movimientos |
| GET/POST | `/api/financial-transactions` | Transacciones |
| GET/POST | `/api/collections` | Cobros |
| GET/POST | `/api/invoices/[id]/payments` | Pagos de factura |
| GET | `/api/reports/financial` | Reportes financieros |

---

## Reportes

- `src/app/reportes/financieros/page.tsx` — reporte financiero general
- `src/app/reportes/ventas/page.tsx` — reporte de ventas
- `src/app/reportes/ventas-por-items/page.tsx` — ventas por ítem
- `src/app/analisis-financiero/page.tsx` — análisis avanzado
