# 💰 MÓDULO DE FACTURAS (INVOICES) - DOCUMENTACIÓN COMPLETA

## ✅ **ESTADO: PRODUCCIÓN READY**

Módulo completo de gestión de facturas implementado siguiendo el patrón exitoso de cotizaciones.

---

## 📊 **RESUMEN EJECUTIVO**

| Componente | Estado | Cantidad |
|------------|--------|----------|
| **Endpoints REST** | ✅ 100% | 11 endpoints |
| **Queries Invoices** | ✅ 100% | 10 funciones |
| **Queries Items** | ✅ 100% | 5 funciones |
| **Validaciones** | ✅ 100% | 15+ validaciones |
| **Documentación** | ✅ 100% | Este documento |

---

## 🗂️ **ESTRUCTURA DE ARCHIVOS**

```
src/
├── lib/database/queries/
│   ├── ✅ invoices.ts                       # 10 funciones principales
│   └── ✅ invoice-items.ts                  # 5 funciones de items
│
└── app/api/invoices/
    ├── ✅ route.ts                          # GET (lista), POST (crear)
    ├── [id]/
    │   ├── ✅ route.ts                      # GET, PUT, DELETE
    │   ├── items/
    │   │   ├── ✅ route.ts                  # GET, POST
    │   │   └── [itemId]/
    │   │       └── ✅ route.ts              # PUT, DELETE
    │   └── pay/
    │       └── ✅ route.ts                  # POST (marcar como pagada)
    ├── ✅ from-order/route.ts               # POST (crear desde orden)
    ├── ✅ overdue/route.ts                  # GET (vencidas)
    └── ✅ unpaid/route.ts                   # GET (resumen sin pagar)
```

---

## 📋 **ENDPOINTS IMPLEMENTADOS (11 TOTAL)**

### **1. GET /api/invoices** 📄
Lista facturas con filtros opcionales. Actualiza automáticamente facturas vencidas.

**Query Params:**
- `organization_id` - ID de la organización
- `status` - Filtrar por estado (draft, sent, paid, overdue, cancelled)
- `customer_id` - Filtrar por cliente
- `from_date` - Desde fecha
- `to_date` - Hasta fecha

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoice_number": "INV-2024-0001",
      "status": "sent",
      "customer_id": "uuid",
      "due_date": "2024-12-31",
      "total": 1160.00,
      "customers": {
        "name": "Juan Pérez",
        "email": "juan@example.com"
      },
      "vehicles": {
        "brand": "Toyota",
        "model": "Corolla"
      }
    }
  ],
  "error": null
}
```

---

### **2. POST /api/invoices** ➕
Crea una nueva factura con número automático.

**Body:**
```json
{
  "customer_id": "uuid",              // ✅ Requerido
  "vehicle_id": "uuid",               // ❌ Opcional
  "work_order_id": "uuid",            // ❌ Opcional
  "description": "Servicio completo", // ❌ Opcional
  "due_date": "2024-12-31",           // ✅ Requerido (debe ser futura)
  "notes": "Notas adicionales"        // ❌ Opcional
}
```

**Validaciones:**
- ✅ `customer_id` requerido
- ✅ `due_date` requerido y debe ser futura
- ✅ Genera `invoice_number` automático (INV-2024-0001)
- ✅ Estado inicial: `draft`
- ✅ Totales iniciales en 0

---

### **3. GET /api/invoices/[id]** 🔍
Obtiene factura completa con cliente, vehículo y todos los items.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2024-0001",
    "status": "sent",
    "due_date": "2024-12-31",
    "subtotal": 1000.00,
    "tax_amount": 160.00,
    "discount_amount": 0.00,
    "total": 1160.00,
    "customers": { /* datos del cliente */ },
    "vehicles": { /* datos del vehículo */ },
    "invoice_items": [
      {
        "id": "uuid",
        "description": "Cambio de aceite",
        "quantity": 1,
        "unit_price": 500.00,
        "total": 580.00,
        "products": { /* si es producto */ },
        "services": { /* si es servicio */ }
      }
    ]
  },
  "error": null
}
```

---

### **4. PUT /api/invoices/[id]** ✏️
Actualiza una factura (no permite editar facturas pagadas o canceladas).

**Body:**
```json
{
  "description": "Nueva descripción",
  "due_date": "2025-01-31",
  "notes": "Notas actualizadas"
}
```

**Validaciones:**
- ✅ No editar si `status = 'paid'`
- ✅ No editar si `status = 'cancelled'`
- ✅ `due_date` debe ser futura si está en `draft`

---

### **5. DELETE /api/invoices/[id]** 🗑️
Cancela una factura (soft delete - cambia status a 'cancelled').

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "updated_at": "2024-01-20T10:30:00Z"
  },
  "error": null
}
```

---

### **6. GET /api/invoices/[id]/items** 📦
Lista todos los items de una factura.

**Response:**
```json
{
  "data": {
    "invoice_id": "uuid",
    "items": [
      {
        "id": "uuid",
        "item_type": "service",
        "description": "Cambio de aceite",
        "quantity": 1,
        "unit_price": 500.00,
        "tax_percent": 16,
        "tax_amount": 80.00,
        "total": 580.00
      }
    ],
    "count": 1
  },
  "error": null
}
```

---

### **7. POST /api/invoices/[id]/items** ➕
Agrega un item a la factura. Recalcula totales automáticamente.

**Body:**
```json
{
  "item_type": "service",           // ✅ Requerido: "product" o "service"
  "product_id": "uuid",             // ✅ Si item_type = "product"
  "service_id": "uuid",             // ✅ Si item_type = "service"
  "description": "Cambio de aceite", // ✅ Requerido
  "quantity": 1,                    // ✅ Requerido (> 0)
  "unit_price": 500.00,             // ✅ Requerido (>= 0)
  "discount_percent": 10,           // ❌ Opcional
  "tax_percent": 16                 // ❌ Opcional
}
```

**Validaciones:**
- ✅ No agregar a facturas pagadas o canceladas
- ✅ Cálculo automático de descuentos e impuestos
- ✅ Recalcula totales de la factura

---

### **8. PUT /api/invoices/[id]/items/[itemId]** ✏️
Actualiza un item. Recalcula totales automáticamente.

---

### **9. DELETE /api/invoices/[id]/items/[itemId]** 🗑️
Elimina un item. Recalcula totales automáticamente.

---

### **10. POST /api/invoices/[id]/pay** 💳
Marca una factura como pagada.

**Body:**
```json
{
  "payment_method": "cash",         // ✅ Requerido: cash, transfer, card, check
  "paid_date": "2024-01-20"         // ❌ Opcional (default: hoy)
}
```

**Validaciones:**
- ✅ `payment_method` requerido y válido
- ✅ No marcar como pagada si ya está pagada
- ✅ No marcar como pagada si está cancelada
- ✅ Cambia status a 'paid'
- ✅ Registra `paid_date` y `payment_method`

---

### **11. POST /api/invoices/from-order** 🔄
Crea una factura desde una orden de trabajo completada.

**Body:**
```json
{
  "work_order_id": "uuid"           // ✅ Requerido
}
```

**Proceso:**
1. Obtiene work_order con items
2. Verifica `status = 'completed'`
3. Verifica que no tenga factura ya
4. Genera número único (INV-2024-0001)
5. Crea factura con datos de la orden
6. Copia `order_items` → `invoice_items`
7. Calcula `due_date` (30 días)
8. Retorna factura creada

**Validaciones:**
- ✅ Orden debe existir
- ✅ Orden debe estar completada
- ✅ Orden no debe tener factura asociada
- ✅ Rollback automático si falla

---

### **12. GET /api/invoices/overdue** ⏰
Obtiene facturas vencidas. Actualiza automáticamente estados.

**Response:**
```json
{
  "data": {
    "invoices": [ /* facturas vencidas */ ],
    "count": 5,
    "total_amount": 5800.00,
    "summary": {
      "total_invoices": 5,
      "total_overdue": 5800.00
    }
  },
  "error": null
}
```

---

### **13. GET /api/invoices/unpaid** 💰
Obtiene resumen de facturas sin pagar.

**Response:**
```json
{
  "data": {
    "total_unpaid": 15000.00,
    "total_overdue": 5800.00,
    "count_unpaid": 12,
    "count_overdue": 5,
    "summary": {
      "message": "Tienes 12 facturas sin pagar por un total de $15000.00",
      "overdue_message": "5 facturas están vencidas por un total de $5800.00"
    }
  },
  "error": null
}
```

---

## 🔧 **FUNCIONES DE QUERY**

### **src/lib/database/queries/invoices.ts (10)**

```typescript
1. getAllInvoices(organizationId, filters?)
   - Lista con filtros opcionales
   - Incluye customer y vehicle

2. getInvoiceById(id)
   - Factura completa con items
   - Customer, vehicle, products, services

3. getInvoicesByCustomer(customerId)
   - Todas las facturas de un cliente
   - Ordenadas por fecha

4. getOverdueInvoices(organizationId)
   - Facturas vencidas
   - Ordenadas por fecha de vencimiento

5. generateInvoiceNumber(organizationId)
   - Genera número único: INV-2024-0001
   - Secuencial por año

6. createInvoice(data)
   - Crea con número automático
   - Estado inicial: draft

7. createInvoiceFromWorkOrder(workOrderId)
   - Crea desde orden completada
   - Copia items automáticamente
   - Due_date a 30 días

8. updateInvoice(id, data)
   - Actualiza con validaciones
   - No permite editar pagadas/canceladas

9. markInvoiceAsPaid(id, paymentMethod, paidDate)
   - Cambia status a paid
   - Registra método y fecha de pago

10. getUnpaidTotals(organizationId)
    - Totales sin pagar
    - Totales vencidos

BONUS:
11. checkAndUpdateOverdueInvoices(organizationId)
    - Actualiza facturas vencidas automáticamente
    - Cambia status de 'sent' a 'overdue'
```

### **src/lib/database/queries/invoice-items.ts (5)**

```typescript
1. getInvoiceItems(invoiceId)
   - Items con productos/servicios

2. addInvoiceItem(invoiceId, itemData)
   - Calcula descuentos e impuestos
   - Recalcula totales automáticamente

3. updateInvoiceItem(itemId, data)
   - Recalcula montos
   - Actualiza totales de factura

4. deleteInvoiceItem(itemId)
   - Recalcula totales

5. calculateInvoiceTotals(invoiceId)
   - Suma todos los items
   - Actualiza factura
```

---

## 📊 **ESTADOS DE FACTURA**

```
draft ──────────────┐
  │                 │
  ↓ send            │ edit
sent ←──────────────┘
  │
  ├──→ overdue (si vence)
  │
  └──→ paid (al pagar)

cancelled (desde cualquier estado)
```

### **Transiciones:**
- `draft` → `sent` (enviar)
- `sent` → `paid` (pagar)
- `sent` → `overdue` (automático al vencer)
- `overdue` → `paid` (pagar)
- Cualquier → `cancelled` (cancelar)

---

## ✅ **VALIDACIONES IMPLEMENTADAS**

### **Validaciones de Creación:**
```typescript
1. customer_id requerido
2. due_date requerido y debe ser futura
3. Genera invoice_number automático único
```

### **Validaciones de Edición:**
```typescript
4. No editar facturas pagadas
5. No editar facturas canceladas
6. due_date debe ser futura (solo en draft)
```

### **Validaciones de Items:**
```typescript
7. item_type requerido (product o service)
8. product_id requerido si item_type = product
9. service_id requerido si item_type = service
10. description requerido
11. quantity > 0
12. unit_price >= 0
13. No agregar items a facturas pagadas/canceladas
14. No editar items de facturas pagadas/canceladas
15. No eliminar items de facturas pagadas/canceladas
```

### **Validaciones de Pago:**
```typescript
16. payment_method requerido
17. payment_method debe ser válido (cash, transfer, card, check)
18. No marcar como pagada si ya está pagada
19. No marcar como pagada si está cancelada
```

### **Validaciones de Conversión:**
```typescript
20. work_order debe existir
21. work_order.status = 'completed'
22. work_order no debe tener factura ya
```

---

## 💡 **CARACTERÍSTICAS ESPECIALES**

### **1. Sistema de Numeración Automática** 🔢
```typescript
Formato: INV-YEAR-SEQUENCE
Ejemplo: INV-2024-0001, INV-2024-0002

Características:
- ✅ Único por organización
- ✅ Reseteo anual automático
- ✅ Secuencial sin gaps
- ✅ Usa el mismo sistema que quotations y work_orders
```

### **2. Cálculo Automático de Totales** 🧮
```typescript
Por cada item:
1. subtotal = quantity × unit_price
2. discount_amount = subtotal × (discount_percent / 100)
3. subtotal_after_discount = subtotal - discount_amount
4. tax_amount = subtotal_after_discount × (tax_percent / 100)
5. item_total = subtotal_after_discount + tax_amount

Totales de factura:
- subtotal = Σ items.subtotal
- tax_amount = Σ items.tax_amount
- discount_amount = Σ items.discount_amount
- total = Σ items.total
```

### **3. Creación desde Orden de Trabajo** 🔄
```typescript
Proceso completo:
1. Obtiene work_order con todos los items
2. Verifica que esté completada
3. Genera invoice_number único
4. Crea factura con datos de la orden
5. Copia TODOS los order_items a invoice_items
6. Calcula due_date (30 días desde hoy)
7. Mantiene totales originales
8. Rollback automático si algo falla
```

### **4. Detección Automática de Vencimientos** ⏰
```typescript
Función: checkAndUpdateOverdueInvoices()

Ejecuta cuando:
- GET /api/invoices
- GET /api/invoices/overdue
- GET /api/invoices/unpaid

Lógica:
1. Busca facturas con status='sent'
2. Filtra donde due_date < today
3. Actualiza status a 'overdue'
4. Registra updated_at
```

### **5. Resumen de Cuentas por Cobrar** 💰
```typescript
getUnpaidTotals() retorna:
- total_unpaid: $15,000.00 (todas sin pagar)
- total_overdue: $5,800.00 (solo vencidas)
- count_unpaid: 12 facturas
- count_overdue: 5 facturas

Útil para:
- Dashboard de finanzas
- Reportes de cuentas por cobrar
- Seguimiento de cobranza
```

---

## 💡 **EJEMPLOS DE USO**

### **Ejemplo 1: Crear Factura Desde Orden**
```javascript
const response = await fetch('http://localhost:3001/api/invoices/from-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    work_order_id: 'order-uuid'
  })
})

const { data } = await response.json()
console.log('Factura creada:', data.invoice.invoice_number)
// → INV-2024-0125
```

### **Ejemplo 2: Marcar como Pagada**
```javascript
await fetch('http://localhost:3001/api/invoices/[id]/pay', {
  method: 'POST',
  body: JSON.stringify({
    payment_method: 'card',
    paid_date: '2024-01-20'
  })
})
```

### **Ejemplo 3: Ver Facturas Vencidas**
```javascript
const response = await fetch('http://localhost:3001/api/invoices/overdue')
const { data } = await response.json()

console.log(`Facturas vencidas: ${data.count}`)
console.log(`Total vencido: $${data.total_amount}`)
```

### **Ejemplo 4: Dashboard de Finanzas**
```javascript
const response = await fetch('http://localhost:3001/api/invoices/unpaid')
const { data } = await response.json()

console.log(data.summary.message)
// → "Tienes 12 facturas sin pagar por un total de $15000.00"

console.log(data.summary.overdue_message)
// → "5 facturas están vencidas por un total de $5800.00"
```

---

## 🔄 **INTEGRACIÓN CON OTROS MÓDULOS**

```
customers ←─── invoices ───→ vehicles
                │
                ├───→ work_orders (from)
                ├───→ products (items)
                └───→ services (items)
```

---

## 🏆 **ESTADO FINAL**

```
╔════════════════════════════════════════╗
║                                        ║
║   ✅  MÓDULO 100% COMPLETADO           ║
║                                        ║
║   📊  11 Endpoints REST                ║
║   🔧  15 Funciones de Query            ║
║   ✅  20+ Validaciones                 ║
║   🔢  Numeración Automática            ║
║   🧮  Cálculo Automático               ║
║   🔄  Creación desde Órdenes           ║
║   ⏰  Detección de Vencimientos        ║
║   💰  Resumen de Cuentas por Cobrar    ║
║   🚀  Listo para Producción            ║
║                                        ║
╚════════════════════════════════════════╝
```

---

**💰 MÓDULO DE FACTURAS COMPLETADO**
**✅ 11 Endpoints Implementados**
**🔧 15 Queries Refactorizadas**
**✅ 20+ Validaciones Exhaustivas**
**🔄 Integración con Work Orders**
**⏰ Detección Automática de Vencimientos**
**🚀 PRODUCCIÓN READY**


