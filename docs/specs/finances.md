# Spec: Módulo Financiero

**Última actualización:** Junio 2026
**Tablas:** `cash_accounts`, `cash_account_movements`, `financial_transactions`, `collections`, `invoice_payments`, `supplier_payments`, `cash_advances`, `cash_closures`

---

## Cuentas de Efectivo (`cash_accounts`)

```typescript
id, organization_id
name: string
account_type: 'cash' | 'bank' | 'card'
current_balance: decimal
is_active: boolean
account_number?: string
notes?: string
```

---

## Entradas y Salidas (`/finanzas/pagos-gastos`)

Página unificada con **dos tabs principales**:

### Tab "Movimientos"
Maneja 3 tipos de registros:
1. **Cobros de clientes** → tabla `collections` + `financial_transactions` (income, cobro_factura)
2. **Pagos a proveedores** → tabla `payments` + `financial_transactions` + `cash_account_movements`
3. **Gastos operativos** → tabla `expenses` + `financial_transactions` (expense, gasto_operativo)

#### Escáner de Ticket IA (Premium/Trial)
Botón "Escanear Ticket IA" en la barra del tab Movimientos. Acepta imagen o PDF.

- **API:** `POST /api/receipts/scan` (`src/app/api/receipts/scan/route.ts`)
- **Modelo:** GPT-4o vision (`gpt-4o`, temp=0)
- **Retorna:** `{ vendor, date, total, description, suggested_category }`
- **Categorías sugeridas:** `renta | servicios | nomina | herramientas | limpieza | comida | transporte | publicidad | mantenimiento | otro`
- **Flujo:** el resultado pre-llena el formulario de "Nuevo registro" para que el usuario confirme antes de guardar
- **Storage:** la imagen se sube a `work-order-documents/receipts/{org_id}/{timestamp}_{filename}` (no-fatal si falla)
- **Gate:** `checkAIAgentEnabled(orgId)` server-side → 403 si plan free; archivo se sube igualmente en PDF (sin extracción)

### Tab "Anticipos de Efectivo"
Gestión de anticipos entregados a empleados:
- Lista con KPIs: anticipos abiertos, saldo pendiente, diferencias
- Filtros por estado: open / closed / cancelled
- Formulario de creación con método de entrega y cuenta origen
- Detalle al hacer click: gastos cargados, saldo disponible, botones cerrar/cancelar

**URL directa:** `/finanzas/pagos-gastos?tab=anticipos`

---

## Anticipos de Efectivo (`cash_advances`)

```typescript
id, organization_id
amount: decimal
purpose: string
status: 'open' | 'closed' | 'cancelled'
payment_method: 'cash' | 'transfer' | 'card'
cash_account_id: uuid | null
employee_id: uuid | null
created_by: uuid
notes?: string
```

**Al crear un anticipo:**
1. Inserta en `cash_advances`
2. Si hay `cash_account_id` → inserta `cash_account_movements` (withdrawal)
3. **Siempre** inserta en `financial_transactions` (expense, categoría `anticipo_efectivo`) — libro contable

**Brecha corregida (Mayo 2026):** Antes los anticipos no generaban `financial_transactions`. Ahora sí, aparecen en Resumen del Día.

---

## Transacciones Financieras (`financial_transactions`)

Libro de movimientos central. Todos los movimientos deben registrarse aquí.

```typescript
id, organization_id
transaction_type: 'income' | 'expense'
amount, description, date
category: string  // cobro_factura | pago_proveedor | gasto_operativo | anticipo_efectivo | compra_inventario | ...
reference_id, reference_type
account_id: uuid | null
created_by: uuid
```

**Categorías conocidas:**
- `cobro_factura` — cobro directo a cliente
- `pago_proveedor` — pago a proveedor
- `gasto_operativo` — gasto del taller (renta, servicios, etc.)
- `anticipo_efectivo` — anticipo entregado a empleado
- `compra_inventario` — compra de refacciones via OC
- `deposito_caja` / `retiro_caja` / `ajuste` / `nota_credito` / `otro`

---

## Arqueo de Caja (`/finanzas` → sección Arqueo)

Conteo físico de billetes y monedas contra saldo del sistema.

- Denominaciones: $1000, $500, $200, $100, $50, $20, $10, $5, $2, $1, $0.50
- **Diferencia = contado - saldo sistema**
- Solo muestra Faltante/Sobrante cuando `countedTotal > 0` (fix Mayo 2026)
- Registra en `cash_closures`

### `cash_closures`

```typescript
id, organization_id
cash_account_id: uuid           // FK a cash_accounts
closed_at: datetime             // timestamp del cierre
opening_balance: decimal        // saldo inicial del período
closing_balance: decimal        // saldo del sistema al cierre
counted_amount: decimal         // conteo físico
difference: decimal             // counted_amount - closing_balance (negativo = faltante, positivo = sobrante)
notes: string | null
created_by: uuid | null
created_at: datetime
```

**Queries:** `src/lib/database/queries/cash-closures.ts` → `getCashClosures()`, `getCashClosureById()`, `createCashClosure()`

---

## Sidebar — Estructura actual

**Compras:**
- Órdenes de Compra → `/compras/ordenes`
- Proveedores → `/compras/proveedores`

**Finanzas:**
- Resumen del Día → `/finanzas`
- Facturación → `/ingresos/facturacion`
- Cuentas → `/finanzas/cuentas`
- Entradas y Salidas → `/finanzas/pagos-gastos`
- Anticipos de Efectivo → `/finanzas/pagos-gastos?tab=anticipos`

`/compras/anticipos` → redirect a `/finanzas/pagos-gastos?tab=anticipos`

---

## APIs Financieras

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/cash-accounts` | Cuentas |
| GET/POST | `/api/cash-advances` | Anticipos (POST también registra en financial_transactions) |
| GET/PATCH | `/api/cash-advances/[id]` | Detalle y cambio de estado |
| GET/POST | `/api/financial-transactions` | Libro contable |
| GET/POST | `/api/collections` | Cobros a clientes |
| GET/POST | `/api/supplier-payments` | Pagos a proveedores |
| GET/POST | `/api/expenses` | Gastos operativos |
| GET/POST | `/api/cash-closures` | Arqueos de caja |
| POST | `/api/receipts/scan` | Escáner IA de tickets — extrae vendor/fecha/monto/categoría con GPT-4o (Premium/Trial) |
| GET | `/api/reports/order-stats` | Stats de órdenes para Reportes |

---

## Reportes

- `src/app/reportes/financieros/page.tsx` — reporte financiero general
- `src/app/reportes/ventas/page.tsx` — reporte de ventas
- `src/app/reportes/ventas-por-items/page.tsx` — ventas por ítem
- `src/app/finanzas/page.tsx` — Resumen del Día con arqueo de caja
