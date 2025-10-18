# 🚀 API Routes del Sistema de Cotizaciones y Notas de Venta

## 🎯 **RESUMEN DE LAS API ROUTES**

Sistema completo de API routes para gestión de cotizaciones, notas de venta y pagos con:
- ✅ Manejo robusto de errores y logging detallado
- ✅ Validaciones de datos de entrada
- ✅ Contexto de organización dinámico
- ✅ Eventos de negocio y métricas
- ✅ Patrones consistentes en todas las rutas

## 🔌 **ENDPOINTS IMPLEMENTADOS**

### **COTIZACIONES**

#### **GET /api/quotations**
Obtener todas las cotizaciones con filtros opcionales

**Query Parameters:**
- `status` - Filtrar por estado (pending, approved, rejected, converted, expired)
- `search` - Buscar por número o descripción
- `expired` - Obtener solo cotizaciones vencidas (true/false)
- `stats` - Obtener estadísticas (true/false)

**Ejemplo:**
```typescript
// Obtener cotizaciones pendientes
GET /api/quotations?status=pending

// Buscar cotizaciones
GET /api/quotations?search=motor

// Obtener estadísticas
GET /api/quotations?stats=true
```

#### **POST /api/quotations**
Crear nueva cotización

**Body:**
```typescript
{
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  valid_until?: string;
  work_order_id?: string;
}
```

#### **GET /api/quotations/[id]**
Obtener cotización específica

#### **PUT /api/quotations/[id]**
Actualizar cotización

#### **DELETE /api/quotations/[id]**
Eliminar cotización

#### **PATCH /api/quotations/[id]**
Actualizaciones específicas

**Body para PATCH:**
```typescript
// Actualizar estado
{
  "action": "update_status",
  "status": "approved"
}

// Actualizar descuento
{
  "action": "update_discount",
  "discount": 100.00
}

// Recalcular totales
{
  "action": "recalculate_totals"
}
```

#### **PUT /api/quotations/[id]/status**
Actualizar estado específico de cotización

**Body:**
```typescript
{
  "status": "approved" | "rejected" | "converted" | "expired" | "pending"
}
```

**Validaciones:**
- Transiciones de estado válidas
- Cotización debe existir
- Estados permitidos según estado actual

#### **GET /api/quotations/[id]/status**
Obtener estados válidos para transición

**Respuesta:**
```typescript
{
  "success": true,
  "data": {
    "current_status": "pending",
    "available_transitions": ["approved", "rejected", "expired"],
    "quotation_id": "quotation-123",
    "quotation_number": "COT-2024-001"
  }
}
```

#### **POST /api/quotations/[id]/convert**
Convertir cotización a nota de venta

**Validaciones:**
- Cotización debe estar aprobada
- No debe estar vencida
- Debe tener items
- No debe estar ya convertida

**Respuesta:**
```typescript
{
  "success": true,
  "data": {
    "quotation": {
      "id": "quotation-123",
      "quotation_number": "COT-2024-001",
      "status": "converted"
    },
    "invoice": {
      "id": "invoice-456",
      "invoice_number": "INV-2024-001",
      "status": "pending",
      "total_amount": 1500.00
    }
  }
}
```

#### **GET /api/quotations/[id]/convert**
Verificar si cotización puede ser convertida

**Respuesta:**
```typescript
{
  "success": true,
  "data": {
    "quotation_id": "quotation-123",
    "quotation_number": "COT-2024-001",
    "current_status": "approved",
    "can_convert": true,
    "checks": {
      "exists": true,
      "is_approved": true,
      "not_expired": true,
      "has_items": true,
      "not_already_converted": true
    },
    "issues": [],
    "valid_until": "2024-02-15",
    "items_count": 3
  }
}
```

#### **PUT /api/quotations/bulk-status**
Actualización masiva de estados

**Body:**
```typescript
// Actualizar múltiples cotizaciones
{
  "action": "update_status",
  "quotation_ids": ["quotation-1", "quotation-2", "quotation-3"],
  "status": "approved"
}

// Marcar cotizaciones vencidas
{
  "action": "mark_expired"
}

// Obtener cotizaciones vencidas
{
  "action": "get_expired"
}
```

#### **GET /api/quotations/[id]/items**
Obtener items de cotización

#### **POST /api/quotations/[id]/items**
Crear item de cotización

**Body:**
```typescript
{
  "item_type": "service" | "part",
  "item_name": string,
  "description"?: string,
  "quantity": number,
  "unit_price": number
}
```

#### **PUT /api/quotations/[id]/items**
Actualizar múltiples items en lote

**Body:**
```typescript
{
  "items": [
    {
      "id": "item-1",
      "item_name": "Nuevo nombre",
      "quantity": 2,
      "unit_price": 100.00
    }
  ]
}
```

#### **GET /api/quotations/[id]/items/[itemId]**
Obtener item específico de cotización

#### **PUT /api/quotations/[id]/items/[itemId]**
Actualizar item específico

#### **DELETE /api/quotations/[id]/items/[itemId]**
Eliminar item específico

### **NOTAS DE VENTA**

#### **GET /api/invoices**
Obtener todas las notas de venta

**Query Parameters:**
- `status` - Filtrar por estado (pending, paid, partial, cancelled)
- `search` - Buscar por número o descripción
- `stats` - Obtener estadísticas (true/false)

#### **POST /api/invoices**
Crear nueva nota de venta

**Body para diferentes fuentes:**
```typescript
// Crear manualmente
{
  "source": "manual",
  "customer_id": "customer-123",
  "vehicle_id": "vehicle-456",
  "description": "Servicios realizados",
  "due_date": "2024-02-15"
}

// Crear desde orden de trabajo
{
  "source": "work_order",
  "work_order_id": "work-order-123"
}

// Crear desde cotización
{
  "source": "quotation",
  "quotation_id": "quotation-123"
}
```

#### **GET /api/invoices/[id]**
Obtener nota de venta específica

#### **PUT /api/invoices/[id]**
Actualizar nota de venta

#### **DELETE /api/invoices/[id]**
Eliminar nota de venta

#### **PATCH /api/invoices/[id]**
Actualizaciones específicas

**Body para PATCH:**
```typescript
// Actualizar descuento
{
  "action": "update_discount",
  "discount": 50.00
}

// Actualizar monto pagado
{
  "action": "update_paid_amount",
  "paid_amount": 500.00
}

// Recalcular totales
{
  "action": "recalculate_totals"
}
```

#### **GET /api/invoices/[id]/items**
Obtener items de nota de venta

#### **POST /api/invoices/[id]/items**
Crear item de nota de venta

**Body:**
```typescript
{
  "item_type": "service" | "part",
  "item_name": string,
  "description"?: string,
  "quantity": number,
  "unit_price": number
}
```

#### **PUT /api/invoices/[id]/items**
Actualizar múltiples items en lote

**Body:**
```typescript
{
  "items": [
    {
      "id": "item-1",
      "item_name": "Nuevo nombre",
      "quantity": 2,
      "unit_price": 100.00
    }
  ]
}
```

#### **GET /api/invoices/[id]/items/[itemId]**
Obtener item específico de nota de venta

#### **PUT /api/invoices/[id]/items/[itemId]**
Actualizar item específico

#### **DELETE /api/invoices/[id]/items/[itemId]**
Eliminar item específico

### **PAGOS**

#### **GET /api/payments**
Obtener todos los pagos

**Query Parameters:**
- `invoice_id` - Filtrar por nota de venta específica
- `search` - Buscar por número de pago, referencia o notas
- `stats` - Obtener estadísticas (true/false)
- `methods` - Obtener métodos de pago disponibles (true/false)

#### **POST /api/payments**
Crear nuevo pago

**Body:**
```typescript
{
  invoice_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  payment_date: string;
  reference?: string;
  notes?: string;
  created_by?: string;
}
```

#### **GET /api/payments/[id]**
Obtener pago específico

#### **PUT /api/payments/[id]**
Actualizar pago

#### **DELETE /api/payments/[id]**
Eliminar pago

## 📊 **RESPUESTAS DE LA API**

### **Formato de Respuesta Exitosa**
```typescript
{
  "success": true,
  "data": any
}
```

### **Formato de Respuesta de Error**
```typescript
{
  "success": false,
  "error": string
}
```

### **Códigos de Estado HTTP**
- `200` - Operación exitosa
- `201` - Recurso creado exitosamente
- `400` - Error de validación de datos
- `404` - Recurso no encontrado
- `500` - Error interno del servidor

## 🔍 **EJEMPLOS DE USO**

### **Flujo Completo de Cotización a Pago**

#### **1. Crear Cotización**
```typescript
POST /api/quotations
{
  "customer_id": "customer-123",
  "vehicle_id": "vehicle-456",
  "description": "Reparación de motor",
  "notes": "Cliente solicita cotización urgente",
  "valid_until": "2024-02-15"
}
```

#### **2. Aprobar Cotización**
```typescript
PATCH /api/quotations/[id]
{
  "action": "update_status",
  "status": "approved"
}
```

#### **3. Crear Nota de Venta desde Cotización**
```typescript
POST /api/invoices
{
  "source": "quotation",
  "quotation_id": "quotation-123"
}
```

#### **4. Procesar Pago**
```typescript
POST /api/payments
{
  "invoice_id": "invoice-123",
  "amount": 500.00,
  "payment_method": "card",
  "payment_date": "2024-01-15T10:30:00Z",
  "reference": "TXN-123456",
  "notes": "Pago con tarjeta de crédito"
}
```

### **Búsqueda y Filtrado**

#### **Buscar Cotizaciones**
```typescript
GET /api/quotations?search=motor&status=pending
```

#### **Obtener Estadísticas**
```typescript
GET /api/quotations?stats=true
GET /api/invoices?stats=true
GET /api/payments?stats=true
```

#### **Obtener Métodos de Pago**
```typescript
GET /api/payments?methods=true
```

### **Gestión de Vencimientos**

#### **Obtener Cotizaciones Vencidas**
```typescript
GET /api/quotations?expired=true
```

#### **Marcar Cotizaciones Vencidas**
```typescript
PATCH /api/quotations
{
  "action": "mark_expired"
}
```

### **Operaciones Especializadas de Cotizaciones**

#### **Verificar Estados Válidos**
```typescript
GET /api/quotations/[id]/status
```

#### **Actualizar Estado Específico**
```typescript
PUT /api/quotations/[id]/status
{
  "status": "approved"
}
```

#### **Verificar Conversión**
```typescript
GET /api/quotations/[id]/convert
```

#### **Convertir Cotización**
```typescript
POST /api/quotations/[id]/convert
```

#### **Actualización Masiva de Estados**
```typescript
PUT /api/quotations/bulk-status
{
  "action": "update_status",
  "quotation_ids": ["quotation-1", "quotation-2"],
  "status": "approved"
}
```

### **Gestión de Items**

#### **Agregar Item a Cotización**
```typescript
POST /api/quotations/[id]/items
{
  "item_type": "service",
  "item_name": "Cambio de aceite",
  "description": "Cambio de aceite de motor 5W-30",
  "quantity": 1,
  "unit_price": 150.00
}
```

#### **Actualizar Item Específico**
```typescript
PUT /api/quotations/[id]/items/[itemId]
{
  "item_name": "Cambio de aceite premium",
  "unit_price": 200.00
}
```

#### **Actualizar Múltiples Items**
```typescript
PUT /api/quotations/[id]/items
{
  "items": [
    {
      "id": "item-1",
      "quantity": 2,
      "unit_price": 100.00
    },
    {
      "id": "item-2",
      "item_name": "Nuevo nombre"
    }
  ]
}
```

#### **Eliminar Item**
```typescript
DELETE /api/quotations/[id]/items/[itemId]
```

#### **Agregar Item a Nota de Venta**
```typescript
POST /api/invoices/[id]/items
{
  "item_type": "part",
  "item_name": "Filtro de aceite",
  "quantity": 1,
  "unit_price": 45.00
}
```

## 🛡️ **VALIDACIONES Y SEGURIDAD**

### **Validaciones Automáticas**
- ✅ Campos requeridos
- ✅ Tipos de datos correctos
- ✅ Rangos de valores válidos
- ✅ Estados válidos para transiciones
- ✅ Validación de montos de pago

### **Reglas de Negocio**
- ✅ No se puede eliminar cotización convertida
- ✅ No se puede eliminar nota de venta con pagos
- ✅ Validación de monto de pago vs saldo pendiente
- ✅ Recalculación automática de totales

### **Logging y Auditoría**
- ✅ Logging de todas las operaciones
- ✅ Eventos de negocio registrados
- ✅ Métricas de rendimiento
- ✅ Trazabilidad completa

## 📈 **MÉTRICAS Y MONITOREO**

### **Estadísticas Disponibles**

#### **Cotizaciones**
```typescript
{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  converted: number;
  expired: number;
  total_value: number;
  conversion_rate: number;
  average_value: number;
}
```

#### **Notas de Venta**
```typescript
{
  total: number;
  pending: number;
  paid: number;
  partial: number;
  cancelled: number;
  total_revenue: number;
  total_collected: number;
  total_pending: number;
}
```

#### **Pagos**
```typescript
{
  total_payments: number;
  total_amount: number;
  average_payment: number;
  payments_by_method: {
    cash: number;
    card: number;
    transfer: number;
    check: number;
    other: number;
  };
}
```

## 🔧 **CONFIGURACIÓN Y DESARROLLO**

### **Variables de Entorno Requeridas**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_LOGGING_ENDPOINT=your-logging-endpoint
```

### **Estructura de Archivos**
```
src/app/api/
├── quotations/
│   ├── route.ts          # GET, POST, PATCH
│   └── [id]/route.ts     # GET, PUT, DELETE, PATCH
├── invoices/
│   ├── route.ts          # GET, POST
│   └── [id]/route.ts     # GET, PUT, DELETE, PATCH
└── payments/
    ├── route.ts          # GET, POST
    └── [id]/route.ts     # GET, PUT, DELETE
```

### **Patrones de Código**
- ✅ Manejo consistente de errores
- ✅ Logging estructurado con contexto
- ✅ Validación de organización
- ✅ Eventos de negocio
- ✅ Respuestas estandarizadas

## 🚀 **BENEFICIOS DEL SISTEMA**

### **Para Desarrolladores**
- ✅ APIs RESTful completas
- ✅ Documentación detallada
- ✅ Logging para debugging
- ✅ Validaciones automáticas

### **Para el Negocio**
- ✅ Flujos completos de venta
- ✅ Gestión de vencimientos
- ✅ Estadísticas detalladas
- ✅ Trazabilidad completa

### **Para Producción**
- ✅ Manejo robusto de errores
- ✅ Logging de auditoría
- ✅ Métricas de rendimiento
- ✅ Escalabilidad

---

## 📚 **RECURSOS ADICIONALES**

- [Documentación de Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Patrones de API REST](https://restfulapi.net/)
- [Guía de Logging](https://docs.example.com/logging-guide)
- [Métricas de Rendimiento](https://docs.example.com/performance-metrics)
