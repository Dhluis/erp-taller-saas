# 🔢 Sistema de Generación de Números Únicos

## 📋 **RESUMEN**

Sistema centralizado para generar números de identificación únicos y secuenciales para diferentes módulos del ERP.

## 🎯 **FORMATO DE NÚMEROS**

Todos los números siguen el formato: `PREFIX-YEAR-SEQUENCE`

### **Prefijos por Módulo:**
- **Cotizaciones**: `Q-2024-0001`, `Q-2024-0002`, etc.
- **Órdenes de Trabajo**: `WO-2024-0001`, `WO-2024-0002`, etc.
- **Facturas**: `INV-2024-0001`, `INV-2024-0002`, etc.
- **Órdenes de Compra**: `PO-2024-0001`, `PO-2024-0002`, etc.

### **Ventajas del Sistema:**
✅ **Únicos**: Garantiza que no haya duplicados
✅ **Secuenciales**: Fácil de rastrear y ordenar
✅ **Por Año**: Se resetean automáticamente cada año
✅ **Por Organización**: Cada organización tiene su propia secuencia
✅ **Legibles**: Formato claro y profesional

## 🔧 **IMPLEMENTACIÓN**

### **1. Cotizaciones** (`src/lib/database/queries/quotations.ts`)

```typescript
// Generar número automáticamente
const quotationNumber = await generateQuotationNumber(organizationId)
// Resultado: "Q-2024-0001"
```

**Funciones disponibles:**
- `generateQuotationNumber(organizationId)` - Genera el siguiente número
- `getLastQuotationNumber(organizationId, year)` - Obtiene el último número del año

### **2. Órdenes de Trabajo** (`src/lib/database/queries/work-orders.ts`)

```typescript
// Generar número automáticamente
const orderNumber = await generateWorkOrderNumber(organizationId)
// Resultado: "WO-2024-0001"
```

**Funciones disponibles:**
- `generateWorkOrderNumber(organizationId)` - Genera el siguiente número
- `getLastOrderNumber(organizationId, year)` - Obtiene el último número del año

## 📊 **CÓMO FUNCIONA**

### **Paso 1: Obtener el Último Número**
```typescript
async function getLastOrderNumber(organizationId: string, year: number): Promise<number> {
  const prefix = `WO-${year}-`
  const { data } = await supabase
    .from('work_orders')
    .select('order_number')
    .eq('organization_id', organizationId)
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1)
  
  // Extraer el número del formato WO-2024-0001
  const lastNumber = data[0]?.order_number || '0'
  const numberPart = lastNumber.split('-')[2]
  return parseInt(numberPart, 10) || 0
}
```

### **Paso 2: Generar el Siguiente Número**
```typescript
export async function generateWorkOrderNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear()
  const lastNumber = await getLastOrderNumber(organizationId, year)
  const nextNumber = lastNumber + 1
  return `WO-${year}-${String(nextNumber).padStart(4, '0')}`
}
```

### **Paso 3: Usar en la Creación**
```typescript
export async function createWorkOrder(data) {
  // Generar número automáticamente
  const orderNumber = await generateWorkOrderNumber(data.organization_id)
  
  const { data: newOrder } = await supabase
    .from('work_orders')
    .insert({
      ...data,
      order_number: orderNumber
    })
  
  return newOrder
}
```

## 🎨 **EJEMPLOS DE USO**

### **Crear Cotización con Número Automático**
```typescript
import { createQuotation } from '@/lib/database/queries/quotations'

const quotation = await createQuotation({
  organization_id: 'org-123',
  customer_id: 'customer-456',
  description: 'Cotización para reparación de motor',
  valid_until: '2024-12-31'
})

console.log(quotation.quotation_number) // "Q-2024-0123"
```

### **Crear Orden de Trabajo con Número Automático**
```typescript
import { createWorkOrder, generateWorkOrderNumber } from '@/lib/database/queries/work-orders'

// Opción 1: El número se genera automáticamente en createWorkOrder
const order = await createWorkOrder({
  organization_id: 'org-123',
  customer_id: 'customer-456',
  vehicle_id: 'vehicle-789',
  description: 'Cambio de aceite y filtros'
})

// Opción 2: Generar el número manualmente si necesitas usarlo antes
const orderNumber = await generateWorkOrderNumber('org-123')
console.log(orderNumber) // "WO-2024-0045"
```

## 🔒 **SEGURIDAD Y CONCURRENCIA**

### **Manejo de Concurrencia**
El sistema usa la base de datos para garantizar la unicidad:

1. **Query ordenada**: Siempre obtiene el último número real de la BD
2. **Transacciones**: Cada inserción es atómica
3. **Validación de unicidad**: La BD tiene constraints únicos

### **Prevención de Duplicados**
```sql
-- En la base de datos
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_order_number_unique 
UNIQUE (order_number, organization_id);

ALTER TABLE quotations 
ADD CONSTRAINT quotations_quotation_number_unique 
UNIQUE (quotation_number, organization_id);
```

## 📈 **RESETEO ANUAL AUTOMÁTICO**

El sistema se resetea automáticamente cada año nuevo:

- **2024**: Q-2024-0001, Q-2024-0002, ..., Q-2024-9999
- **2025**: Q-2025-0001, Q-2025-0002, ..., Q-2025-9999

Esto ocurre automáticamente sin configuración adicional.

## 🚀 **EXTENSIÓN A OTROS MÓDULOS**

Para agregar generación de números a otro módulo:

### **Template:**
```typescript
// src/lib/database/queries/[module].ts

async function getLastInvoiceNumber(organizationId: string, year: number): Promise<number> {
  const prefix = `INV-${year}-`
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('organization_id', organizationId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return 0

  const lastNumber = data[0].invoice_number
  const numberPart = lastNumber.split('-')[2]
  return parseInt(numberPart, 10) || 0
}

export async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear()
  const lastNumber = await getLastInvoiceNumber(organizationId, year)
  const nextNumber = lastNumber + 1
  return `INV-${year}-${String(nextNumber).padStart(4, '0')}`
}
```

## 📝 **MEJORES PRÁCTICAS**

### ✅ **DO (Hacer):**
1. Siempre generar el número en el servidor (nunca en el cliente)
2. Usar el manejo de errores centralizado (`executeWithErrorHandling`)
3. Validar que el número se genera antes de insertar
4. Incluir el año en el formato
5. Usar prefijos distintivos por módulo

### ❌ **DON'T (No Hacer):**
1. No generar números en el cliente
2. No hardcodear el año
3. No usar números aleatorios
4. No reutilizar números eliminados
5. No permitir modificación manual del número

## 🔍 **DEBUGGING**

### **Verificar Últimos Números Generados:**
```sql
-- Ver últimos números de órdenes
SELECT order_number, created_at 
FROM work_orders 
WHERE organization_id = 'org-123'
ORDER BY created_at DESC 
LIMIT 10;

-- Ver últimos números de cotizaciones
SELECT quotation_number, created_at 
FROM quotations 
WHERE organization_id = 'org-123'
ORDER BY created_at DESC 
LIMIT 10;
```

### **Verificar Gaps en la Secuencia:**
```sql
-- Buscar números faltantes
SELECT 
  t1.order_number as current,
  t2.order_number as next,
  CAST(SPLIT_PART(t2.order_number, '-', 3) AS INTEGER) - 
  CAST(SPLIT_PART(t1.order_number, '-', 3) AS INTEGER) as gap
FROM work_orders t1
JOIN work_orders t2 ON t2.id = (
  SELECT id FROM work_orders 
  WHERE order_number > t1.order_number 
  ORDER BY order_number LIMIT 1
)
WHERE CAST(SPLIT_PART(t2.order_number, '-', 3) AS INTEGER) - 
      CAST(SPLIT_PART(t1.order_number, '-', 3) AS INTEGER) > 1;
```

## 📚 **REFERENCIAS**

- **Cotizaciones**: `src/lib/database/queries/quotations.ts`
- **Órdenes de Trabajo**: `src/lib/database/queries/work-orders.ts`
- **Items de Orden**: `src/lib/database/queries/order-items.ts`

## 🎓 **EJEMPLO COMPLETO DE FLUJO**

```typescript
// 1. Usuario crea una cotización
const quotation = await createQuotation({
  organization_id: 'org-123',
  customer_id: 'customer-456',
  description: 'Reparación de transmisión'
})
// → Número generado: Q-2024-0075

// 2. Cliente aprueba, convertir a orden de trabajo
const workOrder = await convertQuotationToWorkOrder(quotation.id)
// → Número generado: WO-2024-0125

// 3. Trabajo completado, generar factura
const invoice = await createInvoice({
  organization_id: 'org-123',
  work_order_id: workOrder.id,
  customer_id: 'customer-456'
})
// → Número generado: INV-2024-0089
```

---

**✅ Sistema Implementado y Probado**
**📅 Última actualización: 2024**
**👨‍💻 Mantenido por: Equipo de Desarrollo**


