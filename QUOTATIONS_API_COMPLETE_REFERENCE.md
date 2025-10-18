# 📚 API de Cotizaciones - Referencia Completa

## 🎯 **RESUMEN**

Sistema completo de gestión de cotizaciones con 15 endpoints para CRUD, gestión de items, workflow de aprobación, conversión a órdenes y métricas.

---

## 📊 **ENDPOINTS IMPLEMENTADOS (15 TOTAL)**

### **✅ COTIZACIONES - CRUD**
1. `GET    /api/quotations` - Listar cotizaciones
2. `POST   /api/quotations` - Crear cotización
3. `GET    /api/quotations/[id]` - Obtener cotización
4. `PUT    /api/quotations/[id]` - Actualizar cotización
5. `DELETE /api/quotations/[id]` - Cancelar cotización

### **✅ ITEMS - CRUD**
6. `GET    /api/quotations/[id]/items` - Listar items
7. `POST   /api/quotations/[id]/items` - Agregar item
8. `PUT    /api/quotations/[id]/items/[itemId]` - Actualizar item
9. `DELETE /api/quotations/[id]/items/[itemId]` - Eliminar item

### **✅ ACCIONES DE WORKFLOW**
10. `POST   /api/quotations/[id]/send` - Enviar al cliente
11. `POST   /api/quotations/[id]/approve` - Aprobar cotización
12. `POST   /api/quotations/[id]/reject` - Rechazar cotización
13. `POST   /api/quotations/[id]/convert` - Convertir a orden
14. `POST   /api/quotations/[id]/duplicate` - Duplicar cotización

### **✅ MÉTRICAS Y REPORTES**
15. `GET    /api/quotations/metrics` - Obtener métricas

---

## 🔄 **FLUJO COMPLETO DE ESTADOS**

```
   ┌─────────┐
   │  draft  │ ← Inicio
   └────┬────┘
        │ POST /api/quotations/[id]/send
        ↓
   ┌─────────┐
   │  sent   │ ← Enviada al cliente
   └────┬────┘
        │
    ┌───┴───┐
    │       │
    ↓       ↓
┌──────┐ ┌─────────┐
│approve│ │ reject  │
└───┬──┘ └─────────┘
    │
    ↓ POST /api/quotations/[id]/convert
┌──────────┐
│converted │ ← Orden de trabajo creada
└──────────┘
```

### **Estados Disponibles:**
- `draft` - Borrador (editable)
- `sent` - Enviada al cliente (esperando respuesta)
- `approved` - Aprobada por cliente (puede convertirse)
- `rejected` - Rechazada por cliente (puede modificarse)
- `converted` - Convertida a orden (final)
- `cancelled` - Cancelada (final)

---

## 📋 **REFERENCIA RÁPIDA DE ENDPOINTS**

### **1. GET /api/quotations**
Lista cotizaciones con filtros.

**Query Params:**
- `status` - Filtrar por estado
- `customer_id` - Filtrar por cliente
- `from_date` - Desde fecha
- `to_date` - Hasta fecha

**Ejemplo:**
```bash
GET /api/quotations?status=sent&customer_id=uuid-123
```

---

### **2. POST /api/quotations**
Crea una nueva cotización.

**Body:**
```json
{
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "description": "Mantenimiento general",
  "notes": "Cliente VIP",
  "valid_until": "2024-12-31"
}
```

**Response:**
- Genera número automático: `Q-2024-0001`
- Estado inicial: `draft`
- Version: `1`

---

### **3. GET /api/quotations/[id]**
Obtiene cotización completa con items, customer, vehicle y totales.

**Response incluye:**
- Cotización completa
- Customer (name, email, phone, address)
- Vehicle (brand, model, year, license_plate)
- Quotation items con productos/servicios
- Totales calculados

---

### **4. PUT /api/quotations/[id]**
Actualiza cotización con versionado automático.

**Body:**
```json
{
  "description": "Nueva descripción",
  "notes": "Notas actualizadas",
  "status": "sent"
}
```

**Características:**
- ✅ Guarda versión antes de actualizar
- ✅ Incrementa número de versión
- ✅ Registra en tracking
- ✅ Recalcula totales si cambian

---

### **5. DELETE /api/quotations/[id]**
Cancela cotización (soft delete).

**Proceso:**
- Guarda versión actual
- Cambia status a `cancelled`
- Registra `cancelled_at`
- Tracking de cancelación

---

### **6. GET /api/quotations/[id]/items**
Lista items con detalles de productos/servicios.

**Response:**
```json
{
  "data": {
    "quotation_id": "uuid",
    "quotation_number": "Q-2024-0001",
    "items": [ ... ],
    "items_count": 3,
    "totals": {
      "subtotal": 1000.00,
      "tax_amount": 160.00,
      "discount_amount": 50.00,
      "total_amount": 1110.00
    }
  }
}
```

---

### **7. POST /api/quotations/[id]/items**
Agrega item con validaciones exhaustivas.

**Body:**
```json
{
  "item_type": "product",
  "product_id": "uuid",
  "description": "Filtro de aceite",
  "quantity": 2,
  "unit_price": 150.00,
  "discount_percent": 10,
  "tax_percent": 16,
  "notes": "Premium"
}
```

**Validaciones:**
- ✅ Datos requeridos
- ✅ Tipo de item válido
- ✅ Valores numéricos positivos
- ✅ Cotización existe y no está convertida
- ✅ **Product_id existe en DB**
- ✅ **Service_id existe en DB**
- ✅ Stock disponible (warning)

**Proceso automático:**
- Agrega item
- Recalcula totales
- Actualiza quotation.updated_at

---

### **8. PUT /api/quotations/[id]/items/[itemId]**
Actualiza item y recalcula totales.

**Body:**
```json
{
  "quantity": 3,
  "unit_price": 200.00,
  "discount_percent": 15
}
```

---

### **9. DELETE /api/quotations/[id]/items/[itemId]**
Elimina item y recalcula totales.

**Response:**
- Item eliminado
- Totales actualizados
- quotation.updated_at actualizado

---

### **10. POST /api/quotations/[id]/send** ⭐
Envía cotización al cliente.

**Body (opcional):**
```json
{
  "send_via_email": true,
  "email_message": "Estimado cliente...",
  "recipient_email": "cliente@example.com"
}
```

**Validaciones:**
- ✅ Cotización no está aprobada/convertida/cancelada
- ✅ Tiene al menos 1 item
- ✅ Tiene cliente asignado
- ✅ Cliente tiene email (si send_via_email=true)

**Proceso:**
- Guarda versión (si es primera vez)
- Cambia status a `sent`
- Registra `sent_at`
- Tracking de envío
- Envía email (si está configurado)

**Response:**
```json
{
  "data": {
    "quotation": { ... },
    "email_sent": false,
    "message": "Cotización Q-2024-0001 marcada como enviada",
    "next_steps": [
      "El cliente puede revisar la cotización",
      "Espera su aprobación usando POST /api/quotations/{id}/approve"
    ]
  }
}
```

---

### **11. POST /api/quotations/[id]/approve** ✅
Aprueba cotización (solo si status=sent).

**Validaciones:**
- ✅ Status = `sent`
- ✅ No está ya aprobada
- ✅ No está convertida/cancelada
- ✅ Tiene items
- ✅ Tiene cliente

**Proceso:**
- Guarda versión
- Cambia status a `approved`
- Registra `approved_at`
- Tracking de aprobación
- Prepara para conversión

**Next Steps:**
- Puede convertirse a orden con POST /api/quotations/[id]/convert

---

### **12. POST /api/quotations/[id]/reject** ❌
Rechaza cotización con motivo opcional.

**Body:**
```json
{
  "reason": "Precio muy alto para el presupuesto"
}
```

**Validaciones:**
- ✅ No está ya rechazada
- ✅ No está convertida/cancelada

**Proceso:**
- Guarda versión
- Cambia status to `rejected`
- Registra `rejected_at`
- Guarda `rejection_reason`
- Tracking de rechazo

**Next Steps:**
- Puede modificarse y reenviarse

---

### **13. POST /api/quotations/[id]/convert** 🔄
Convierte cotización aprobada a orden de trabajo.

**Validaciones:**
- ✅ Status = `approved` (CRÍTICO)
- ✅ No está ya convertida
- ✅ Tiene customer y vehicle
- ✅ Tiene al menos 1 item

**Proceso:**
1. Obtener cotización con items
2. Validar requisitos (6 validaciones)
3. Generar número de orden (WO-2024-0001)
4. Crear work_order
5. Copiar quotation_items → order_items
6. Cambiar quotation.status a `converted`
7. Registrar `converted_at`
8. Tracking de conversión

**Response:**
```json
{
  "data": {
    "quotation_id": "uuid",
    "quotation_number": "Q-2024-0001",
    "work_order_id": "uuid",
    "work_order_number": "WO-2024-0001",
    "work_order": {
      "id": "uuid",
      "order_number": "WO-2024-0001",
      "status": "pending",
      "customer": { ... },
      "vehicle": { ... },
      "total_amount": 1110.00,
      "items_count": 3
    },
    "message": "Cotización Q-2024-0001 convertida exitosamente a orden WO-2024-0001"
  }
}
```

---

### **14. POST /api/quotations/[id]/duplicate**
Duplica cotización con nuevo número.

**Response:**
- Nueva cotización con número único
- Copia de todos los items
- Status: `draft`
- Version: `1`

---

### **15. GET /api/quotations/metrics**
Obtiene métricas generales.

**Response:**
```json
{
  "data": {
    "total_quotations": 150,
    "by_status": {
      "draft": 20,
      "sent": 30,
      "approved": 40,
      "rejected": 10,
      "converted": 45,
      "cancelled": 5
    },
    "approval_rate": 80.00,
    "conversion_rate": 90.00,
    "total_value": 250000.00,
    "avg_quotation_value": 1666.67
  }
}
```

---

## 🔐 **COLUMNAS DE LA TABLA `quotations`**

```sql
CREATE TABLE quotations (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    quotation_number VARCHAR UNIQUE,
    customer_id UUID,
    vehicle_id UUID,
    status VARCHAR,
    description TEXT,
    notes TEXT,
    valid_until DATE,
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    version INTEGER DEFAULT 1,
    
    -- Timestamps de workflow
    sent_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    
    -- Adicionales
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 **TRACKING Y AUDITORÍA**

Todas las acciones importantes se registran en `quotation_tracking`:

| Acción | Detalles Registrados |
|--------|---------------------|
| `created` | customer_id, vehicle_id, total_amount |
| `updated` | changes, new_values |
| `sent` | send_via_email, recipient_email, vehicle_info |
| `approved` | previous_status, items_count, customer_name |
| `rejected` | rejection_reason, previous_status |
| `converted` | work_order_id, work_order_number, items_count |
| `cancelled` | previous_status, reason |
| `item_added` | item_id, item_type, quantity, unit_price |
| `item_updated` | item_id, changes |
| `item_deleted` | item_id, item_description |

---

## 💡 **EJEMPLO DE FLUJO COMPLETO**

```javascript
// 1. CREAR COTIZACIÓN
const create = await fetch('/api/quotations', {
  method: 'POST',
  body: JSON.stringify({
    customer_id: 'customer-123',
    vehicle_id: 'vehicle-456',
    description: 'Mantenimiento preventivo'
  })
})
const { data: quotation } = await create.json()
console.log('1. Creada:', quotation.quotation_number) // Q-2024-0001

// 2. AGREGAR ITEMS
await fetch(`/api/quotations/${quotation.id}/items`, {
  method: 'POST',
  body: JSON.stringify({
    item_type: 'service',
    service_id: 'service-789',
    description: 'Cambio de aceite',
    quantity: 1,
    unit_price: 500.00,
    tax_percent: 16
  })
})
console.log('2. Items agregados')

await fetch(`/api/quotations/${quotation.id}/items`, {
  method: 'POST',
  body: JSON.stringify({
    item_type: 'product',
    product_id: 'product-111',
    description: 'Filtro de aceite',
    quantity: 2,
    unit_price: 150.00,
    tax_percent: 16
  })
})

// 3. ENVIAR AL CLIENTE
const send = await fetch(`/api/quotations/${quotation.id}/send`, {
  method: 'POST',
  body: JSON.stringify({
    send_via_email: true,
    email_message: 'Estimado cliente, adjunto cotización...'
  })
})
console.log('3. Enviada al cliente')

// 4. CLIENTE APRUEBA
const approve = await fetch(`/api/quotations/${quotation.id}/approve`, {
  method: 'POST'
})
const { data: approved } = await approve.json()
console.log('4. Aprobada:', approved.quotation.approved_at)

// 5. CONVERTIR A ORDEN
const convert = await fetch(`/api/quotations/${quotation.id}/convert`, {
  method: 'POST'
})
const { data: order } = await convert.json()
console.log('5. Orden creada:', order.work_order_number) // WO-2024-0001

// 6. VER MÉTRICAS
const metrics = await fetch('/api/quotations/metrics')
const { data: stats } = await metrics.json()
console.log('6. Métricas:', stats.approval_rate + '% aprobación')
```

---

## 📈 **MÉTRICAS SQL ÚTILES**

### **Tasa de Aprobación:**
```sql
SELECT 
    COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0) as approval_rate
FROM quotations;
```

### **Tiempo Promedio de Aprobación:**
```sql
SELECT 
    AVG(EXTRACT(EPOCH FROM (approved_at - sent_at)) / 3600) as avg_hours
FROM quotations
WHERE approved_at IS NOT NULL;
```

### **Cotizaciones Pendientes:**
```sql
SELECT * FROM get_pending_approval_quotations(
    'org-uuid'::UUID,
    7  -- días sin respuesta
);
```

### **Razones de Rechazo:**
```sql
SELECT * FROM get_top_rejection_reasons(
    'org-uuid'::UUID,
    10
);
```

---

## 🚀 **CARACTERÍSTICAS IMPLEMENTADAS**

### **Sistema de Numeración:**
- ✅ Formato: `Q-YEAR-SEQUENCE`
- ✅ Único por organización
- ✅ Reseteo anual automático
- ✅ Generación atómica

### **Versionado:**
- ✅ Snapshot antes de cada cambio
- ✅ Versión incremental
- ✅ Historial completo
- ✅ Posibilidad de restaurar

### **Tracking:**
- ✅ Todas las acciones registradas
- ✅ Detalles específicos por acción
- ✅ Timestamps precisos
- ✅ Auditoría completa

### **Validaciones:**
- ✅ Datos requeridos
- ✅ Estados válidos
- ✅ Transiciones permitidas
- ✅ Existencia de relaciones
- ✅ Stock disponible
- ✅ Emails válidos

### **Totales:**
- ✅ Recálculo automático
- ✅ Descuentos por % o monto
- ✅ Impuestos configurables
- ✅ Subtotales por item

### **Rollback:**
- ✅ Transaccionalidad
- ✅ Rollback automático en errores
- ✅ Integridad de datos
- ✅ No deja datos huérfanos

---

## 📚 **DOCUMENTACIÓN RELACIONADA**

1. **QUOTATIONS_API_DOCUMENTATION.md** - Documentación original
2. **QUOTATIONS_ITEMS_API_DOCUMENTATION.md** - Items con validaciones
3. **QUOTATIONS_VERSIONING_TRACKING.md** - Versionado y tracking
4. **QUOTATIONS_APPROVAL_REJECTION_API.md** - Aprobación y rechazo
5. **QUOTATION_TO_WORK_ORDER_CONVERSION.md** - Conversión a órdenes
6. **NUMBER_GENERATION_SYSTEM.md** - Sistema de numeración

---

## 🗂️ **ARCHIVOS DEL PROYECTO**

### **Queries:**
- `src/lib/database/queries/quotations.ts`
- `src/lib/database/queries/quotation-items.ts`

### **API Routes:**
- `src/app/api/quotations/route.ts`
- `src/app/api/quotations/[id]/route.ts`
- `src/app/api/quotations/[id]/items/route.ts`
- `src/app/api/quotations/[id]/items/[itemId]/route.ts`
- `src/app/api/quotations/[id]/send/route.ts`
- `src/app/api/quotations/[id]/approve/route.ts`
- `src/app/api/quotations/[id]/reject/route.ts`
- `src/app/api/quotations/[id]/convert/route.ts`
- `src/app/api/quotations/[id]/duplicate/route.ts`
- `src/app/api/quotations/metrics/route.ts`

### **SQL Scripts:**
- `create_quotation_tracking_tables.sql`
- `add_quotation_status_columns.sql`
- `ensure_services_table.sql`

---

**✅ SISTEMA COMPLETO DE COTIZACIONES IMPLEMENTADO**
**📊 15 Endpoints Funcionando**
**🔐 Validaciones Exhaustivas**
**📈 Métricas y Reportes**
**🔄 Workflow Completo**
**📝 Tracking y Auditoría**
**🎯 Listo para Producción**


