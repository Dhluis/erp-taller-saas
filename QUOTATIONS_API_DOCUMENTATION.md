# 📋 API de Cotizaciones - Documentación Completa

## 🎯 **RESUMEN**

API REST completa para gestionar cotizaciones en el sistema ERP. Incluye generación automática de números únicos, cálculo automático de totales, y conversión a órdenes de trabajo.

## 📡 **ENDPOINTS IMPLEMENTADOS**

### **1. Gestión de Cotizaciones**

#### **GET /api/quotations**
Lista todas las cotizaciones con filtros opcionales.

**Query Parameters:**
- `organization_id` (string) - ID de la organización (default: '00000000-0000-0000-0000-000000000000')
- `status` (string, opcional) - Filtrar por estado ('draft', 'sent', 'approved', 'rejected', 'converted', 'cancelled')
- `customer_id` (string, opcional) - Filtrar por cliente
- `date_from` (string, opcional) - Fecha desde (ISO 8601)
- `date_to` (string, opcional) - Fecha hasta (ISO 8601)

**Respuesta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "quotation_number": "Q-2024-0001",
      "organization_id": "uuid",
      "customer_id": "uuid",
      "status": "draft",
      "description": "Reparación de motor",
      "notes": "Cliente preferente",
      "valid_until": "2024-12-31",
      "subtotal": 1000.00,
      "tax_amount": 160.00,
      "discount_amount": 50.00,
      "total_amount": 1110.00,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "customers": {
        "id": "uuid",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "555-1234"
      }
    }
  ],
  "error": null
}
```

#### **POST /api/quotations**
Crea una nueva cotización con número automático generado.

**Request Body:**
```json
{
  "organization_id": "uuid",
  "customer_id": "uuid",
  "description": "Reparación de motor",
  "notes": "Cliente preferente",
  "valid_until": "2024-12-31",
  "status": "draft"
}
```

**Respuesta:**
```json
{
  "data": {
    "id": "uuid",
    "quotation_number": "Q-2024-0001",
    "organization_id": "uuid",
    "customer_id": "uuid",
    "status": "draft",
    "description": "Reparación de motor",
    "notes": "Cliente preferente",
    "valid_until": "2024-12-31",
    "subtotal": 0,
    "tax_amount": 0,
    "discount_amount": 0,
    "total_amount": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "error": null
}
```

#### **GET /api/quotations/[id]**
Obtiene una cotización específica con todos sus items.

**Respuesta:**
```json
{
  "data": {
    "id": "uuid",
    "quotation_number": "Q-2024-0001",
    "organization_id": "uuid",
    "customer_id": "uuid",
    "status": "draft",
    "description": "Reparación de motor",
    "subtotal": 1000.00,
    "tax_amount": 160.00,
    "discount_amount": 50.00,
    "total_amount": 1110.00,
    "customers": {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "quotation_items": [
      {
        "id": "uuid",
        "quotation_id": "uuid",
        "item_type": "service",
        "description": "Cambio de aceite",
        "quantity": 1,
        "unit_price": 500.00,
        "discount_percent": 5,
        "discount_amount": 25.00,
        "tax_percent": 16,
        "subtotal": 500.00,
        "tax_amount": 76.00,
        "total": 551.00
      }
    ]
  },
  "error": null
}
```

#### **PUT /api/quotations/[id]**
Actualiza una cotización existente.

**Request Body:**
```json
{
  "description": "Reparación completa de motor",
  "notes": "Actualización de notas",
  "valid_until": "2024-12-31",
  "status": "sent"
}
```

**Respuesta:**
```json
{
  "data": {
    "id": "uuid",
    "quotation_number": "Q-2024-0001",
    "description": "Reparación completa de motor",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "error": null
}
```

#### **DELETE /api/quotations/[id]**
Cancela una cotización (soft delete - cambia status a 'cancelled').

**Respuesta:**
```json
{
  "data": {
    "success": true,
    "message": "Cotización cancelada exitosamente"
  },
  "error": null
}
```

---

### **2. Gestión de Items de Cotización**

#### **GET /api/quotations/[id]/items**
Lista todos los items de una cotización.

**Respuesta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "quotation_id": "uuid",
      "service_id": "uuid",
      "product_id": null,
      "item_type": "service",
      "description": "Cambio de aceite",
      "quantity": 1,
      "unit_price": 500.00,
      "discount_percent": 5,
      "discount_amount": 25.00,
      "tax_percent": 16,
      "subtotal": 500.00,
      "tax_amount": 76.00,
      "total": 551.00,
      "services": {
        "id": "uuid",
        "name": "Cambio de aceite",
        "category": "Mantenimiento"
      }
    }
  ],
  "error": null
}
```

#### **POST /api/quotations/[id]/items**
Agrega un item a la cotización y recalcula totales automáticamente.

**Request Body:**
```json
{
  "item_type": "service",
  "service_id": "uuid",
  "description": "Cambio de aceite y filtro",
  "quantity": 1,
  "unit_price": 500.00,
  "discount_percent": 5,
  "tax_percent": 16,
  "notes": "Incluye filtro premium"
}
```

**Respuesta:**
```json
{
  "data": {
    "id": "uuid",
    "quotation_id": "uuid",
    "item_type": "service",
    "description": "Cambio de aceite y filtro",
    "quantity": 1,
    "unit_price": 500.00,
    "discount_percent": 5,
    "discount_amount": 25.00,
    "tax_percent": 16,
    "subtotal": 500.00,
    "tax_amount": 76.00,
    "total": 551.00,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "error": null
}
```

#### **GET /api/quotations/[id]/items/[itemId]**
Obtiene un item específico de la cotización.

**Respuesta:**
```json
{
  "data": {
    "id": "uuid",
    "quotation_id": "uuid",
    "item_type": "product",
    "description": "Filtro de aceite",
    "quantity": 2,
    "unit_price": 150.00,
    "subtotal": 300.00,
    "products": {
      "id": "uuid",
      "name": "Filtro de aceite premium",
      "code": "FLT-001"
    }
  },
  "error": null
}
```

#### **PUT /api/quotations/[id]/items/[itemId]**
Actualiza un item y recalcula totales automáticamente.

**Request Body:**
```json
{
  "quantity": 2,
  "unit_price": 550.00,
  "discount_percent": 10,
  "notes": "Descuento especial aplicado"
}
```

**Respuesta:**
```json
{
  "data": {
    "id": "uuid",
    "quantity": 2,
    "unit_price": 550.00,
    "discount_percent": 10,
    "discount_amount": 110.00,
    "subtotal": 1100.00,
    "tax_amount": 158.40,
    "total": 1148.40,
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "error": null
}
```

#### **DELETE /api/quotations/[id]/items/[itemId]**
Elimina un item y recalcula totales automáticamente.

**Respuesta:**
```json
{
  "data": {
    "success": true,
    "message": "Item eliminado exitosamente"
  },
  "error": null
}
```

---

### **3. Funciones Especiales**

#### **POST /api/quotations/[id]/duplicate**
Duplica una cotización completa con un nuevo número automático.

**Respuesta:**
```json
{
  "data": {
    "id": "new-uuid",
    "quotation_number": "Q-2024-0002",
    "description": "Copia de Q-2024-0001: Reparación de motor",
    "status": "draft",
    "quotation_items": [
      {
        "id": "new-item-uuid",
        "description": "Cambio de aceite",
        "quantity": 1,
        "unit_price": 500.00
      }
    ]
  },
  "error": null
}
```

#### **POST /api/quotations/[id]/convert**
Convierte una cotización en una orden de trabajo.

**Respuesta:**
```json
{
  "data": {
    "work_order": {
      "id": "uuid",
      "order_number": "WO-2024-0001",
      "customer_id": "uuid",
      "status": "pending",
      "total_amount": 1110.00
    }
  },
  "error": null
}
```

---

## 🔒 **VALIDACIONES Y REGLAS DE NEGOCIO**

### **Estados de Cotización:**
- **draft**: Borrador, editable
- **sent**: Enviada al cliente, editable
- **approved**: Aprobada por el cliente
- **rejected**: Rechazada por el cliente
- **converted**: Convertida a orden de trabajo (no editable)
- **cancelled**: Cancelada (no editable)

### **Reglas de Edición:**
- ✅ **Permitido**: Editar cotizaciones en estado 'draft', 'sent', 'approved', 'rejected'
- ❌ **Bloqueado**: No se puede editar cotizaciones 'converted' o 'cancelled'
- ✅ **Soft Delete**: DELETE cambia status a 'cancelled', no elimina físicamente

### **Cálculo Automático:**
1. **Subtotal del item**: `quantity × unit_price`
2. **Descuento**: `subtotal × (discount_percent / 100)` o `discount_amount`
3. **Subtotal después de descuento**: `subtotal - discount_amount`
4. **Impuesto**: `subtotal_after_discount × (tax_percent / 100)`
5. **Total del item**: `subtotal_after_discount + tax_amount`
6. **Total de cotización**: Suma de todos los totales de items

### **Generación de Números:**
- **Formato**: `Q-YEAR-SEQUENCE` (Ejemplo: `Q-2024-0001`)
- **Único**: Por organización
- **Secuencial**: Incrementa automáticamente
- **Anual**: Se resetea cada año

---

## 💡 **EJEMPLOS DE USO**

### **Flujo Completo: Crear Cotización**

```typescript
// 1. Crear cotización
const response1 = await fetch('/api/quotations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organization_id: 'org-123',
    customer_id: 'customer-456',
    description: 'Reparación de motor',
    valid_until: '2024-12-31'
  })
})
const { data: quotation } = await response1.json()
// → quotation_number: "Q-2024-0001"

// 2. Agregar items
const response2 = await fetch(`/api/quotations/${quotation.id}/items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    item_type: 'service',
    service_id: 'service-789',
    description: 'Cambio de aceite',
    quantity: 1,
    unit_price: 500.00,
    tax_percent: 16
  })
})
const { data: item } = await response2.json()
// → Totales recalculados automáticamente

// 3. Obtener cotización completa
const response3 = await fetch(`/api/quotations/${quotation.id}`)
const { data: fullQuotation } = await response3.json()
// → Incluye todos los items y totales actualizados

// 4. Duplicar cotización
const response4 = await fetch(`/api/quotations/${quotation.id}/duplicate`, {
  method: 'POST'
})
const { data: duplicatedQuotation } = await response4.json()
// → Nueva cotización con número Q-2024-0002

// 5. Convertir a orden de trabajo
const response5 = await fetch(`/api/quotations/${quotation.id}/convert`, {
  method: 'POST'
})
const { data: workOrder } = await response5.json()
// → Orden de trabajo WO-2024-0001 creada
```

---

## 🚨 **MANEJO DE ERRORES**

Todos los endpoints devuelven errores en el mismo formato:

```json
{
  "data": null,
  "error": "Mensaje de error descriptivo"
}
```

### **Códigos de Estado HTTP:**
- `200` - OK (operación exitosa)
- `201` - Created (recurso creado)
- `400` - Bad Request (datos inválidos o regla de negocio violada)
- `404` - Not Found (recurso no encontrado)
- `500` - Internal Server Error (error del servidor)

### **Ejemplos de Errores:**

```json
// 404 - Cotización no encontrada
{
  "data": null,
  "error": "Cotización no encontrada"
}

// 400 - Datos faltantes
{
  "data": null,
  "error": "Faltan datos requeridos: organization_id y customer_id"
}

// 400 - Regla de negocio violada
{
  "data": null,
  "error": "No se pueden agregar items a una cotización converted"
}
```

---

## 📚 **REFERENCIAS**

- **Queries de Cotizaciones**: `src/lib/database/queries/quotations.ts`
- **Queries de Items**: `src/lib/database/queries/quotation-items.ts`
- **Sistema de Números**: `NUMBER_GENERATION_SYSTEM.md`
- **API Routes**: `src/app/api/quotations/`

---

**✅ API Completa y Documentada**
**📅 Última actualización: 2024**
**👨‍💻 Mantenido por: Equipo de Desarrollo**


