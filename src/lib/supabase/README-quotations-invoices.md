# 📋 Sistema de Cotizaciones y Notas de Venta

## 🎯 **RESUMEN DEL SISTEMA**

Sistema completo para gestión de cotizaciones, notas de venta y pagos con:
- ✅ Manejo robusto de errores y logging detallado
- ✅ Contexto dinámico de organización
- ✅ Validaciones y sanitización de datos
- ✅ Métricas de rendimiento y eventos de negocio
- ✅ Patrones consistentes con el resto del proyecto

## 🗄️ **ARQUITECTURA DEL SISTEMA**

### **1. Servicio Principal** (`quotations-invoices.ts`)
- **Función**: Servicio centralizado para cotizaciones, notas de venta y pagos
- **Características**:
  - Manejo dinámico de `organization_id`
  - Logging estructurado con contexto
  - Medición de rendimiento
  - Manejo robusto de errores de Supabase

### **2. Hook de Organización** (`useOrganization.ts`)
- **Función**: Gestión de contexto de organización
- **Características**:
  - Contexto React para organización
  - Fallback a organización temporal
  - Validación de organización
  - Configuración de impuestos

### **3. Sistema de Logging** (`logging.ts`)
- **Función**: Logging estructurado y métricas
- **Características**:
  - Múltiples niveles de logging
  - Logging remoto y local
  - Métricas de rendimiento
  - Eventos de negocio y seguridad

## 🔌 **FUNCIONES IMPLEMENTADAS**

### **COTIZACIONES**
```typescript
// Obtener todas las cotizaciones
const quotations = await getAllQuotations('pending');

// Crear cotización
const quotation = await createQuotation({
  customer_id: 'customer-123',
  vehicle_id: 'vehicle-456',
  description: 'Reparación de motor',
  notes: 'Urgente'
});

// Crear cotización desde orden de trabajo
const quotationFromOrder = await createQuotationFromWorkOrder('work-order-123');

// Actualizar estado
await updateQuotationStatus('quotation-123', 'approved');

// Gestionar cotizaciones vencidas
const expiredQuotations = await getExpiredQuotations();
await markExpiredQuotations();

// Obtener estadísticas
const stats = await getQuotationStats();

// Buscar cotizaciones
const results = await searchQuotations('motor');
```

### **NOTAS DE VENTA**
```typescript
// Obtener todas las notas de venta
const invoices = await getAllInvoices('pending');

// Crear nota de venta
const invoice = await createInvoice({
  customer_id: 'customer-123',
  vehicle_id: 'vehicle-456',
  description: 'Servicios realizados',
  due_date: '2024-02-15'
});

// Crear nota de venta desde orden de trabajo
const invoiceFromOrder = await createInvoiceFromWorkOrder('work-order-123');

// Crear nota de venta desde cotización
const invoiceFromQuotation = await createInvoiceFromQuotation('quotation-123');

// Actualizar descuento
await updateInvoiceDiscount('invoice-123', 100.00);

// Recalcular totales
await recalculateInvoiceTotals('invoice-123');

// Obtener estadísticas
const stats = await getInvoiceStats();
```

### **PAGOS**
```typescript
// Crear pago
const payment = await createPayment({
  invoice_id: 'invoice-123',
  amount: 500.00,
  payment_method: 'card',
  payment_date: '2024-01-15',
  reference: 'TXN-123456'
});

// Obtener pagos por nota de venta
const payments = await getPaymentsByInvoice('invoice-123');

// Validar monto de pago
await validatePaymentAmount('invoice-123', 100.00);

// Obtener total pagado
const totalPaid = await getTotalPaidByInvoice('invoice-123');

// Obtener métodos de pago disponibles
const paymentMethods = await getPaymentMethods();
```

### **CONVERSIONES Y UTILIDADES**
```typescript
// Crear cotización desde orden de trabajo
const quotation = await createQuotationFromWorkOrder('work-order-123');

// Crear nota de venta desde orden de trabajo
const invoice = await createInvoiceFromWorkOrder('work-order-123');

// Crear nota de venta desde cotización
const invoiceFromQuotation = await createInvoiceFromQuotation('quotation-123');

// Recalcular totales
await recalculateQuotationTotals('quotation-123');
await recalculateInvoiceTotals('invoice-123');

// Gestionar cotizaciones vencidas
const expiredQuotations = await getExpiredQuotations();
await markExpiredQuotations();

// Obtener estadísticas completas
const quotationStats = await getQuotationStats();
const invoiceStats = await getInvoiceStats();
const paymentStats = await getPaymentStats();
```

## 📊 **SISTEMA DE LOGGING**

### **Configuración por Entorno**
```typescript
// Desarrollo: Logging detallado
const devConfig = {
  level: 'debug',
  enableConsole: true,
  enableRemote: false
};

// Producción: Logging optimizado
const prodConfig = {
  level: 'warn',
  enableConsole: false,
  enableRemote: true
};
```

### **Tipos de Logging**
```typescript
// Logging básico
logger.info('Operación completada', context);

// Eventos de negocio
logger.businessEvent('quotation_created', 'quotation', 'new', context);

// Métricas de rendimiento
logger.performanceMetric('api_response_time', 150, 'ms', context);

// Errores de Supabase
logSupabaseError('createQuotation', error, context);
```

## 🔒 **SEGURIDAD Y VALIDACIÓN**

### **Sanitización de Datos**
```typescript
// Campos sensibles se redactan automáticamente
const sanitizedData = sanitizeForLogging({
  password: 'secret123', // Se convierte en '[REDACTED]'
  email: 'user@example.com' // Se mantiene
});
```

### **Validación de Organización**
```typescript
// Validar organización antes de operaciones
const organizationId = getOrganizationId();
validateOrganization(organizationId);
```

## 📈 **MÉTRICAS Y MONITOREO**

### **Métricas Automáticas**
- ⏱️ Tiempo de ejecución de operaciones
- 📊 Rendimiento de consultas de base de datos
- 🔄 Eventos de negocio (creación, actualización, eliminación)
- 🚨 Errores y excepciones

### **Eventos de Negocio**
```typescript
// Se registran automáticamente:
// - quotation_created
// - quotation_updated
// - quotation_converted
// - invoice_created
// - payment_received
// - etc.
```

## 🛠️ **USO EN COMPONENTES**

### **Hook de Organización**
```typescript
import { useOrganization } from '@/hooks/useOrganization';

function QuotationsPage() {
  const { organization, organizationId, loading } = useOrganization();
  
  if (loading) return <div>Cargando...</div>;
  
  // Usar organizationId en las operaciones
  const quotations = await getAllQuotations();
}
```

### **Logging en Componentes**
```typescript
import { logger, createLogContext } from '@/lib/core/logging';

function QuotationForm() {
  const handleSubmit = async (data) => {
    const context = createLogContext(
      organizationId,
      userId,
      'QuotationForm',
      'handleSubmit'
    );
    
    logger.info('Iniciando creación de cotización', context);
    
    try {
      const result = await createQuotation(data);
      logger.info('Cotización creada exitosamente', context);
      return result;
    } catch (error) {
      logger.error('Error al crear cotización', context, error);
      throw error;
    }
  };
}
```

## 🔧 **CONFIGURACIÓN**

### **Variables de Entorno**
```env
# Logging
NEXT_PUBLIC_LOGGING_ENDPOINT=https://logs.example.com/api/logs

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Configuración de Logging**
```typescript
// src/lib/core/logging-config.ts
export const componentLoggingConfig = {
  'quotations-invoices': {
    level: 'info',
    enableBusinessEvents: true,
    enablePerformanceMetrics: true,
  },
  // ... otros componentes
};
```

## 🚀 **BENEFICIOS DEL SISTEMA**

### **Para Desarrolladores**
- ✅ Código más mantenible y debuggeable
- ✅ Patrones consistentes en todo el proyecto
- ✅ Manejo robusto de errores
- ✅ Logging detallado para debugging

### **Para el Negocio**
- ✅ Trazabilidad completa de operaciones
- ✅ Métricas de rendimiento
- ✅ Auditoría de eventos
- ✅ Monitoreo de errores

### **Para Producción**
- ✅ Logging optimizado por entorno
- ✅ Sanitización de datos sensibles
- ✅ Manejo de errores de Supabase
- ✅ Métricas de rendimiento

## 📝 **EJEMPLOS DE USO**

### **Crear Cotización Completa**
```typescript
async function createCompleteQuotation(data) {
  const context = createLogContext(organizationId, userId, 'QuotationService', 'createCompleteQuotation');
  
  try {
    // 1. Crear cotización
    const quotation = await createQuotation(data);
    logger.businessEvent('quotation_created', 'quotation', quotation.id, context);
    
    // 2. Agregar items
    for (const item of data.items) {
      await createQuotationItem({
        quotation_id: quotation.id,
        ...item
      });
    }
    
    // 3. Recalcular totales
    await recalculateQuotationTotals(quotation.id);
    
    logger.info('Cotización completa creada exitosamente', context);
    return quotation;
    
  } catch (error) {
    logger.error('Error al crear cotización completa', context, error);
    throw error;
  }
}
```

### **Procesar Pago con Validación**
```typescript
async function processPayment(invoiceId, paymentData) {
  const context = createLogContext(organizationId, userId, 'PaymentService', 'processPayment');
  
  try {
    // 1. Validar monto
    await validatePaymentAmount(invoiceId, paymentData.amount);
    
    // 2. Crear pago
    const payment = await createPayment({
      invoice_id: invoiceId,
      ...paymentData
    });
    
    // 3. Actualizar nota de venta
    const updatedInvoice = await updateInvoicePaidAmount(invoiceId, paymentData.amount);
    
    logger.businessEvent('payment_processed', 'payment', payment.id, context);
    return { payment, invoice: updatedInvoice };
    
  } catch (error) {
    logger.error('Error al procesar pago', context, error);
    throw error;
  }
}
```

## 🔍 **DEBUGGING Y TROUBLESHOOTING**

### **Logs de Debugging**
```typescript
// Habilitar logging detallado en desarrollo
logger.debug('Estado actual de la cotización', context, { quotation });
```

### **Métricas de Rendimiento**
```typescript
// Medir tiempo de operaciones
const result = await measureExecutionTime(
  () => getAllQuotations(),
  'getAllQuotations',
  context
);
```

### **Errores de Supabase**
```typescript
// Los errores se logean automáticamente con contexto completo
try {
  await createQuotation(data);
} catch (error) {
  // El error ya se loggeó con logSupabaseError
  // Solo necesitas manejar la UI
  showError('Error al crear cotización');
}
```

---

## 📚 **RECURSOS ADICIONALES**

- [Documentación de Supabase](https://supabase.com/docs)
- [Patrones de Logging](https://docs.example.com/logging-patterns)
- [Guía de Debugging](https://docs.example.com/debugging-guide)
- [Métricas de Rendimiento](https://docs.example.com/performance-metrics)
