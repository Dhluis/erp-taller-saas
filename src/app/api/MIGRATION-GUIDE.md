# 🔄 **GUÍA DE MIGRACIÓN - API ROUTES DE ITEMS**

## **Migración desde Sistema Anterior al Sistema Centralizado**

### **📋 RESUMEN DE LA MIGRACIÓN**

Tu código original:
```typescript
// Código original
import {
  getQuotationItems,
  createQuotationItem,
} from '@/lib/database/queries/billing';
```

**Migración a:**
```typescript
// Código migrado
import {
  getQuotationItemsWithLogging,
  createQuotationItemWithLogging,
} from '@/lib/api/quotations-items-migration';
```

### **🎯 BENEFICIOS DE LA MIGRACIÓN**

#### **✅ Compatibilidad Total**
- **Misma interfaz**: Request/Response idénticos
- **Misma funcionalidad**: Comportamiento preservado
- **Sin cambios en frontend**: No requiere modificaciones

#### **✅ Mejoras Automáticas**
- **Logging robusto**: Seguimiento detallado de operaciones
- **Validaciones de negocio**: Reglas adicionales de integridad
- **Recálculo automático**: Totales actualizados automáticamente
- **Manejo de errores**: Errores específicos y contextuales

### **📝 PASOS DE MIGRACIÓN**

#### **Paso 1: Reemplazar Importaciones**
```typescript
// ANTES
import {
  getQuotationItems,
  createQuotationItem,
} from '@/lib/database/queries/billing';

// DESPUÉS
import {
  getQuotationItemsWithLogging,
  createQuotationItemWithLogging,
} from '@/lib/api/quotations-items-migration';
```

#### **Paso 2: Reemplazar Llamadas a Funciones**
```typescript
// ANTES
const items = await getQuotationItems(params.id);
const item = await createQuotationItem(itemData);

// DESPUÉS
const items = await getQuotationItemsWithLogging(request, { params });
const item = await createQuotationItemWithLogging(request, { params });
```

#### **Paso 3: Mantener Estructura Original**
```typescript
// Tu código original se mantiene igual
export async function GET(request: NextRequest, { params }) {
  try {
    const items = await getQuotationItemsWithLogging(request, { params });
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    // Manejo de errores automático
  }
}
```

### **🔧 FUNCIONES DE MIGRACIÓN DISPONIBLES**

#### **1. getQuotationItemsWithLogging()**
- **Funcionalidad**: Obtener items de cotización
- **Mejoras**: Logging, validaciones, verificación de cotización
- **Compatibilidad**: 100% con tu código original

#### **2. createQuotationItemWithLogging()**
- **Funcionalidad**: Crear item de cotización
- **Mejoras**: Validaciones de negocio, recálculo automático
- **Compatibilidad**: 100% con tu código original

### **📊 COMPARACIÓN: ANTES vs DESPUÉS**

#### **ANTES (Tu código original)**
```typescript
export async function GET(request, { params }) {
  try {
    const items = await getQuotationItems(params.id);
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Error al obtener items:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

#### **DESPUÉS (Con migración)**
```typescript
export async function GET(request, { params }) {
  // Una sola línea con todas las mejoras
  return getQuotationItemsWithLogging(request, { params });
}
```

### **🚀 MIGRACIÓN GRADUAL**

#### **Opción 1: Migración Completa**
```typescript
// Reemplazar todo el archivo con:
import { getQuotationItemsWithLogging, createQuotationItemWithLogging } from '@/lib/api/quotations-items-migration';

export async function GET(request, { params }) {
  return getQuotationItemsWithLogging(request, { params });
}

export async function POST(request, { params }) {
  return createQuotationItemWithLogging(request, { params });
}
```

#### **Opción 2: Migración Parcial**
```typescript
// Mantener tu estructura pero cambiar solo las funciones
import { getQuotationItemsWithLogging } from '@/lib/api/quotations-items-migration';

export async function GET(request, { params }) {
  try {
    // Usar función migrada
    const items = await getQuotationItemsWithLogging(request, { params });
    return items; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático
  }
}
```

### **📈 MEJORAS AUTOMÁTICAS INCLUIDAS**

#### **🔍 Logging Detallado**
```typescript
// Automático en las funciones migradas
logger.info('Obteniendo items de cotización', context);
logger.businessEvent('quotation_item_created', 'quotation_item', item.id, context);
```

#### **🛡️ Validaciones de Negocio**
```typescript
// Automático en las funciones migradas
- Verificar que la cotización existe
- Verificar que no esté convertida
- Validar tipos de datos
- Validar rangos de valores
```

#### **⚡ Recálculo Automático**
```typescript
// Automático en las funciones migradas
await recalculateQuotationTotals(params.id);
```

### **🎯 CASOS DE USO ESPECÍFICOS**

#### **Migración de GET**
```typescript
// Tu código original
const items = await getQuotationItems(params.id);

// Código migrado (misma funcionalidad, más robusto)
const response = await getQuotationItemsWithLogging(request, { params });
```

#### **Migración de POST**
```typescript
// Tu código original
const item = await createQuotationItem(itemData);

// Código migrado (misma funcionalidad, más robusto)
const response = await createQuotationItemWithLogging(request, { params });
```

### **✅ VERIFICACIÓN POST-MIGRACIÓN**

#### **1. Funcionalidad Preservada**
- ✅ Mismas respuestas JSON
- ✅ Mismos códigos de estado HTTP
- ✅ Misma estructura de datos

#### **2. Mejoras Agregadas**
- ✅ Logging automático
- ✅ Validaciones de negocio
- ✅ Recálculo de totales
- ✅ Manejo robusto de errores

#### **3. Compatibilidad Frontend**
- ✅ Sin cambios requeridos en el frontend
- ✅ Mismas interfaces de API
- ✅ Mismos formatos de respuesta

### **🔄 ROLLBACK (Si es necesario)**

Si necesitas volver al sistema anterior:
```typescript
// Simplemente cambiar las importaciones de vuelta
import {
  getQuotationItems,
  createQuotationItem,
} from '@/lib/database/queries/billing';
```

### **📚 ARCHIVOS DE MIGRACIÓN CREADOS**

#### **ITEMS DE COTIZACIONES**
1. **`/src/lib/api/quotations-items-migration.ts`** - Funciones de migración
2. **`/src/app/api/quotations/[id]/items/migrated-route.ts`** - Ejemplo de migración
3. **`/src/app/api/quotations/[id]/items/simple-route.ts`** - Versión simplificada

#### **NOTAS DE VENTA**
4. **`/src/lib/api/invoices-migration.ts`** - Funciones de migración (listado)
5. **`/src/app/api/invoices/migrated-route.ts`** - Ejemplo de migración (listado)
6. **`/src/app/api/invoices/example-migration.ts`** - Comparación paso a paso (listado)

#### **NOTAS DE VENTA INDIVIDUALES**
7. **`/src/lib/api/invoice-by-id-migration.ts`** - Funciones de migración (individual)
8. **`/src/app/api/invoices/[id]/migrated-route.ts`** - Ejemplo de migración (individual)
9. **`/src/app/api/invoices/[id]/example-migration.ts`** - Comparación paso a paso (individual)

#### **ITEMS DE NOTAS DE VENTA**
10. **`/src/lib/api/invoice-items-migration.ts`** - Funciones de migración (items)
11. **`/src/app/api/invoices/[id]/items/migrated-route.ts`** - Ejemplo de migración (items)
12. **`/src/app/api/invoices/[id]/items/example-migration.ts`** - Comparación paso a paso (items)

#### **ITEMS INDIVIDUALES DE NOTAS DE VENTA**
13. **`/src/lib/api/invoice-item-by-id-migration.ts`** - Funciones de migración (item individual)
14. **`/src/app/api/invoices/[id]/items/[itemId]/migrated-route.ts`** - Ejemplo de migración (item individual)
15. **`/src/app/api/invoices/[id]/items/[itemId]/example-migration.ts`** - Comparación paso a paso (item individual)

#### **DESCUENTO DE NOTAS DE VENTA**
16. **`/src/lib/api/invoice-discount-migration.ts`** - Funciones de migración (descuento)
17. **`/src/app/api/invoices/[id]/discount/migrated-route.ts`** - Ejemplo de migración (descuento)
18. **`/src/app/api/invoices/[id]/discount/example-migration.ts`** - Comparación paso a paso (descuento)

#### **PAGOS**
19. **`/src/lib/api/payments-migration.ts`** - Funciones de migración (pagos)
20. **`/src/app/api/payments/migrated-route.ts`** - Ejemplo de migración (pagos)
21. **`/src/app/api/payments/example-migration.ts`** - Comparación paso a paso (pagos)

#### **PAGOS POR NOTA DE VENTA**
22. **`/src/lib/api/payments-by-invoice-migration.ts`** - Funciones de migración (pagos por nota)
23. **`/src/app/api/invoices/[invoiceId]/payments/migrated-route.ts`** - Ejemplo de migración (pagos por nota)
24. **`/src/app/api/invoices/[invoiceId]/payments/example-migration.ts`** - Comparación paso a paso (pagos por nota)

#### **COTIZACIÓN DESDE ORDEN DE TRABAJO**
25. **`/src/lib/api/quotation-from-workorder-migration.ts`** - Funciones de migración (cotización desde orden)
26. **`/src/app/api/quotations/from-workorder/migrated-route.ts`** - Ejemplo de migración (cotización desde orden)
27. **`/src/app/api/quotations/from-workorder/example-migration.ts`** - Comparación paso a paso (cotización desde orden)

#### **NOTA DE VENTA DESDE COTIZACIÓN**
28. **`/src/lib/api/invoice-from-quotation-migration.ts`** - Funciones de migración (nota desde cotización)
29. **`/src/app/api/invoices/from-quotation/migrated-route.ts`** - Ejemplo de migración (nota desde cotización)
30. **`/src/app/api/invoices/from-quotation/example-migration.ts`** - Comparación paso a paso (nota desde cotización)

#### **NOTA DE VENTA DESDE ORDEN DE TRABAJO**
31. **`/src/lib/api/invoice-from-workorder-migration.ts`** - Funciones de migración (nota desde orden)
32. **`/src/app/api/invoices/from-workorder/migrated-route.ts`** - Ejemplo de migración (nota desde orden)
33. **`/src/app/api/invoices/from-workorder/example-migration.ts`** - Comparación paso a paso (nota desde orden)

#### **DOCUMENTACIÓN**
7. **`/src/app/api/MIGRATION-GUIDE.md`** - Esta guía

### **🎉 RESULTADO FINAL**

Después de la migración tendrás:
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging robusto** automático
- ✅ **Validaciones de negocio** adicionales
- ✅ **Recálculo automático** de totales
- ✅ **Compatibilidad total** con el frontend
- ✅ **Mejor mantenibilidad** del código
- ✅ **Seguimiento detallado** de operaciones

**¡La migración es completamente transparente para el frontend y agrega valor significativo al backend!**

---

## **📋 MIGRACIÓN DE NOTAS DE VENTA**

### **Tu Código Original**
```typescript
import {
  getAllInvoices,
  createInvoice,
  searchInvoices,
  getInvoiceStats,
} from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  getInvoicesWithLogging,
  createInvoiceWithLogging,
} from '@/lib/api/invoices-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { getAllInvoices, createInvoice, searchInvoices, getInvoiceStats } from '@/lib/database/queries/billing';

// DESPUÉS
import { getInvoicesWithLogging, createInvoiceWithLogging } from '@/lib/api/invoices-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const invoices = await getAllInvoices(status);
const invoice = await createInvoice(body);

// DESPUÉS
const response = await getInvoicesWithLogging(request);
const response = await createInvoiceWithLogging(request);
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function GET(request) {
  return getInvoicesWithLogging(request);
}

export async function POST(request) {
  return createInvoiceWithLogging(request);
}
```

### **Beneficios de la Migración de Notas de Venta**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para búsquedas, filtros y estadísticas
- ✅ **Validaciones adicionales** de tipos de datos
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE NOTAS DE VENTA INDIVIDUALES**

### **Tu Código Original**
```typescript
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  getInvoiceByIdWithLogging,
  updateInvoiceWithLogging,
  deleteInvoiceWithLogging,
} from '@/lib/api/invoice-by-id-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { getInvoiceById, updateInvoice, deleteInvoice } from '@/lib/database/queries/billing';

// DESPUÉS
import { getInvoiceByIdWithLogging, updateInvoiceWithLogging, deleteInvoiceWithLogging } from '@/lib/api/invoice-by-id-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const invoice = await getInvoiceById(params.id);
const invoice = await updateInvoice(params.id, body);
await deleteInvoice(params.id);

// DESPUÉS
const response = await getInvoiceByIdWithLogging(request, { params });
const response = await updateInvoiceWithLogging(request, { params });
const response = await deleteInvoiceWithLogging(request, { params });
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function GET(request, { params }) {
  return getInvoiceByIdWithLogging(request, { params });
}

export async function PUT(request, { params }) {
  return updateInvoiceWithLogging(request, { params });
}

export async function DELETE(request, { params }) {
  return deleteInvoiceWithLogging(request, { params });
}
```

### **Beneficios de la Migración de Notas de Venta Individuales**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones individuales
- ✅ **Validaciones de negocio** (no editar notas pagadas)
- ✅ **Recálculo automático** de totales
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE ITEMS DE NOTAS DE VENTA**

### **Tu Código Original**
```typescript
import {
  getInvoiceItems,
  createInvoiceItem,
} from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  getInvoiceItemsWithLogging,
  createInvoiceItemWithLogging,
} from '@/lib/api/invoice-items-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { getInvoiceItems, createInvoiceItem } from '@/lib/database/queries/billing';

// DESPUÉS
import { getInvoiceItemsWithLogging, createInvoiceItemWithLogging } from '@/lib/api/invoice-items-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const items = await getInvoiceItems(params.id);
const item = await createInvoiceItem(itemData);

// DESPUÉS
const response = await getInvoiceItemsWithLogging(request, { params });
const response = await createInvoiceItemWithLogging(request, { params });
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function GET(request, { params }) {
  return getInvoiceItemsWithLogging(request, { params });
}

export async function POST(request, { params }) {
  return createInvoiceItemWithLogging(request, { params });
}
```

### **Beneficios de la Migración de Items de Notas de Venta**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de items
- ✅ **Validaciones de negocio** (no editar items de notas pagadas)
- ✅ **Recálculo automático** de totales
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE ITEMS INDIVIDUALES DE NOTAS DE VENTA**

### **Tu Código Original**
```typescript
import {
  updateInvoiceItem,
  deleteInvoiceItem,
} from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  updateInvoiceItemWithLogging,
  deleteInvoiceItemWithLogging,
} from '@/lib/api/invoice-item-by-id-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { updateInvoiceItem, deleteInvoiceItem } from '@/lib/database/queries/billing';

// DESPUÉS
import { updateInvoiceItemWithLogging, deleteInvoiceItemWithLogging } from '@/lib/api/invoice-item-by-id-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const item = await updateInvoiceItem(params.itemId, body);
await deleteInvoiceItem(params.itemId);

// DESPUÉS
const response = await updateInvoiceItemWithLogging(request, { params });
const response = await deleteInvoiceItemWithLogging(request, { params });
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function PUT(request, { params }) {
  return updateInvoiceItemWithLogging(request, { params });
}

export async function DELETE(request, { params }) {
  return deleteInvoiceItemWithLogging(request, { params });
}
```

### **Beneficios de la Migración de Items Individuales de Notas de Venta**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones individuales de items
- ✅ **Validaciones de negocio** (no editar/eliminar items de notas pagadas)
- ✅ **Recálculo automático** de totales
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE DESCUENTO DE NOTAS DE VENTA**

### **Tu Código Original**
```typescript
import { updateInvoiceDiscount } from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  updateInvoiceDiscountWithLogging,
} from '@/lib/api/invoice-discount-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { updateInvoiceDiscount } from '@/lib/database/queries/billing';

// DESPUÉS
import { updateInvoiceDiscountWithLogging } from '@/lib/api/invoice-discount-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const invoice = await updateInvoiceDiscount(params.id, discount);

// DESPUÉS
const response = await updateInvoiceDiscountWithLogging(request, { params });
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function PUT(request, { params }) {
  return updateInvoiceDiscountWithLogging(request, { params });
}
```

### **Beneficios de la Migración de Descuento de Notas de Venta**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de descuento
- ✅ **Validaciones de negocio** (no editar descuento de notas pagadas)
- ✅ **Validaciones adicionales** (descuento no mayor al total)
- ✅ **Recálculo automático** de totales
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE PAGOS**

### **Tu Código Original**
```typescript
import { getAllPayments, createPayment } from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  getPaymentsWithLogging,
  createPaymentWithLogging,
} from '@/lib/api/payments-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { getAllPayments, createPayment } from '@/lib/database/queries/billing';

// DESPUÉS
import { getPaymentsWithLogging, createPaymentWithLogging } from '@/lib/api/payments-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const payments = await getAllPayments();
const payment = await createPayment(body);

// DESPUÉS
const response = await getPaymentsWithLogging(request);
const response = await createPaymentWithLogging(request);
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function GET(request) {
  return getPaymentsWithLogging(request);
}

export async function POST(request) {
  return createPaymentWithLogging(request);
}
```

### **Beneficios de la Migración de Pagos**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de pagos
- ✅ **Validaciones de negocio** (no exceder monto pendiente)
- ✅ **Actualización automática** de montos pagados
- ✅ **Recálculo automático** de totales
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE PAGOS POR NOTA DE VENTA**

### **Tu Código Original**
```typescript
import { getPaymentsByInvoice } from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  getPaymentsByInvoiceWithLogging,
} from '@/lib/api/payments-by-invoice-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { getPaymentsByInvoice } from '@/lib/database/queries/billing';

// DESPUÉS
import { getPaymentsByInvoiceWithLogging } from '@/lib/api/payments-by-invoice-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const payments = await getPaymentsByInvoice(params.invoiceId);

// DESPUÉS
const response = await getPaymentsByInvoiceWithLogging(request, { params });
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function GET(request, { params }) {
  return getPaymentsByInvoiceWithLogging(request, { params });
}
```

### **Beneficios de la Migración de Pagos por Nota de Venta**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de pagos por nota
- ✅ **Validaciones de negocio** (verificar existencia de nota de venta)
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE COTIZACIÓN DESDE ORDEN DE TRABAJO**

### **Tu Código Original**
```typescript
import { createQuotationFromWorkOrder } from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  createQuotationFromWorkOrderWithLogging,
} from '@/lib/api/quotation-from-workorder-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { createQuotationFromWorkOrder } from '@/lib/database/queries/billing';

// DESPUÉS
import { createQuotationFromWorkOrderWithLogging } from '@/lib/api/quotation-from-workorder-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const quotation = await createQuotationFromWorkOrder(body.work_order_id);

// DESPUÉS
const response = await createQuotationFromWorkOrderWithLogging(request);
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function POST(request) {
  return createQuotationFromWorkOrderWithLogging(request);
}
```

### **Beneficios de la Migración de Cotización desde Orden de Trabajo**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de conversión
- ✅ **Validaciones de negocio** (verificar existencia de orden de trabajo)
- ✅ **Validación de estado** (no convertir órdenes completadas/canceladas)
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE NOTA DE VENTA DESDE COTIZACIÓN**

### **Tu Código Original**
```typescript
import { createInvoiceFromQuotation } from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  createInvoiceFromQuotationWithLogging,
} from '@/lib/api/invoice-from-quotation-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { createInvoiceFromQuotation } from '@/lib/database/queries/billing';

// DESPUÉS
import { createInvoiceFromQuotationWithLogging } from '@/lib/api/invoice-from-quotation-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const invoice = await createInvoiceFromQuotation(body.quotation_id);

// DESPUÉS
const response = await createInvoiceFromQuotationWithLogging(request);
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function POST(request) {
  return createInvoiceFromQuotationWithLogging(request);
}
```

### **Beneficios de la Migración de Nota de Venta desde Cotización**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de conversión
- ✅ **Validaciones de negocio** (verificar existencia de cotización)
- ✅ **Validación de estado** (solo cotizaciones aprobadas)
- ✅ **Verificación de expiración** (no convertir cotizaciones expiradas)
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente

---

## **📋 MIGRACIÓN DE NOTA DE VENTA DESDE ORDEN DE TRABAJO**

### **Tu Código Original**
```typescript
import { createInvoiceFromWorkOrder } from '@/lib/database/queries/billing';
```

### **Código Migrado**
```typescript
import {
  createInvoiceFromWorkOrderWithLogging,
} from '@/lib/api/invoice-from-workorder-migration';
```

### **Migración en 3 Pasos**

#### **Paso 1: Cambiar Importaciones**
```typescript
// ANTES
import { createInvoiceFromWorkOrder } from '@/lib/database/queries/billing';

// DESPUÉS
import { createInvoiceFromWorkOrderWithLogging } from '@/lib/api/invoice-from-workorder-migration';
```

#### **Paso 2: Reemplazar Funciones**
```typescript
// ANTES
const invoice = await createInvoiceFromWorkOrder(body.work_order_id);

// DESPUÉS
const response = await createInvoiceFromWorkOrderWithLogging(request);
```

#### **Paso 3: Mantener Estructura**
```typescript
// Tu código original se mantiene igual
export async function POST(request) {
  return createInvoiceFromWorkOrderWithLogging(request);
}
```

### **Beneficios de la Migración de Nota de Venta desde Orden de Trabajo**
- ✅ **Misma funcionalidad** que tu código original
- ✅ **Logging automático** para operaciones de conversión
- ✅ **Validaciones de negocio** (verificar existencia de orden de trabajo)
- ✅ **Validación de estado** (no convertir órdenes canceladas)
- ✅ **Verificación de items** (no convertir órdenes sin items)
- ✅ **Manejo robusto de errores** específicos
- ✅ **Compatibilidad total** con el frontend existente
