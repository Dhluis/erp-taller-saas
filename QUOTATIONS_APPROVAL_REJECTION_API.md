# ✅❌ API de Aprobación y Rechazo de Cotizaciones

## 🎯 **RESUMEN**

Endpoints para aprobar y rechazar cotizaciones con validaciones robustas, versionado automático, tracking completo y preparación para conversión a orden de trabajo.

---

## 🔗 **ENDPOINTS IMPLEMENTADOS**

### **1. POST /api/quotations/[id]/approve**
### **2. POST /api/quotations/[id]/reject**

---

## ✅ **APROBAR COTIZACIÓN**

### **POST /api/quotations/[id]/approve**

Aprueba una cotización y la prepara para conversión a orden de trabajo.

#### **Request:**
```http
POST /api/quotations/123e4567-e89b-12d3-a456-426614174000/approve
Content-Type: application/json
```

*No requiere body*

#### **Validaciones Implementadas:**

1. ✅ **Cotización existe**
   - Error 404: "Cotización no encontrada"

2. ✅ **No está ya aprobada**
   - Error 400: "La cotización ya está aprobada"

3. ✅ **No está convertida**
   - Error 400: "No se puede aprobar una cotización que ya fue convertida a orden"

4. ✅ **No está cancelada**
   - Error 400: "No se puede aprobar una cotización cancelada"

5. ✅ **Tiene items**
   - Error 400: "No se puede aprobar una cotización sin items"

6. ✅ **Tiene cliente**
   - Error 400: "No se puede aprobar una cotización sin cliente asignado"

#### **Proceso Automático:**

```typescript
1. Obtener cotización actual
2. Validar requisitos (6 validaciones)
3. Guardar versión antes de aprobar
4. Cambiar status a 'approved'
5. Registrar approved_at
6. Incrementar version
7. Registrar en tracking
8. Notificar (si está configurado)
9. Retornar cotización aprobada
```

#### **Response Exitosa (200):**
```json
{
  "data": {
    "quotation": {
      "id": "quote-uuid",
      "quotation_number": "Q-2024-0001",
      "status": "approved",
      "approved_at": "2024-01-20T15:30:00Z",
      "customer": {
        "id": "customer-uuid",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "555-1234",
        "address": "Calle Principal 123"
      },
      "vehicle": {
        "id": "vehicle-uuid",
        "brand": "Toyota",
        "model": "Corolla",
        "year": 2020,
        "license_plate": "ABC-123",
        "vin": "1234567890ABCDEFG"
      },
      "subtotal": 1000.00,
      "tax_amount": 160.00,
      "discount_amount": 50.00,
      "total_amount": 1110.00,
      "items_count": 3,
      "version": 2
    },
    "message": "Cotización Q-2024-0001 aprobada exitosamente",
    "next_steps": [
      "Puedes convertir esta cotización a orden de trabajo",
      "Usa POST /api/quotations/{id}/convert para crear la orden"
    ]
  },
  "error": null
}
```

#### **Tracking Registrado:**
```typescript
{
  quotation_id: "quote-uuid",
  action: "approved",
  details: {
    previous_status: "sent",
    approved_at: "2024-01-20T15:30:00Z",
    total_amount: 1110.00,
    items_count: 3,
    customer_name: "Juan Pérez",
    vehicle_info: "Toyota Corolla 2020"
  },
  created_at: "2024-01-20T15:30:00Z"
}
```

---

## ❌ **RECHAZAR COTIZACIÓN**

### **POST /api/quotations/[id]/reject**

Rechaza una cotización con motivo opcional.

#### **Request:**
```http
POST /api/quotations/123e4567-e89b-12d3-a456-426614174000/reject
Content-Type: application/json

{
  "reason": "Precio muy alto para el presupuesto disponible"
}
```

#### **Request Body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `reason` | string | ❌ No | Motivo del rechazo |

#### **Validaciones Implementadas:**

1. ✅ **Cotización existe**
   - Error 404: "Cotización no encontrada"

2. ✅ **No está ya rechazada**
   - Error 400: "La cotización ya está rechazada"

3. ✅ **No está convertida**
   - Error 400: "No se puede rechazar una cotización que ya fue convertida a orden"

4. ✅ **No está cancelada**
   - Error 400: "No se puede rechazar una cotización que ya está cancelada"

#### **Proceso Automático:**

```typescript
1. Obtener cotización actual
2. Validar requisitos (4 validaciones)
3. Guardar versión antes de rechazar
4. Cambiar status a 'rejected'
5. Registrar rejected_at
6. Guardar rejection_reason
7. Incrementar version
8. Registrar en tracking
9. Notificar (si está configurado)
10. Retornar cotización rechazada
```

#### **Response Exitosa (200):**
```json
{
  "data": {
    "quotation": {
      "id": "quote-uuid",
      "quotation_number": "Q-2024-0002",
      "status": "rejected",
      "rejected_at": "2024-01-20T16:00:00Z",
      "rejection_reason": "Precio muy alto para el presupuesto disponible",
      "customer": {
        "id": "customer-uuid",
        "name": "María González",
        "email": "maria@example.com",
        "phone": "555-5678"
      },
      "vehicle": {
        "id": "vehicle-uuid",
        "brand": "Honda",
        "model": "Civic",
        "year": 2019,
        "license_plate": "XYZ-789"
      },
      "total_amount": 2500.00,
      "version": 2
    },
    "message": "Cotización Q-2024-0002 rechazada",
    "next_steps": [
      "Puedes modificar la cotización y volver a enviarla",
      "O crear una nueva cotización basada en esta"
    ]
  },
  "error": null
}
```

#### **Tracking Registrado:**
```typescript
{
  quotation_id: "quote-uuid",
  action: "rejected",
  details: {
    previous_status: "sent",
    rejected_at: "2024-01-20T16:00:00Z",
    rejection_reason: "Precio muy alto para el presupuesto disponible",
    total_amount: 2500.00,
    customer_name: "María González"
  },
  created_at: "2024-01-20T16:00:00Z"
}
```

---

## 🔄 **FLUJO DE ESTADOS**

### **Diagrama de Estados:**

```
       draft
         ↓
       sent ←────────────┐
       ↙  ↘              │
  approved  rejected     │
     ↓         ↓         │
  converted  (revisar)──┘
     ↓
  (final)
```

### **Transiciones Permitidas:**

| Estado Actual | Puede ir a | Endpoint |
|---------------|------------|----------|
| `draft` | `sent` | PUT /api/quotations/[id] |
| `sent` | `approved` | POST /api/quotations/[id]/approve |
| `sent` | `rejected` | POST /api/quotations/[id]/reject |
| `sent` | `cancelled` | DELETE /api/quotations/[id] |
| `approved` | `converted` | POST /api/quotations/[id]/convert |
| `approved` | `cancelled` | DELETE /api/quotations/[id] |
| `rejected` | `draft` | PUT /api/quotations/[id] (modificar) |

### **Estados Finales:**

- ✅ `converted` - No se puede cambiar (ya es orden)
- ✅ `cancelled` - No se puede cambiar (cancelada permanente)

---

## 💡 **EJEMPLOS DE USO**

### **Ejemplo 1: Aprobar Cotización**

```javascript
// Aprobar cotización
const response = await fetch('/api/quotations/quote-123/approve', {
  method: 'POST'
})

const { data, error } = await response.json()

if (data) {
  console.log('Cotización aprobada:', data.quotation.quotation_number)
  console.log('Aprobada el:', data.quotation.approved_at)
  console.log('Próximos pasos:', data.next_steps)
  
  // Mostrar botón para convertir
  showConvertButton(data.quotation.id)
}
```

### **Ejemplo 2: Rechazar Cotización con Razón**

```javascript
// Rechazar con motivo
const response = await fetch('/api/quotations/quote-456/reject', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Cliente encontró mejor precio en otro taller'
  })
})

const { data, error } = await response.json()

if (data) {
  console.log('Cotización rechazada:', data.quotation.quotation_number)
  console.log('Razón:', data.quotation.rejection_reason)
  console.log('Rechazada el:', data.quotation.rejected_at)
  
  // Mostrar opciones de seguimiento
  showFollowUpOptions(data.quotation.id)
}
```

### **Ejemplo 3: Flujo Completo (Crear → Enviar → Aprobar → Convertir)**

```javascript
async function completeQuotationFlow() {
  // 1. Crear cotización
  const createRes = await fetch('/api/quotations', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: 'customer-123',
      vehicle_id: 'vehicle-456',
      description: 'Mantenimiento preventivo'
    })
  })
  const { data: quotation } = await createRes.json()
  console.log('1. Cotización creada:', quotation.quotation_number)
  
  // 2. Agregar items
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
  
  // 3. Enviar al cliente
  await fetch(`/api/quotations/${quotation.id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'sent' })
  })
  console.log('3. Cotización enviada al cliente')
  
  // 4. Cliente aprueba
  const approveRes = await fetch(`/api/quotations/${quotation.id}/approve`, {
    method: 'POST'
  })
  const { data: approved } = await approveRes.json()
  console.log('4. Cotización aprobada:', approved.quotation.approved_at)
  
  // 5. Convertir a orden
  const convertRes = await fetch(`/api/quotations/${quotation.id}/convert`, {
    method: 'POST'
  })
  const { data: conversion } = await convertRes.json()
  console.log('5. Orden creada:', conversion.work_order_number)
  
  return conversion
}
```

### **Ejemplo 4: Manejo de Errores**

```javascript
async function approveQuotation(quotationId) {
  const response = await fetch(`/api/quotations/${quotationId}/approve`, {
    method: 'POST'
  })
  
  const { data, error } = await response.json()
  
  if (error) {
    if (error.includes('sin items')) {
      alert('Debes agregar al menos un item antes de aprobar')
      window.location.href = `/cotizaciones/${quotationId}/items`
    } else if (error.includes('sin cliente')) {
      alert('Debes asignar un cliente antes de aprobar')
      window.location.href = `/cotizaciones/${quotationId}/edit`
    } else if (error.includes('ya está aprobada')) {
      alert('Esta cotización ya fue aprobada')
      window.location.href = `/cotizaciones/${quotationId}`
    } else if (error.includes('convertida')) {
      alert('Esta cotización ya fue convertida a orden')
      window.location.href = `/ordenes/${data.work_order_id}`
    } else {
      alert(`Error: ${error}`)
    }
    return null
  }
  
  return data
}
```

---

## 📊 **MÉTRICAS Y REPORTES**

### **Tasa de Aprobación:**

```sql
-- Porcentaje de cotizaciones aprobadas vs rechazadas
SELECT 
    organization_id,
    approved_count,
    rejected_count,
    total_count,
    approval_rate
FROM quotation_approval_metrics;

-- Resultado ejemplo:
-- org_id | approved | rejected | total | approval_rate
-- uuid   | 45       | 5        | 50    | 90.00%
```

### **Tiempo Promedio de Aprobación:**

```sql
-- Horas desde creación hasta aprobación
SELECT 
    organization_id,
    ROUND(avg_hours_to_approval, 2) as avg_hours
FROM quotation_approval_metrics;

-- Resultado ejemplo:
-- org_id | avg_hours
-- uuid   | 24.5
```

### **Razones de Rechazo Más Comunes:**

```sql
-- Top 10 razones de rechazo
SELECT * FROM get_top_rejection_reasons(
    '00000000-0000-0000-0000-000000000000'::UUID, 
    10
);

-- Resultado ejemplo:
-- rejection_reason                    | count | percentage
-- Precio muy alto                     | 15    | 45.45%
-- Tiempo de entrega muy largo         | 8     | 24.24%
-- Cliente encontró otra opción        | 5     | 15.15%
-- Necesita más información            | 3     | 9.09%
-- Otros                               | 2     | 6.06%
```

### **Cotizaciones Pendientes:**

```sql
-- Cotizaciones enviadas sin respuesta (más de 7 días)
SELECT * FROM get_pending_approval_quotations(
    '00000000-0000-0000-0000-000000000000'::UUID,
    7
);

-- Resultado ejemplo:
-- id   | quotation_number | customer_name | total_amount | created_at | days_pending
-- uuid | Q-2024-0050      | Juan Pérez    | 1500.00      | 2024-01-10 | 10
-- uuid | Q-2024-0051      | María García  | 2200.00      | 2024-01-12 | 8
```

---

## 🔐 **SEGURIDAD Y VALIDACIONES**

### **Checklist de Seguridad - APROBAR:**

- ✅ Validación de existencia de cotización
- ✅ Validación de estado (no aprobada, no convertida, no cancelada)
- ✅ Validación de datos requeridos (items, cliente)
- ✅ Versionado automático antes de aprobar
- ✅ Tracking completo de la aprobación
- ✅ Timestamp de aprobación
- ✅ Incremento de versión
- ✅ Preparación para conversión

### **Checklist de Seguridad - RECHAZAR:**

- ✅ Validación de existencia de cotización
- ✅ Validación de estado (no rechazada, no convertida, no cancelada)
- ✅ Versionado automático antes de rechazar
- ✅ Tracking completo del rechazo
- ✅ Timestamp de rechazo
- ✅ Registro de razón (opcional)
- ✅ Incremento de versión
- ✅ Posibilidad de modificar después

---

## 📋 **COLUMNAS AGREGADAS A `quotations`**

```sql
ALTER TABLE quotations ADD COLUMN:
- approved_at TIMESTAMPTZ      -- Fecha de aprobación
- rejected_at TIMESTAMPTZ      -- Fecha de rechazo
- rejection_reason TEXT         -- Motivo del rechazo
```

### **Índices Creados:**

```sql
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_approved_at ON quotations(approved_at);
CREATE INDEX idx_quotations_rejected_at ON quotations(rejected_at);
```

---

## 🚀 **PRÓXIMAS MEJORAS**

### **Funcionalidades Sugeridas:**

1. **Aprobación Parcial**: Aprobar solo algunos items
2. **Múltiples Aprobadores**: Workflow de aprobación
3. **Notificaciones Email**: Alertar al cliente
4. **Notificaciones SMS**: Confirmar aprobación
5. **Firma Digital**: Requerir firma para aprobar
6. **Historial de Revisiones**: Ver todas las versiones
7. **Comentarios**: Agregar notas a aprobación/rechazo
8. **Auto-recordatorios**: Recordar cotizaciones pendientes

### **Ejemplo de Aprobación con Firma:**

```typescript
// Futuro endpoint
POST /api/quotations/{id}/approve
{
  "signature": "base64_encoded_signature",
  "approver_name": "Juan Pérez",
  "approver_email": "juan@example.com",
  "notes": "Aprobado con condiciones especiales"
}
```

---

## 📚 **REFERENCIAS**

- **API Routes**: 
  - `src/app/api/quotations/[id]/approve/route.ts`
  - `src/app/api/quotations/[id]/reject/route.ts`
- **Queries**: `src/lib/database/queries/quotations.ts`
- **SQL Script**: `add_quotation_status_columns.sql`
- **Conversión**: `QUOTATION_TO_WORK_ORDER_CONVERSION.md`
- **Tracking**: `QUOTATIONS_VERSIONING_TRACKING.md`

---

**✅ Sistema de Aprobación y Rechazo Implementado**
**🔐 Con Validaciones Exhaustivas**
**📊 Con Tracking Completo**
**📈 Con Métricas de Aprobación**
**🔄 Con Versionado Automático**
**📝 Con Registro de Razones**


