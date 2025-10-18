# 💰 FACTURAS - REFERENCIA COMPLETA DE API

## 📋 **ÍNDICE DE ENDPOINTS (11 TOTAL)**

### **CRUD Básico (5 endpoints)**
1. `GET /api/invoices` - Listar facturas con filtros
2. `POST /api/invoices` - Crear nueva factura
3. `GET /api/invoices/[id]` - Ver factura completa
4. `PUT /api/invoices/[id]` - Actualizar factura
5. `DELETE /api/invoices/[id]` - Cancelar factura

### **Gestión de Items (4 endpoints)**
6. `GET /api/invoices/[id]/items` - Listar items
7. `POST /api/invoices/[id]/items` - Agregar item
8. `PUT /api/invoices/[id]/items/[itemId]` - Actualizar item
9. `DELETE /api/invoices/[id]/items/[itemId]` - Eliminar item

### **Acciones Especiales (4 endpoints)**
10. `POST /api/invoices/[id]/pay` - Marcar como pagada ⭐
11. `POST /api/invoices/from-order` - Crear desde orden ⭐
12. `GET /api/invoices/overdue` - Facturas vencidas ⭐
13. `GET /api/invoices/unpaid` - Resumen sin pagar ⭐

---

## 📊 **ENDPOINTS DETALLADOS**

---

### **1️⃣ GET /api/invoices**
Lista todas las facturas con filtros opcionales. Actualiza automáticamente facturas vencidas.

**URL:** `GET /api/invoices`

**Query Params:**
```typescript
organization_id?: string    // ID de organización
status?: string            // draft, sent, paid, overdue, cancelled
customer_id?: string       // Filtrar por cliente
from_date?: string         // Desde fecha (YYYY-MM-DD)
to_date?: string           // Hasta fecha (YYYY-MM-DD)
```

**Ejemplo:**
```bash
GET /api/invoices?status=sent&customer_id=uuid&from_date=2024-01-01
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoice_number": "INV-2024-0001",
      "status": "sent",
      "customer_id": "uuid",
      "vehicle_id": "uuid",
      "due_date": "2024-12-31",
      "subtotal": 1000.00,
      "tax_amount": 160.00,
      "discount_amount": 0.00,
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

### **2️⃣ POST /api/invoices**
Crea una nueva factura con número automático generado.

**URL:** `POST /api/invoices`

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

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2024-0001",  // ← Generado automáticamente
    "status": "draft",
    "customer_id": "uuid",
    "due_date": "2024-12-31",
    "subtotal": 0.00,
    "total": 0.00
  },
  "error": null
}
```

**Status Codes:**
- `201` - Creada exitosamente
- `400` - Datos inválidos (customer_id o due_date faltante)
- `500` - Error del servidor

---

### **3️⃣ GET /api/invoices/[id]**
Obtiene una factura completa con cliente, vehículo y todos los items.

**URL:** `GET /api/invoices/[id]`

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2024-0001",
    "status": "sent",
    "customer_id": "uuid",
    "vehicle_id": "uuid",
    "work_order_id": "uuid",
    "due_date": "2024-12-31",
    "subtotal": 1000.00,
    "tax_amount": 160.00,
    "discount_amount": 0.00,
    "total": 1160.00,
    "customers": {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "phone": "555-1234"
    },
    "vehicles": {
      "id": "uuid",
      "brand": "Toyota",
      "model": "Corolla",
      "license_plate": "ABC-123"
    },
    "invoice_items": [
      {
        "id": "uuid",
        "item_type": "service",
        "description": "Cambio de aceite",
        "quantity": 1,
        "unit_price": 500.00,
        "tax_percent": 16,
        "tax_amount": 80.00,
        "total": 580.00,
        "services": {
          "name": "Cambio de aceite"
        }
      }
    ]
  },
  "error": null
}
```

**Status Codes:**
- `200` - OK
- `404` - Factura no encontrada

---

### **4️⃣ PUT /api/invoices/[id]**
Actualiza una factura (no permite editar facturas pagadas o canceladas).

**URL:** `PUT /api/invoices/[id]`

**Body:**
```json
{
  "description": "Nueva descripción",
  "due_date": "2025-01-31",
  "notes": "Notas actualizadas"
}
```

**Validaciones:**
- ❌ No editar si `status = 'paid'`
- ❌ No editar si `status = 'cancelled'`
- ✅ `due_date` debe ser futura (si está en draft)

**Status Codes:**
- `200` - Actualizada
- `403` - No se puede editar (pagada/cancelada)
- `400` - Datos inválidos
- `500` - Error del servidor

---

### **5️⃣ DELETE /api/invoices/[id]**
Cancela una factura (soft delete - cambia status a 'cancelled').

**URL:** `DELETE /api/invoices/[id]`

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

**Status Codes:**
- `200` - Cancelada
- `404` - Factura no encontrada

---

### **6️⃣ GET /api/invoices/[id]/items**
Lista todos los items de una factura.

**URL:** `GET /api/invoices/[id]/items`

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
        "discount_percent": 0,
        "discount_amount": 0.00,
        "tax_percent": 16,
        "tax_amount": 80.00,
        "total": 580.00,
        "services": {
          "name": "Cambio de aceite"
        }
      }
    ],
    "count": 1
  },
  "error": null
}
```

---

### **7️⃣ POST /api/invoices/[id]/items**
Agrega un item a la factura. Recalcula totales automáticamente.

**URL:** `POST /api/invoices/[id]/items`

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

**Status Codes:**
- `201` - Item agregado
- `400` - Datos inválidos
- `403` - No se pueden agregar items (pagada/cancelada)
- `404` - Factura no encontrada

---

### **8️⃣ PUT /api/invoices/[id]/items/[itemId]**
Actualiza un item. Recalcula totales automáticamente.

**URL:** `PUT /api/invoices/[id]/items/[itemId]`

**Body:**
```json
{
  "description": "Cambio de aceite sintético",
  "quantity": 2,
  "unit_price": 600.00,
  "discount_percent": 5,
  "tax_percent": 16
}
```

**Status Codes:**
- `200` - Item actualizado
- `403` - No se pueden editar items (pagada/cancelada)
- `404` - Item no encontrado

---

### **9️⃣ DELETE /api/invoices/[id]/items/[itemId]**
Elimina un item. Recalcula totales automáticamente.

**URL:** `DELETE /api/invoices/[id]/items/[itemId]`

**Response:**
```json
{
  "data": {
    "success": true
  },
  "error": null
}
```

**Status Codes:**
- `200` - Item eliminado
- `403` - No se pueden eliminar items (pagada/cancelada)
- `404` - Item no encontrado

---

### **🔟 POST /api/invoices/[id]/pay** ⭐
Marca una factura como pagada con detalles de pago.

**URL:** `POST /api/invoices/[id]/pay`

**Body:**
```json
{
  "payment_method": "transfer",        // ✅ Requerido: cash, transfer, card, check
  "paid_date": "2024-11-15",          // ❌ Opcional (default: hoy)
  "reference": "TRX-12345",           // ❌ Opcional (ref de transacción)
  "notes": "Pago confirmado por banco" // ❌ Opcional
}
```

**Response:**
```json
{
  "data": {
    "invoice": {
      "id": "uuid",
      "invoice_number": "INV-2024-0001",
      "status": "paid",
      "payment_method": "transfer",
      "paid_date": "2024-11-15",
      "payment_reference": "TRX-12345",
      "payment_notes": "Pago confirmado por banco",
      "total": 1160.00
    },
    "message": "Factura INV-2024-0001 marcada como pagada exitosamente",
    "payment_details": {
      "method": "transfer",
      "date": "2024-11-15",
      "reference": "TRX-12345",
      "notes": "Pago confirmado por banco"
    }
  },
  "error": null
}
```

**Status Codes:**
- `200` - Marcada como pagada
- `400` - payment_method inválido
- `404` - Factura no encontrada
- `409` - Ya está pagada o cancelada

---

### **1️⃣1️⃣ POST /api/invoices/from-order** ⭐
Crea una factura desde una orden de trabajo completada.

**URL:** `POST /api/invoices/from-order`

**Body:**
```json
{
  "work_order_id": "uuid"  // ✅ Requerido
}
```

**Proceso:**
1. Obtiene `work_order` con items
2. Verifica `status = 'completed'`
3. Verifica que no tenga factura ya
4. Genera `invoice_number` único (INV-2024-0001)
5. Crea factura con datos de la orden
6. Copia `order_items` → `invoice_items`
7. Calcula `due_date` (30 días desde hoy)
8. Retorna factura creada

**Response:**
```json
{
  "data": {
    "invoice": {
      "id": "uuid",
      "invoice_number": "INV-2024-0001",
      "status": "draft",
      "work_order_id": "uuid",
      "customer_id": "uuid",
      "vehicle_id": "uuid",
      "due_date": "2024-12-20",
      "total": 1160.00
    },
    "message": "Factura INV-2024-0001 creada desde orden de trabajo",
    "work_order_id": "uuid"
  },
  "error": null
}
```

**Validaciones:**
- ✅ Orden debe existir
- ✅ Orden debe estar completada (`status = 'completed'`)
- ✅ Orden no debe tener factura asociada ya
- ✅ Rollback automático si falla

**Status Codes:**
- `201` - Factura creada
- `404` - Orden no encontrada
- `409` - Orden no completada o ya tiene factura

---

### **1️⃣2️⃣ GET /api/invoices/overdue** ⭐
Obtiene facturas vencidas. Actualiza automáticamente estados antes de listar.

**URL:** `GET /api/invoices/overdue`

**Query Params:**
```typescript
organization_id?: string  // ID de organización
```

**Response:**
```json
{
  "data": {
    "invoices": [
      {
        "id": "uuid",
        "invoice_number": "INV-2024-0001",
        "status": "overdue",
        "customer_id": "uuid",
        "due_date": "2024-01-15",
        "total": 1160.00,
        "customers": {
          "name": "Juan Pérez",
          "email": "juan@example.com"
        }
      }
    ],
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

**Lógica:**
- Busca facturas con `status = 'sent'` y `due_date < today`
- Las actualiza automáticamente a `status = 'overdue'`
- Retorna todas las facturas vencidas ordenadas por fecha

---

### **1️⃣3️⃣ GET /api/invoices/unpaid** ⭐
Obtiene resumen de facturas sin pagar y vencidas.

**URL:** `GET /api/invoices/unpaid`

**Query Params:**
```typescript
organization_id?: string  // ID de organización
```

**Response:**
```json
{
  "data": {
    "total_unpaid": 15000.00,      // Total sin pagar (sent + overdue)
    "total_overdue": 5800.00,      // Solo vencidas
    "count_unpaid": 12,            // Cantidad sin pagar
    "count_overdue": 5,            // Cantidad vencida
    "summary": {
      "message": "Tienes 12 facturas sin pagar por un total de $15000.00",
      "overdue_message": "5 facturas están vencidas por un total de $5800.00"
    }
  },
  "error": null
}
```

**Útil para:**
- Dashboard de finanzas
- Cuentas por cobrar
- Seguimiento de cobranza
- Reportes financieros

---

## 🔄 **FLUJO COMPLETO DE FACTURACIÓN**

```
1. Cliente trae vehículo
   ↓
2. Crear orden de trabajo
   POST /api/orders
   ↓
3. Completar servicio
   PUT /api/orders/[id] { status: 'completed' }
   ↓
4. Generar factura automáticamente
   POST /api/invoices/from-order
   → Crea: INV-2024-0001
   → Copia todos los items
   → Due date: +30 días
   ↓
5. Enviar al cliente
   PUT /api/invoices/[id] { status: 'sent' }
   ↓
6. Cliente paga
   POST /api/invoices/[id]/pay
   → Status: 'paid'
   → payment_method: 'transfer'
   → reference: 'TRX-12345'
   ↓
7. Conciliar pago
   GET /api/invoices/[id]
   → Verificar payment_reference
```

---

## 📊 **ESTADOS DE FACTURA**

```
draft ──────────────┐
  │                 │
  ↓ send            │ edit
sent ←──────────────┘
  │
  ├──→ overdue (automático al vencer)
  │
  └──→ paid (al pagar)

cancelled (desde cualquier estado)
```

---

## 🧮 **CÁLCULO AUTOMÁTICO DE TOTALES**

Cada vez que se agrega, actualiza o elimina un item:

```typescript
Por cada item:
1. subtotal = quantity × unit_price
2. discount_amount = subtotal × (discount_percent / 100)
3. subtotal_after_discount = subtotal - discount_amount
4. tax_amount = subtotal_after_discount × (tax_percent / 100)
5. item_total = subtotal_after_discount + tax_amount

Totales de factura:
- invoice.subtotal = Σ items.subtotal
- invoice.tax_amount = Σ items.tax_amount
- invoice.discount_amount = Σ items.discount_amount
- invoice.total = Σ items.total
```

---

## ✅ **CHECKLIST DE PRUEBAS**

### **CRUD Básico:**
- [ ] `GET /api/invoices` - Listar todas
- [ ] `GET /api/invoices?status=sent` - Filtrar por estado
- [ ] `POST /api/invoices` - Crear nueva
- [ ] `GET /api/invoices/[id]` - Ver una
- [ ] `PUT /api/invoices/[id]` - Actualizar
- [ ] `DELETE /api/invoices/[id]` - Cancelar

### **Items:**
- [ ] `POST /api/invoices/[id]/items` - Agregar item
- [ ] `GET /api/invoices/[id]/items` - Listar items
- [ ] `PUT /api/invoices/[id]/items/[itemId]` - Actualizar item
- [ ] `DELETE /api/invoices/[id]/items/[itemId]` - Eliminar item
- [ ] Verificar que totales se recalculan automáticamente

### **Acciones Especiales:**
- [ ] `POST /api/invoices/from-order` - Crear desde orden
- [ ] `POST /api/invoices/[id]/pay` - Marcar como pagada
- [ ] `GET /api/invoices/overdue` - Ver vencidas
- [ ] `GET /api/invoices/unpaid` - Ver resumen

### **Validaciones:**
- [ ] No editar facturas pagadas
- [ ] No agregar items a facturas pagadas
- [ ] due_date debe ser futura
- [ ] payment_method debe ser válido
- [ ] Solo facturar órdenes completadas
- [ ] No facturar orden dos veces

---

## 🎯 **RESUMEN**

```
╔════════════════════════════════════════╗
║  MÓDULO DE FACTURAS                    ║
╠════════════════════════════════════════╣
║  📊 13 Endpoints REST                  ║
║  🔢 Numeración automática              ║
║  🧮 Cálculo automático de totales      ║
║  🔄 Creación desde órdenes             ║
║  ⏰ Detección de vencimientos          ║
║  💳 Registro detallado de pagos        ║
║  💰 Resumen de cuentas por cobrar      ║
║  ✅ Validaciones exhaustivas           ║
║  🚀 Producción Ready                   ║
╚════════════════════════════════════════╝
```

---

**💰 MÓDULO DE FACTURAS - API COMPLETA**
**📊 13 Endpoints Documentados**
**✅ Listo para Integración**
**🚀 PRODUCCIÓN READY**


