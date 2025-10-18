import { createServerClient } from '@/lib/supabase/server';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'cancelled';

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

export interface SalesInvoice {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  quotation_id: string | null;
  customer_id: string;
  vehicle_id: string;
  invoice_number: string;
  status: InvoiceStatus;
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
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    license_plate: string;
  };
  work_order?: {
    id: string;
    description: string;
    status: string;
  };
  quotation?: {
    id: string;
    quotation_number: string;
    status: string;
  };
  items?: InvoiceItem[];
}

export interface CreateSalesInvoiceData {
  work_order_id?: string;
  quotation_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  due_date?: string;
}

export interface UpdateSalesInvoiceData {
  work_order_id?: string;
  quotation_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  description?: string;
  notes?: string;
  due_date?: string;
  status?: InvoiceStatus;
}

export interface CreateInvoiceItemData {
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface UpdateInvoiceItemData {
  item_type?: 'service' | 'part';
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
}

export interface InvoiceStats {
  total: number;
  pending: number;
  paid: number;
  partial: number;
  cancelled: number;
  total_value: number;
  total_paid: number;
  total_balance: number;
  average_value: number;
}

// =====================================================
// FUNCIONES DE NOTAS DE VENTA
// =====================================================

export async function getAllSalesInvoices(
  organizationId: string = 'default',
  status?: InvoiceStatus
): Promise<SalesInvoice[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sales invoices:', error);
    throw new Error('Error al obtener notas de venta');
  }

  return data || [];
}

export async function getSalesInvoiceById(id: string): Promise<SalesInvoice | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status),
      items:invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching sales invoice:', error);
    throw new Error('Error al obtener nota de venta');
  }

  return data;
}

export async function createSalesInvoice(data: CreateSalesInvoiceData): Promise<SalesInvoice> {
  const supabase = createServerClient();
  
  const invoiceData = {
    organization_id: 'default',
    work_order_id: data.work_order_id || null,
    quotation_id: data.quotation_id || null,
    customer_id: data.customer_id,
    vehicle_id: data.vehicle_id,
    description: data.description,
    notes: data.notes || null,
    due_date: data.due_date || null,
    status: 'pending' as InvoiceStatus,
    subtotal: 0,
    tax: 0,
    discount: 0,
    total_amount: 0,
    paid_amount: 0,
  };

  const { data: invoice, error } = await supabase
    .from('sales_invoices')
    .insert(invoiceData as any)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .single();

  if (error) {
    console.error('Error creating sales invoice:', error);
    throw new Error('Error al crear nota de venta');
  }

  return invoice;
}

export async function updateSalesInvoice(
  id: string,
  data: UpdateSalesInvoiceData
): Promise<SalesInvoice> {
  const supabase = createServerClient();
  
  const { data: invoice, error } = await supabase
    .from('sales_invoices')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .single();

  if (error) {
    console.error('Error updating sales invoice:', error);
    throw new Error('Error al actualizar nota de venta');
  }

  return invoice;
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('sales_invoices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting sales invoice:', error);
    throw new Error('Error al eliminar nota de venta');
  }
}

export async function updateSalesInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<SalesInvoice> {
  const supabase = createServerClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  const { data: invoice, error } = await supabase
    .from('sales_invoices')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .single();

  if (error) {
    console.error('Error updating sales invoice status:', error);
    throw new Error('Error al actualizar estado de nota de venta');
  }

  return invoice;
}

export async function searchSalesInvoices(
  searchTerm: string,
  organizationId: string = 'default'
): Promise<SalesInvoice[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .eq('organization_id', organizationId)
    .or(`invoice_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,customer.first_name.ilike.%${searchTerm}%,customer.last_name.ilike.%${searchTerm}%,vehicle.brand.ilike.%${searchTerm}%,vehicle.model.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching sales invoices:', error);
    throw new Error('Error al buscar notas de venta');
  }

  return data || [];
}

export async function getSalesInvoicesByCustomer(
  customerId: string,
  organizationId: string = 'default'
): Promise<SalesInvoice[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales invoices by customer:', error);
    throw new Error('Error al obtener notas de venta del cliente');
  }

  return data || [];
}

export async function getSalesInvoicesByWorkOrder(
  workOrderId: string,
  organizationId: string = 'default'
): Promise<SalesInvoice[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .eq('organization_id', organizationId)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales invoices by work order:', error);
    throw new Error('Error al obtener notas de venta de la orden de trabajo');
  }

  return data || [];
}

export async function getSalesInvoiceStats(
  organizationId: string = 'default'
): Promise<InvoiceStats> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('sales_invoices')
    .select('status, total_amount, paid_amount, balance')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching sales invoice stats:', error);
    throw new Error('Error al obtener estadísticas de notas de venta');
  }

  const stats = data?.reduce(
    (acc, invoice) => {
      acc.total++;
      acc[invoice.status as InvoiceStatus]++;
      acc.total_value += invoice.total_amount;
      acc.total_paid += invoice.paid_amount;
      acc.total_balance += invoice.balance;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      paid: 0,
      partial: 0,
      cancelled: 0,
      total_value: 0,
      total_paid: 0,
      total_balance: 0,
      average_value: 0,
    } as InvoiceStats
  ) || {
    total: 0,
    pending: 0,
    paid: 0,
    partial: 0,
    cancelled: 0,
    total_value: 0,
    total_paid: 0,
    total_balance: 0,
    average_value: 0,
  };

  stats.average_value = stats.total > 0 ? stats.total_value / stats.total : 0;

  return stats;
}

// =====================================================
// FUNCIONES DE ITEMS DE NOTA DE VENTA
// =====================================================

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching invoice items:', error);
    throw new Error('Error al obtener items de nota de venta');
  }

  return data || [];
}

export async function addInvoiceItem(
  invoiceId: string,
  data: CreateInvoiceItemData
): Promise<InvoiceItem> {
  const supabase = createServerClient();
  
  const itemData = {
    invoice_id: invoiceId,
    item_type: data.item_type,
    item_name: data.item_name,
    description: data.description || null,
    quantity: data.quantity,
    unit_price: data.unit_price,
  };

  const { data: item, error } = await supabase
    .from('invoice_items')
    .insert(itemData as any)
    .select('*')
    .single();

  if (error) {
    console.error('Error adding invoice item:', error);
    throw new Error('Error al agregar item a nota de venta');
  }

  return item;
}

export async function updateInvoiceItem(
  invoiceId: string,
  itemId: string,
  data: UpdateInvoiceItemData
): Promise<InvoiceItem> {
  const supabase = createServerClient();
  
  const { data: item, error } = await supabase
    .from('invoice_items')
    .update(data as any)
    .eq('id', itemId)
    .eq('invoice_id', invoiceId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating invoice item:', error);
    throw new Error('Error al actualizar item de nota de venta');
  }

  return item;
}

export async function deleteInvoiceItem(
  invoiceId: string,
  itemId: string
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('invoice_items')
    .delete()
    .eq('id', itemId)
    .eq('invoice_id', invoiceId);

  if (error) {
    console.error('Error deleting invoice item:', error);
    throw new Error('Error al eliminar item de nota de venta');
  }
}

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

export async function recalculateSalesInvoiceTotals(invoiceId: string): Promise<void> {
  const supabase = createServerClient();
  
  // Obtener items y calcular totales
  const items = await getInvoiceItems(invoiceId);
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const tax = subtotal * 0.16; // 16% IVA en México
  
  // Obtener descuento y monto pagado actual
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('discount, paid_amount')
    .eq('id', invoiceId)
    .single();
  
  const discount = invoice?.discount || 0;
  const paidAmount = invoice?.paid_amount || 0;
  const total_amount = subtotal + tax - discount;
  const balance = total_amount - paidAmount;

  // Actualizar nota de venta
  await supabase
    .from('sales_invoices')
    .update({
      subtotal,
      tax,
      total_amount,
      balance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);
}

export async function updateSalesInvoiceDiscount(
  invoiceId: string,
  discount: number
): Promise<SalesInvoice> {
  const supabase = createServerClient();
  
  // Obtener totales actuales
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('subtotal, tax, paid_amount')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    throw new Error('Nota de venta no encontrada');
  }

  const total_amount = invoice.subtotal + invoice.tax - discount;
  const balance = total_amount - invoice.paid_amount;

  const { data: updatedInvoice, error } = await supabase
    .from('sales_invoices')
    .update({
      discount,
      total_amount,
      balance,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', invoiceId)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .single();

  if (error) {
    console.error('Error updating sales invoice discount:', error);
    throw new Error('Error al actualizar descuento de nota de venta');
  }

  return updatedInvoice;
}

export async function updateSalesInvoicePaidAmount(
  invoiceId: string,
  paidAmount: number
): Promise<SalesInvoice> {
  const supabase = createServerClient();
  
  // Obtener total actual
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    throw new Error('Nota de venta no encontrada');
  }

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

  const { data: updatedInvoice, error } = await supabase
    .from('sales_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      quotation:quotations(id, quotation_number, status)
    `)
    .single();

  if (error) {
    console.error('Error updating sales invoice paid amount:', error);
    throw new Error('Error al actualizar monto pagado de nota de venta');
  }

  return updatedInvoice;
}

