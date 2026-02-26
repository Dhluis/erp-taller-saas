# Análisis: Consistencia Entradas (Ingresos) vs Salidas (Compras) y flujo a Reportes/Dashboard

## Convención usada

- **Entradas:** Ingresos y sus páginas (Facturación, Cobros, Cuentas de efectivo) = dinero que entra o se tiene disponible.
- **Salidas:** Compras y sus páginas (Órdenes de Compra, Proveedores, Pagos) = dinero que sale o compromiso de pago.

---

## 1. Fuentes de datos por módulo

### Entradas (Ingresos)

| Módulo              | Tabla(s) / API principal     | ¿Alimenta Dashboard? | ¿Alimenta Reportes? |
|---------------------|------------------------------|----------------------|----------------------|
| **Facturación**     | `invoices` (status, total_amount, paid_date) | Sí — "Ingresos del mes" vía `/api/ingresos/stats` → `getIncomeStats` | Sí — Reportes Financieros: `totalRevenue` por facturas pagadas en rango |
| **Cobros**          | `collections`                | No                   | No                   |
| **Cuentas efectivo**| `cash_accounts`, `cash_account_movements` | Sí — "Efectivo en caja" vía `/api/cash-accounts` | Sí — Reportes Financieros: "Saldo disponible" |

Además, la **página Reportes (general)** usa **work_orders** (órdenes de trabajo) para calcular `totalRevenue` y `monthlyRevenue` — es una segunda fuente de “ingresos” no alineada con facturación.

### Salidas (Compras)

| Módulo                | Tabla(s) / API principal     | ¿Alimenta Dashboard? | ¿Alimenta Reportes? |
|-----------------------|------------------------------|----------------------|----------------------|
| **Órdenes de Compra**  | `purchase_orders` (status, total_amount, order_date) | No (no hay card de gastos) | Sí — Reportes Financieros: `totalExpenses` por OC con status `received` en rango |
| **Proveedores**       | `suppliers`                  | No                   | No (solo datos maestros) |
| **Pagos (compras)**   | `payments` (supplier_id, amount, payment_date) | No                   | No                   |

---

## 2. ¿Qué “conoce” a qué?

### Entradas

- **Facturación ↔ Cobros:** No integrados. Los cobros (`collections`) no actualizan el estado de facturas ni viceversa en un flujo automático; el reporte de ingresos se basa solo en `invoices.status = 'paid'` y `paid_date`, no en la tabla `collections`.
- **Cobros ↔ Cuentas de efectivo:** No conectados. Registrar o marcar un cobro no crea movimiento en `cash_account_movements`; la API de movimientos acepta `reference_type`/`reference_id` pero no hay flujo que los use para cobros.
- **Facturación ↔ Cuentas de efectivo:** No hay flujo que al pagar una factura cree automáticamente un `deposit` en una cuenta de efectivo.

### Salidas

- **Órdenes de Compra ↔ Inventario:** Sí. Al recibir una OC se crean `inventory_movements` con `reference_type: 'purchase_order'`. No se crean movimientos en `cash_account_movements` al recibir la OC.
- **Pagos (compras) ↔ Reportes:** Los pagos a proveedores (`payments`) no se usan en `getFinancialReport`. Los “gastos” en Reportes Financieros vienen solo de `purchase_orders` (received), no de la tabla de pagos.
- **Pagos (compras) ↔ Cuentas de efectivo:** No verificado en código; si existiera registro de pago a proveedor, no hay evidencia de que cree automáticamente un movimiento de tipo withdrawal en cuentas de efectivo.

### Dashboard y Reportes

- **Dashboard:**  
  - Ingresos: solo facturas (`/api/ingresos/stats`).  
  - Efectivo: suma de saldos de cuentas de efectivo.  
  - No muestra gastos ni resumen de Compras.
- **Reportes (página general):** Ingresos = suma de `total_amount` de **work_orders** (todas), no de facturas → doble criterio de “ingresos” según la página.
- **Reportes Financieros:**  
  - Ingresos = facturas pagadas en rango.  
  - Gastos = órdenes de compra recibidas en rango.  
  - Saldo = suma de cuentas de efectivo.  
  - No usan `collections` ni tabla `payments` (compras).

---

## 3. Resumen de consistencia

| Aspecto | Estado | Comentario |
|--------|--------|------------|
| Definición única de “ingreso” | Parcial | Facturación y Reportes Financieros coinciden (invoices). Reportes general usa work_orders. Cobros no cuenta en ningún reporte. |
| Definición única de “gasto” | Parcial | Solo Órdenes de Compra (received) cuentan. Pagos a proveedores no. |
| Entradas → Cuentas de efectivo | Baja | Cobro registrado no genera movimiento en caja. Factura pagada tampoco. |
| Salidas → Cuentas de efectivo | Baja | Recibir OC no genera salida en caja. Pagos a proveedores no verificados. |
| Dashboard ↔ Compras | Baja | No hay tarjeta ni métrica de gastos/compras en el dashboard. |
| Un solo “hub” de datos para reportes | No | Cada reporte arma sus números desde tablas distintas; no hay capa unificada entrada/salida. |

---

## 4. Recomendaciones (orden sugerido)

1. **Unificar criterio de ingresos**  
   Decidir si “ingresos” en reportes/dashboard son por facturas pagadas, por cobros (`collections`), o ambos sincronizados, y que la página Reportes (general) use el mismo criterio (p. ej. facturas) en lugar de work_orders para total revenue.

2. **Conectar Cobros con Cuentas de efectivo**  
   Al registrar/marcar un cobro como pagado, permitir elegir cuenta de efectivo y crear un movimiento `deposit` con `reference_type: 'collection'` y `reference_id: id_cobro`.

3. **Conectar Facturación (pago) con Cuentas de efectivo**  
   Al registrar pago de factura (invoice_payments), opcionalmente crear movimiento en una cuenta de efectivo con referencia a la factura/pago.

4. **Incluir Pagos (compras) en gastos**  
   En `getFinancialReport`, considerar gastos desde la tabla `payments` (pagos a proveedores) en el rango de fechas, además o en lugar de solo `purchase_orders` received, según el criterio de negocio (compromiso vs flujo de caja).

5. **Salidas → Cuentas de efectivo**  
   Al registrar un pago a proveedor, crear movimiento `withdrawal` en la cuenta elegida con `reference_type: 'payment'` (o `supplier_payment`) y `reference_id`.

6. **Dashboard: tarjeta de gastos**  
   Añadir una métrica de “Gastos del mes” o “Compras” alimentada por los mismos criterios que Reportes Financieros (p. ej. OC received y/o pagos a proveedores) para que Compras “se vea” en el dashboard.

7. **Capa de abstracción opcional**  
   Para reportes y dashboard, valorar una capa (servicio o API) que exponga “entradas” y “salidas” por período con fuentes claras (facturas, cobros, work_orders, OC, pagos) para mantener una sola fuente de verdad y evitar duplicidad de lógica.

---

*Documento generado a partir del análisis del código en el repositorio (dashboard, reportes, APIs de ingresos, cash-accounts, collections, purchase_orders, payments, getFinancialReport, getIncomeStats).*
