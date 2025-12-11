/**
 * Servicio de Cotizaciones y Notas de Venta
 * Funciones para manejar cotizaciones, notas de venta y pagos del sistema
 */

import { createClient } from '@/lib/supabase/client';
import { executeWithErrorHandling } from '@/lib/core/errors';
import { logger, createLogContext, measureExecutionTime, logSupabaseError } from '@/lib/core/logging';
// ⚠️ NOTA: getOrganizationId y validateOrganization fueron eliminados
// Estas funciones eran client-side hooks que no deben usarse aquí
// El organizationId debe obtenerse del contexto de autenticación o parámetros
// import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

const supabase = createClient();

// =====================================================
// TIPOS TYPESCRIPT
// =====================================================

export interface Quotation {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  customer_id: string;
  vehicle_id: string;
  quotation_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted' | 'expired';
  description: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  valid_until: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: any;
  vehicle?: any;
  work_order?: any;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface SalesInvoice {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  quotation_id: string | null;
  customer_id: string;
  vehicle_id: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'partial' | 'cancelled';
  description: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: any;
  vehicle?: any;
  work_order?: any;
  quotation?: any;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  payment_number: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  reference: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
  created_by: string | null;
}

// =====================================================
// COTIZACIONES (QUOTATIONS)
// =====================================================

// Obtener todas las cotizaciones
export async function getAllQuotations(organizationId: string, status?: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'getAllQuotations', { status });
    logger.info('Obteniendo todas las cotizaciones', context);

    return measureExecutionTime(async () => {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*),
          work_order:work_orders(*)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logSupabaseError('getAllQuotations', error, context);
        throw error;
      }

      logger.info(`Cotizaciones obtenidas: ${data?.length || 0} registros`, context);
      return data as Quotation[];
    }, 'getAllQuotations', context);
  }, 'Error al obtener cotizaciones');
}

// Obtener cotización por ID
export async function getQuotationById(id: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
        // work_order:work_orders(*) // No hay relación en el schema actual,
        items:quotation_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Quotation;
  }, 'Error al obtener cotización');
}

// Crear cotización
export async function createQuotation(organizationId: string, quotationData: {
  work_order_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  valid_until?: string;
}) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'createQuotation', {
      customer_id: quotationData.customer_id,
      vehicle_id: quotationData.vehicle_id,
      work_order_id: quotationData.work_order_id,
    });
    
    logger.info('Creando nueva cotización', context);
    logger.businessEvent('quotation_created', 'quotation', 'new', context);

    return measureExecutionTime(async () => {
      const { data, error } = await supabase
        .from('quotations')
        .insert({
          organization_id: organizationId,
          ...quotationData,
        })
        .select()
        .single();

      if (error) {
        logSupabaseError('createQuotation', error, context);
        throw error;
      }

      logger.info(`Cotización creada exitosamente: ${data.id}`, context);
      return data as Quotation;
    }, 'createQuotation', context);
  }, 'Error al crear cotización');
}

// Actualizar cotización
export async function updateQuotation(
  id: string,
  quotationData: Partial<Quotation>
) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .update(quotationData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Quotation;
  }, 'Error al actualizar cotización');
}

// Eliminar cotización
export async function deleteQuotation(id: string) {
  return executeWithErrorHandling(async () => {
    const { error } = await supabase.from('quotations').delete().eq('id', id);

    if (error) throw error;
  }, 'Error al eliminar cotización');
}

// Actualizar estado de cotización
export async function updateQuotationStatus(
  id: string,
  status: Quotation['status']
) {
  return executeWithErrorHandling(async () => {
    const updateData: any = { status };
    
    if (status === 'converted') {
      updateData.converted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Quotation;
  }, 'Error al actualizar estado de cotización');
}

// Actualizar descuento de cotización
export async function updateQuotationDiscount(id: string, discount: number) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .update({ discount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Quotation;
  }, 'Error al actualizar descuento de cotización');
}

// Buscar cotizaciones
export async function searchQuotations(organizationId: string, searchTerm: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .eq('organization_id', organizationId)
      .or(
        `quotation_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Quotation[];
  }, 'Error al buscar cotizaciones');
}

// Obtener cotizaciones por cliente
export async function getQuotationsByCustomer(customerId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Quotation[];
  }, 'Error al obtener cotizaciones del cliente');
}

// Obtener cotizaciones por orden de trabajo
export async function getQuotationsByWorkOrder(workOrderId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Quotation[];
  }, 'Error al obtener cotizaciones de la orden de trabajo');
}

// =====================================================
// ITEMS DE COTIZACIÓN
// =====================================================

// Obtener items de cotización
export async function getQuotationItems(quotationId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as QuotationItem[];
  }, 'Error al obtener items de cotización');
}

// Crear item de cotización
export async function createQuotationItem(itemData: {
  quotation_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotation_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;
    return data as QuotationItem;
  }, 'Error al crear item de cotización');
}

// Actualizar item de cotización
export async function updateQuotationItem(
  id: string,
  itemData: Partial<QuotationItem>
) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('quotation_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as QuotationItem;
  }, 'Error al actualizar item de cotización');
}

// Eliminar item de cotización
export async function deleteQuotationItem(id: string) {
  return executeWithErrorHandling(async () => {
    const { error } = await supabase.from('quotation_items').delete().eq('id', id);

    if (error) throw error;
  }, 'Error al eliminar item de cotización');
}

// =====================================================
// NOTAS DE VENTA (SALES INVOICES)
// =====================================================

// Obtener todas las notas de venta
export async function getAllInvoices(organizationId: string, status?: string) {
  return executeWithErrorHandling(async () => {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
        // work_order:work_orders(*) // No hay relación en el schema actual,
        // quotation:quotations(*) // No hay relación en el schema actual
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as SalesInvoice[];
  }, 'Error al obtener notas de venta');
}

// Obtener nota de venta por ID
export async function getInvoiceById(id: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
        // work_order:work_orders(*), // No hay relación en el schema actual
        // quotation:quotations(*), // No hay relación en el schema actual
        // items:invoice_items(*), // Tabla no existe en el schema actual
        // payments:payments(*) // Tabla no existe en el schema actual
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as SalesInvoice;
  }, 'Error al obtener nota de venta');
}

// Crear nota de venta
export async function createInvoice(organizationId: string, invoiceData: {
  work_order_id?: string;
  quotation_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  due_date?: string;
}) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        ...invoiceData,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SalesInvoice;
  }, 'Error al crear nota de venta');
}

// Actualizar nota de venta
export async function updateInvoice(
  id: string,
  invoiceData: Partial<SalesInvoice>
) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesInvoice;
  }, 'Error al actualizar nota de venta');
}

// Eliminar nota de venta
export async function deleteInvoice(id: string) {
  return executeWithErrorHandling(async () => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) throw error;
  }, 'Error al eliminar nota de venta');
}

// Actualizar descuento de nota de venta
export async function updateInvoiceDiscount(id: string, discount: number) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .update({ discount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesInvoice;
  }, 'Error al actualizar descuento de nota de venta');
}

// Buscar notas de venta
export async function searchInvoices(organizationId: string, searchTerm: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .eq('organization_id', organizationId)
      .or(
        `invoice_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SalesInvoice[];
  }, 'Error al buscar notas de venta');
}

// Obtener notas de venta por cliente
export async function getInvoicesByCustomer(customerId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SalesInvoice[];
  }, 'Error al obtener notas de venta del cliente');
}

// Obtener estadísticas de facturación
export async function getInvoiceStats(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('status, total')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter((i) => i.status === 'pending').length,
      partial: data.filter((i) => i.status === 'partial').length,
      paid: data.filter((i) => i.status === 'paid').length,
      cancelled: data.filter((i) => i.status === 'cancelled').length,
      total_revenue: data
        .filter((i) => i.status !== 'cancelled')
        .reduce((sum, i) => sum + (i.total || 0), 0),
      total_collected: data
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + (i.total || 0), 0),
      total_pending: data
        .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
        .reduce((sum, i) => sum + (i.total || 0), 0),
    };

    return stats;
  }, 'Error al obtener estadísticas de facturación');
}

// =====================================================
// ITEMS DE NOTA DE VENTA
// =====================================================

// Obtener items de nota de venta
export async function getInvoiceItems(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    // Tabla invoice_items no existe en el schema actual
    console.warn('getInvoiceItems: Tabla invoice_items no existe en el schema actual');
    return [];
  }, 'Error al obtener items de nota de venta');
}

// Crear item de nota de venta
export async function createInvoiceItem(itemData: {
  invoice_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}) {
  return executeWithErrorHandling(async () => {
    // Tabla invoice_items no existe en el schema actual
    console.warn('createInvoiceItem: Tabla invoice_items no existe en el schema actual');
    return null;
  }, 'Error al crear item de nota de venta');
}

// Actualizar item de nota de venta
export async function updateInvoiceItem(
  id: string,
  itemData: Partial<InvoiceItem>
) {
  return executeWithErrorHandling(async () => {
    // Tabla invoice_items no existe en el schema actual
    console.warn('updateInvoiceItem: Tabla invoice_items no existe en el schema actual');
    return null;
  }, 'Error al actualizar item de nota de venta');
}

// Eliminar item de nota de venta
export async function deleteInvoiceItem(id: string) {
  return executeWithErrorHandling(async () => {
    // Tabla invoice_items no existe en el schema actual
    console.warn('deleteInvoiceItem: Tabla invoice_items no existe en el schema actual');
    return null;
  }, 'Error al eliminar item de nota de venta');
}

// =====================================================
// PAGOS (PAYMENTS)
// =====================================================

// Obtener todos los pagos
export async function getAllPayments(organizationId: string, invoiceId?: string) {
  return executeWithErrorHandling(async () => {
    let query = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .eq('organization_id', organizationId)
      .order('payment_date', { ascending: false });

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Payment[];
  }, 'Error al obtener pagos');
}

// Obtener pago por ID
export async function getPaymentById(id: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Payment;
  }, 'Error al obtener pago');
}

// Crear pago
export async function createPayment(organizationId: string, paymentData: {
  invoice_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
  payment_date: string;
  created_by?: string;
}) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        organization_id: organizationId,
        ...paymentData,
      })
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .single();

    if (error) throw error;
    return data as Payment;
  }, 'Error al crear pago');
}

// Actualizar pago
export async function updatePayment(
  id: string,
  paymentData: Partial<Payment>
) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .update(paymentData)
      .eq('id', id)
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .single();

    if (error) throw error;
    return data as Payment;
  }, 'Error al actualizar pago');
}

// Eliminar pago
export async function deletePayment(id: string) {
  return executeWithErrorHandling(async () => {
    const { error } = await supabase.from('payments').delete().eq('id', id);

    if (error) throw error;
  }, 'Error al eliminar pago');
}

// Buscar pagos
export async function searchPayments(organizationId: string, searchTerm: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .eq('organization_id', organizationId)
      .or(
        `payment_number.ilike.%${searchTerm}%,reference.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`
      )
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as Payment[];
  }, 'Error al buscar pagos');
}

// Obtener pagos por nota de venta
export async function getPaymentsByInvoice(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as Payment[];
  }, 'Error al obtener pagos de la nota de venta');
}

// Obtener pagos por cliente
export async function getPaymentsByCustomer(organizationId: string, customerId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          customer_id,
          total_amount,
          customer:customers(id, name, email, phone)
        )
      `)
      .eq('organization_id', organizationId)
      .eq('invoice.customer_id', customerId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as Payment[];
  }, 'Error al obtener pagos del cliente');
}

// Obtener estadísticas de pagos
export async function getPaymentStats(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_method, payment_date')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const stats = {
      total_payments: data.length,
      total_amount: data.reduce((sum, p) => sum + p.amount, 0),
      average_payment: data.length > 0 ? data.reduce((sum, p) => sum + p.amount, 0) / data.length : 0,
      payments_by_method: {
        cash: data.filter(p => p.payment_method === 'cash').length,
        card: data.filter(p => p.payment_method === 'card').length,
        transfer: data.filter(p => p.payment_method === 'transfer').length,
        check: data.filter(p => p.payment_method === 'check').length,
        other: data.filter(p => p.payment_method === 'other').length,
      },
    };

    return stats;
  }, 'Error al obtener estadísticas de pagos');
}

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

// Obtener total pagado por nota de venta
export async function getTotalPaidByInvoice(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoiceId);

    if (error) throw error;
    return data.reduce((sum, p) => sum + p.amount, 0);
  }, 'Error al obtener total pagado de la nota de venta');
}

// Validar monto de pago
export async function validatePaymentAmount(invoiceId: string, amount: number) {
  return executeWithErrorHandling(async () => {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;

    const totalPaid = await getTotalPaidByInvoice(invoiceId);
    const remainingAmount = invoice.total_amount - totalPaid;

    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (amount > remainingAmount) {
      throw new Error(`El monto no puede ser mayor al saldo pendiente ($${remainingAmount.toFixed(2)})`);
    }

    return true;
  }, 'Error al validar monto de pago');
}

// Recalcular totales de nota de venta
export async function recalculateInvoiceTotals(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    const items = await getInvoiceItems(invoiceId);
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const tax = subtotal * 0.16; // 16% IVA en México
    
    const { data: invoice } = await supabase
      .from('invoices')
      .select('discount, paid_amount')
      .eq('id', invoiceId)
      .single();
    
    const discount = invoice?.discount || 0;
    const paidAmount = invoice?.paid_amount || 0;
    const total_amount = subtotal + tax - discount;
    const balance = total_amount - paidAmount;

    const { error } = await supabase
      .from('invoices')
      .update({
        subtotal,
        tax,
        total_amount,
        balance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (error) throw error;
  }, 'Error al recalcular totales de nota de venta');
}

// Actualizar monto pagado de nota de venta
export async function updateInvoicePaidAmount(invoiceId: string, paidAmount: number) {
  return executeWithErrorHandling(async () => {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', invoiceId)
      .single();

    if (!invoice) throw new Error('Nota de venta no encontrada');

    const balance = invoice.total_amount - paidAmount;
    const status = balance <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

    const updateData: any = {
      paid_amount: paidAmount,
      balance,
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
        // work_order:work_orders(*) // No hay relación en el schema actual,
        // quotation:quotations(*) // No hay relación en el schema actual
      `)
      .single();

    if (error) throw error;
    return data as SalesInvoice;
  }, 'Error al actualizar monto pagado de nota de venta');
}

// Obtener métodos de pago disponibles
export async function getPaymentMethods() {
  return [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'check', label: 'Cheque' },
    { value: 'other', label: 'Otro' },
  ];
}

// =====================================================
// CONVERSIONES Y UTILIDADES AVANZADAS
// =====================================================

// Crear nota de venta desde orden de trabajo
export async function createInvoiceFromWorkOrder(organizationId: string, workOrderId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'createInvoiceFromWorkOrder', {
      workOrderId
    });
    
    logger.info('Creando nota de venta desde orden de trabajo', context);
    logger.businessEvent('invoice_created_from_work_order', 'invoice', 'new', context);

    return measureExecutionTime(async () => {
      // Obtener datos de la orden de trabajo
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (woError) {
        logSupabaseError('createInvoiceFromWorkOrder - getWorkOrder', woError, context);
        throw woError;
      }

      // Crear nota de venta
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organizationId,
          work_order_id: workOrderId,
          customer_id: workOrder.customer_id,
          vehicle_id: workOrder.vehicle_id,
          description: workOrder.description,
          notes: workOrder.diagnosis,
        })
        .select()
        .single();

      if (invError) {
        logSupabaseError('createInvoiceFromWorkOrder - createInvoice', invError, context);
        throw invError;
      }

      // Copiar items de la orden a la nota de venta
      if (workOrder.items && workOrder.items.length > 0) {
        const invoiceItems = workOrder.items.map((item: any) => ({
          invoice_id: invoice.id,
          item_type: item.item_type,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          logSupabaseError('createInvoiceFromWorkOrder - insertItems', itemsError, context);
          throw itemsError;
        }

        logger.info(`Items copiados: ${workOrder.items.length} items`, context);
      }

      // Recalcular totales
      await recalculateInvoiceTotals(invoice.id);

      logger.info(`Nota de venta creada exitosamente desde orden: ${invoice.id}`, context);
      return invoice as SalesInvoice;
    }, 'createInvoiceFromWorkOrder', context);
  }, 'Error al crear nota de venta desde orden de trabajo');
}

// Crear nota de venta desde cotización
export async function createInvoiceFromQuotation(organizationId: string, quotationId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'createInvoiceFromQuotation', {
      quotationId
    });
    
    logger.info('Creando nota de venta desde cotización', context);
    logger.businessEvent('invoice_created_from_quotation', 'invoice', 'new', context);

    return measureExecutionTime(async () => {
      // Obtener datos de la cotización
      const { data: quotation, error: quotError } = await supabase
        .from('quotations')
        .select(`
          *,
          items:quotation_items(*)
        `)
        .eq('id', quotationId)
        .eq('organization_id', organizationId)
        .single();

      if (quotError) {
        logSupabaseError('createInvoiceFromQuotation - getQuotation', quotError, context);
        throw quotError;
      }

      // Crear nota de venta
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organizationId,
          quotation_id: quotationId,
          work_order_id: quotation.work_order_id,
          customer_id: quotation.customer_id,
          vehicle_id: quotation.vehicle_id,
          description: quotation.description,
          notes: quotation.notes,
          discount: quotation.discount,
        })
        .select()
        .single();

      if (invError) {
        logSupabaseError('createInvoiceFromQuotation - createInvoice', invError, context);
        throw invError;
      }

      // Copiar items de la cotización a la nota de venta
      if (quotation.items && quotation.items.length > 0) {
        const invoiceItems = quotation.items.map((item: any) => ({
          invoice_id: invoice.id,
          item_type: item.item_type,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          logSupabaseError('createInvoiceFromQuotation - insertItems', itemsError, context);
          throw itemsError;
        }

        logger.info(`Items copiados: ${quotation.items.length} items`, context);
      }

      // Marcar cotización como convertida
      await updateQuotationStatus(quotationId, 'converted');

      // Recalcular totales
      await recalculateInvoiceTotals(invoice.id);

      logger.info(`Nota de venta creada exitosamente desde cotización: ${invoice.id}`, context);
      logger.businessEvent('quotation_converted', 'quotation', quotationId, context);
      return invoice as SalesInvoice;
    }, 'createInvoiceFromQuotation', context);
  }, 'Error al crear nota de venta desde cotización');
}

// Crear cotización desde orden de trabajo
export async function createQuotationFromWorkOrder(organizationId: string, workOrderId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'createQuotationFromWorkOrder', {
      workOrderId
    });
    
    logger.info('Creando cotización desde orden de trabajo', context);
    logger.businessEvent('quotation_created_from_work_order', 'quotation', 'new', context);

    return measureExecutionTime(async () => {
      // Obtener datos de la orden de trabajo
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (woError) {
        logSupabaseError('createQuotationFromWorkOrder - getWorkOrder', woError, context);
        throw woError;
      }

      // Calcular fecha de vencimiento (30 días)
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Crear cotización
      const { data: quotation, error: quotError } = await supabase
        .from('quotations')
        .insert({
          organization_id: organizationId,
          work_order_id: workOrderId,
          customer_id: workOrder.customer_id,
          vehicle_id: workOrder.vehicle_id,
          description: workOrder.description,
          notes: workOrder.diagnosis,
          valid_until: validUntil,
        })
        .select()
        .single();

      if (quotError) {
        logSupabaseError('createQuotationFromWorkOrder - createQuotation', quotError, context);
        throw quotError;
      }

      // Copiar items de la orden a la cotización
      if (workOrder.items && workOrder.items.length > 0) {
        const quotationItems = workOrder.items.map((item: any) => ({
          quotation_id: quotation.id,
          item_type: item.item_type,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(quotationItems);

        if (itemsError) {
          logSupabaseError('createQuotationFromWorkOrder - insertItems', itemsError, context);
          throw itemsError;
        }

        logger.info(`Items copiados: ${workOrder.items.length} items`, context);
      }

      // Recalcular totales de la cotización
      await recalculateQuotationTotals(organizationId, quotation.id);

      logger.info(`Cotización creada exitosamente desde orden: ${quotation.id}`, context);
      return quotation as Quotation;
    }, 'createQuotationFromWorkOrder', context);
  }, 'Error al crear cotización desde orden de trabajo');
}

// Recalcular totales de cotización
export async function recalculateQuotationTotals(organizationId: string, quotationId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'recalculateQuotationTotals', {
      quotationId
    });
    
    logger.info('Recalculando totales de cotización', context);

    return measureExecutionTime(async () => {
      // Obtener items y calcular totales
      const items = await getQuotationItems(quotationId);
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.16; // 16% IVA en México
      
      // Obtener descuento actual
      const { data: quotation } = await supabase
        .from('quotations')
        .select('discount')
        .eq('id', quotationId)
        .single();
      
      const discount = quotation?.discount || 0;
      const total_amount = subtotal + tax - discount;

      // Actualizar cotización
      const { error } = await supabase
        .from('quotations')
        .update({
          subtotal,
          tax,
          total_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quotationId);

      if (error) {
        logSupabaseError('recalculateQuotationTotals', error, context);
        throw error;
      }

      logger.info(`Totales recalculados: Subtotal: $${subtotal}, Tax: $${tax}, Total: $${total_amount}`, context);
    }, 'recalculateQuotationTotals', context);
  }, 'Error al recalcular totales de cotización');
}

// Obtener cotizaciones vencidas
export async function getExpiredQuotations(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'getExpiredQuotations');
    logger.info('Obteniendo cotizaciones vencidas', context);

    return measureExecutionTime(async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .lt('valid_until', today)
        .order('valid_until', { ascending: true });

      if (error) {
        logSupabaseError('getExpiredQuotations', error, context);
        throw error;
      }

      logger.info(`Cotizaciones vencidas encontradas: ${data?.length || 0}`, context);
      return data as Quotation[];
    }, 'getExpiredQuotations', context);
  }, 'Error al obtener cotizaciones vencidas');
}

// Marcar cotizaciones vencidas
export async function markExpiredQuotations(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'markExpiredQuotations');
    logger.info('Marcando cotizaciones vencidas', context);

    return measureExecutionTime(async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('quotations')
        .update({ status: 'expired' })
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .lt('valid_until', today)
        .select();

      if (error) {
        logSupabaseError('markExpiredQuotations', error, context);
        throw error;
      }

      logger.info(`Cotizaciones marcadas como vencidas: ${data?.length || 0}`, context);
      logger.businessEvent('quotations_expired', 'quotation', 'batch', context);
      return data as Quotation[];
    }, 'markExpiredQuotations', context);
  }, 'Error al marcar cotizaciones vencidas');
}

// Obtener estadísticas de cotizaciones
export async function getQuotationStats(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const context = createLogContext(organizationId, undefined, 'quotations-invoices', 'getQuotationStats');
    logger.info('Obteniendo estadísticas de cotizaciones', context);

    return measureExecutionTime(async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('status, total_amount, created_at, converted_at')
        .eq('organization_id', organizationId);

      if (error) {
        logSupabaseError('getQuotationStats', error, context);
        throw error;
      }

      const stats = {
        total: data.length,
        pending: data.filter(q => q.status === 'pending').length,
        approved: data.filter(q => q.status === 'approved').length,
        rejected: data.filter(q => q.status === 'rejected').length,
        converted: data.filter(q => q.status === 'converted').length,
        expired: data.filter(q => q.status === 'expired').length,
        total_value: data.reduce((sum, q) => sum + q.total_amount, 0),
        conversion_rate: data.length > 0 ? (data.filter(q => q.status === 'converted').length / data.length) * 100 : 0,
        average_value: data.length > 0 ? data.reduce((sum, q) => sum + q.total_amount, 0) / data.length : 0,
      };

      logger.info(`Estadísticas calculadas: ${stats.total} cotizaciones, ${stats.conversion_rate.toFixed(2)}% conversión`, context);
      return stats;
    }, 'getQuotationStats', context);
  }, 'Error al obtener estadísticas de cotizaciones');
}
