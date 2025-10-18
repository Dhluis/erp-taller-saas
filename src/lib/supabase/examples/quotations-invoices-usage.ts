/**
 * Ejemplos de Uso del Sistema de Cotizaciones y Notas de Venta
 * Demuestra cómo usar todas las funciones del sistema
 */

import {
  // Cotizaciones
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
  updateQuotationDiscount,
  searchQuotations,
  getQuotationsByCustomer,
  getQuotationsByWorkOrder,
  getQuotationItems,
  createQuotationItem,
  updateQuotationItem,
  deleteQuotationItem,
  recalculateQuotationTotals,
  getExpiredQuotations,
  markExpiredQuotations,
  getQuotationStats,
  createQuotationFromWorkOrder,
  
  // Notas de Venta
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceDiscount,
  searchInvoices,
  getInvoicesByCustomer,
  getInvoiceStats,
  getInvoiceItems,
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  recalculateInvoiceTotals,
  updateInvoicePaidAmount,
  createInvoiceFromWorkOrder,
  createInvoiceFromQuotation,
  
  // Pagos
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  searchPayments,
  getPaymentsByInvoice,
  getPaymentsByCustomer,
  getPaymentStats,
  getTotalPaidByInvoice,
  validatePaymentAmount,
  getPaymentMethods,
} from '../quotations-invoices';

// =====================================================
// EJEMPLOS DE COTIZACIONES
// =====================================================

/**
 * Ejemplo 1: Crear una cotización completa
 */
export async function createCompleteQuotation() {
  try {
    // 1. Crear cotización base
    const quotation = await createQuotation({
      customer_id: 'customer-123',
      vehicle_id: 'vehicle-456',
      description: 'Reparación de motor - Cambio de aceite y filtros',
      notes: 'Cliente solicita cotización urgente',
      valid_until: '2024-02-15'
    });

    console.log('Cotización creada:', quotation.id);

    // 2. Agregar items a la cotización
    const items = [
      {
        quotation_id: quotation.id,
        item_type: 'service' as const,
        item_name: 'Cambio de aceite',
        description: 'Cambio de aceite de motor 5W-30',
        quantity: 1,
        unit_price: 150.00
      },
      {
        quotation_id: quotation.id,
        item_type: 'part' as const,
        item_name: 'Filtro de aceite',
        description: 'Filtro de aceite original',
        quantity: 1,
        unit_price: 45.00
      }
    ];

    for (const item of items) {
      await createQuotationItem(item);
    }

    // 3. Recalcular totales
    await recalculateQuotationTotals(quotation.id);

    // 4. Obtener cotización completa
    const completeQuotation = await getQuotationById(quotation.id);
    
    return completeQuotation;
  } catch (error) {
    console.error('Error al crear cotización completa:', error);
    throw error;
  }
}

/**
 * Ejemplo 2: Procesar aprobación de cotización
 */
export async function processQuotationApproval(quotationId: string) {
  try {
    // 1. Actualizar estado a aprobada
    await updateQuotationStatus(quotationId, 'approved');
    
    // 2. Crear nota de venta desde la cotización
    const invoice = await createInvoiceFromQuotation(quotationId);
    
    console.log('Nota de venta creada desde cotización:', invoice.id);
    
    return invoice;
  } catch (error) {
    console.error('Error al procesar aprobación:', error);
    throw error;
  }
}

/**
 * Ejemplo 3: Gestionar cotizaciones vencidas
 */
export async function manageExpiredQuotations() {
  try {
    // 1. Obtener cotizaciones vencidas
    const expiredQuotations = await getExpiredQuotations();
    console.log(`Cotizaciones vencidas encontradas: ${expiredQuotations.length}`);

    // 2. Marcar como vencidas
    if (expiredQuotations.length > 0) {
      const markedQuotations = await markExpiredQuotations();
      console.log(`Cotizaciones marcadas como vencidas: ${markedQuotations.length}`);
    }

    // 3. Obtener estadísticas
    const stats = await getQuotationStats();
    console.log('Estadísticas de cotizaciones:', stats);

    return { expiredQuotations, stats };
  } catch (error) {
    console.error('Error al gestionar cotizaciones vencidas:', error);
    throw error;
  }
}

// =====================================================
// EJEMPLOS DE NOTAS DE VENTA
// =====================================================

/**
 * Ejemplo 4: Crear nota de venta desde orden de trabajo
 */
export async function createInvoiceFromWorkOrderExample(workOrderId: string) {
  try {
    // Crear nota de venta desde orden de trabajo
    const invoice = await createInvoiceFromWorkOrder(workOrderId);
    
    console.log('Nota de venta creada desde orden:', invoice.id);
    
    // Obtener items de la nota de venta
    const items = await getInvoiceItems(invoice.id);
    console.log(`Items en la nota de venta: ${items.length}`);
    
    return { invoice, items };
  } catch (error) {
    console.error('Error al crear nota de venta desde orden:', error);
    throw error;
  }
}

/**
 * Ejemplo 5: Procesar pago completo
 */
export async function processFullPayment(invoiceId: string, paymentData: {
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
}) {
  try {
    // 1. Validar monto del pago
    await validatePaymentAmount(invoiceId, paymentData.amount);
    
    // 2. Crear pago
    const payment = await createPayment({
      invoice_id: invoiceId,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      reference: paymentData.reference,
      notes: paymentData.notes,
      payment_date: new Date().toISOString(),
    });
    
    console.log('Pago creado:', payment.id);
    
    // 3. Actualizar monto pagado de la nota de venta
    const updatedInvoice = await updateInvoicePaidAmount(invoiceId, paymentData.amount);
    
    console.log('Nota de venta actualizada:', updatedInvoice.status);
    
    return { payment, invoice: updatedInvoice };
  } catch (error) {
    console.error('Error al procesar pago:', error);
    throw error;
  }
}

/**
 * Ejemplo 6: Procesar pago parcial
 */
export async function processPartialPayment(invoiceId: string, amount: number) {
  try {
    // 1. Validar monto
    await validatePaymentAmount(invoiceId, amount);
    
    // 2. Crear pago
    const payment = await createPayment({
      invoice_id: invoiceId,
      amount,
      payment_method: 'card',
      payment_date: new Date().toISOString(),
    });
    
    // 3. Obtener total pagado hasta ahora
    const totalPaid = await getTotalPaidByInvoice(invoiceId);
    
    // 4. Actualizar nota de venta
    const updatedInvoice = await updateInvoicePaidAmount(invoiceId, totalPaid);
    
    console.log(`Pago parcial procesado. Total pagado: $${totalPaid}, Saldo: $${updatedInvoice.balance}`);
    
    return { payment, invoice: updatedInvoice, totalPaid };
  } catch (error) {
    console.error('Error al procesar pago parcial:', error);
    throw error;
  }
}

// =====================================================
// EJEMPLOS DE REPORTES Y ESTADÍSTICAS
// =====================================================

/**
 * Ejemplo 7: Generar reporte de facturación
 */
export async function generateBillingReport() {
  try {
    // 1. Obtener estadísticas de notas de venta
    const invoiceStats = await getInvoiceStats();
    
    // 2. Obtener estadísticas de pagos
    const paymentStats = await getPaymentStats();
    
    // 3. Obtener estadísticas de cotizaciones
    const quotationStats = await getQuotationStats();
    
    const report = {
      invoices: invoiceStats,
      payments: paymentStats,
      quotations: quotationStats,
      generated_at: new Date().toISOString(),
    };
    
    console.log('Reporte de facturación generado:', report);
    
    return report;
  } catch (error) {
    console.error('Error al generar reporte:', error);
    throw error;
  }
}

/**
 * Ejemplo 8: Buscar y filtrar datos
 */
export async function searchAndFilterData() {
  try {
    // 1. Buscar cotizaciones
    const quotations = await searchQuotations('motor');
    console.log(`Cotizaciones encontradas: ${quotations.length}`);
    
    // 2. Buscar notas de venta
    const invoices = await searchInvoices('reparación');
    console.log(`Notas de venta encontradas: ${invoices.length}`);
    
    // 3. Buscar pagos
    const payments = await searchPayments('TXN-123');
    console.log(`Pagos encontrados: ${payments.length}`);
    
    // 4. Obtener por cliente
    const customerInvoices = await getInvoicesByCustomer('customer-123');
    const customerQuotations = await getQuotationsByCustomer('customer-123');
    const customerPayments = await getPaymentsByCustomer('customer-123');
    
    return {
      quotations,
      invoices,
      payments,
      customerData: {
        invoices: customerInvoices,
        quotations: customerQuotations,
        payments: customerPayments,
      }
    };
  } catch (error) {
    console.error('Error en búsqueda y filtrado:', error);
    throw error;
  }
}

// =====================================================
// EJEMPLOS DE FLUJOS COMPLETOS
// =====================================================

/**
 * Ejemplo 9: Flujo completo de venta
 */
export async function completeSalesFlow(workOrderId: string) {
  try {
    console.log('Iniciando flujo completo de venta...');
    
    // 1. Crear cotización desde orden de trabajo
    const quotation = await createQuotationFromWorkOrder(workOrderId);
    console.log('Cotización creada:', quotation.id);
    
    // 2. Simular aprobación de cotización
    await updateQuotationStatus(quotation.id, 'approved');
    console.log('Cotización aprobada');
    
    // 3. Crear nota de venta desde cotización
    const invoice = await createInvoiceFromQuotation(quotation.id);
    console.log('Nota de venta creada:', invoice.id);
    
    // 4. Procesar pago
    const payment = await processFullPayment(invoice.id, {
      amount: invoice.total_amount,
      payment_method: 'card',
      reference: 'TXN-' + Date.now(),
      notes: 'Pago completo de la factura'
    });
    
    console.log('Flujo completo finalizado exitosamente');
    
    return {
      quotation,
      invoice,
      payment,
      flow_completed: true
    };
  } catch (error) {
    console.error('Error en flujo completo:', error);
    throw error;
  }
}

/**
 * Ejemplo 10: Gestión de inventario y facturación
 */
export async function inventoryAndBillingManagement() {
  try {
    // 1. Obtener métodos de pago disponibles
    const paymentMethods = await getPaymentMethods();
    console.log('Métodos de pago disponibles:', paymentMethods);
    
    // 2. Obtener todas las notas de venta pendientes
    const pendingInvoices = await getAllInvoices('pending');
    console.log(`Notas de venta pendientes: ${pendingInvoices.length}`);
    
    // 3. Obtener todas las cotizaciones pendientes
    const pendingQuotations = await getAllQuotations('pending');
    console.log(`Cotizaciones pendientes: ${pendingQuotations.length}`);
    
    // 4. Procesar pagos pendientes
    for (const invoice of pendingInvoices) {
      const payments = await getPaymentsByInvoice(invoice.id);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid > 0) {
        await updateInvoicePaidAmount(invoice.id, totalPaid);
        console.log(`Nota de venta ${invoice.id} actualizada con pagos`);
      }
    }
    
    return {
      paymentMethods,
      pendingInvoices,
      pendingQuotations,
      processed: pendingInvoices.length
    };
  } catch (error) {
    console.error('Error en gestión de inventario y facturación:', error);
    throw error;
  }
}

// =====================================================
// EJEMPLOS DE VALIDACIÓN Y ERROR HANDLING
// =====================================================

/**
 * Ejemplo 11: Manejo robusto de errores
 */
export async function robustErrorHandling() {
  try {
    // Intentar crear cotización con datos inválidos
    try {
      await createQuotation({
        customer_id: '', // ID inválido
        vehicle_id: 'vehicle-123',
        description: 'Test'
      });
    } catch (error) {
      console.log('Error esperado capturado:', error.message);
    }
    
    // Intentar crear pago con monto inválido
    try {
      await validatePaymentAmount('invoice-123', -100); // Monto negativo
    } catch (error) {
      console.log('Error de validación capturado:', error.message);
    }
    
    // Intentar obtener cotización inexistente
    try {
      await getQuotationById('quotation-inexistente');
    } catch (error) {
      console.log('Error de cotización no encontrada:', error.message);
    }
    
    console.log('Manejo de errores completado exitosamente');
    
  } catch (error) {
    console.error('Error inesperado:', error);
    throw error;
  }
}

// =====================================================
// EXPORTAR EJEMPLOS
// =====================================================

export const examples = {
  createCompleteQuotation,
  processQuotationApproval,
  manageExpiredQuotations,
  createInvoiceFromWorkOrderExample,
  processFullPayment,
  processPartialPayment,
  generateBillingReport,
  searchAndFilterData,
  completeSalesFlow,
  inventoryAndBillingManagement,
  robustErrorHandling,
};

export default examples;

