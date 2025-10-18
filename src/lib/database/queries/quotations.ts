import { createServerClient } from '@/lib/supabase/server';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type QuotationStatus = 'pending' | 'approved' | 'rejected' | 'converted' | 'expired';

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

export interface Quotation {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  customer_id: string;
  vehicle_id: string;
  quotation_number: string;
  status: QuotationStatus;
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
  items?: QuotationItem[];
}

export interface CreateQuotationData {
  work_order_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  valid_until?: string;
}

export interface UpdateQuotationData {
  work_order_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  description?: string;
  notes?: string;
  valid_until?: string;
  status?: QuotationStatus;
}

export interface CreateQuotationItemData {
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface UpdateQuotationItemData {
  item_type?: 'service' | 'part';
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
}

export interface QuotationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  converted: number;
  expired: number;
  total_value: number;
  average_value: number;
}

// =====================================================
// FUNCIONES DE COTIZACIONES
// =====================================================

export async function getAllQuotations(
  organizationId: string = 'default',
  status?: QuotationStatus
): Promise<Quotation[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching quotations:', error);
    throw new Error('Error al obtener cotizaciones');
  }

  return data || [];
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  const supabase = createServerClient();
  
  const { data, error } = await query
    .from('quotations')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status),
      items:quotation_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching quotation:', error);
    throw new Error('Error al obtener cotización');
  }

  return data;
}

export async function createQuotation(data: CreateQuotationData): Promise<Quotation> {
  const supabase = createServerClient();
  
  const quotationData = {
    organization_id: 'default',
    work_order_id: data.work_order_id || null,
    customer_id: data.customer_id,
    vehicle_id: data.vehicle_id,
    description: data.description,
    notes: data.notes || null,
    valid_until: data.valid_until || null,
    status: 'pending' as QuotationStatus,
    subtotal: 0,
    tax: 0,
    discount: 0,
    total_amount: 0,
  };

  const { data: quotation, error } = await supabase
    .from('quotations')
    .insert(quotationData as any)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .single();

  if (error) {
    console.error('Error creating quotation:', error);
    throw new Error('Error al crear cotización');
  }

  return quotation;
}

export async function updateQuotation(
  id: string,
  data: UpdateQuotationData
): Promise<Quotation> {
  const supabase = createServerClient();
  
  const { data: quotation, error } = await supabase
    .from('quotations')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .single();

  if (error) {
    console.error('Error updating quotation:', error);
    throw new Error('Error al actualizar cotización');
  }

  return quotation;
}

export async function deleteQuotation(id: string): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting quotation:', error);
    throw new Error('Error al eliminar cotización');
  }
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus
): Promise<Quotation> {
  const supabase = createServerClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'converted') {
    updateData.converted_at = new Date().toISOString();
  }

  const { data: quotation, error } = await supabase
    .from('quotations')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .single();

  if (error) {
    console.error('Error updating quotation status:', error);
    throw new Error('Error al actualizar estado de cotización');
  }

  return quotation;
}

export async function searchQuotations(
  searchTerm: string,
  organizationId: string = 'default'
): Promise<Quotation[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .eq('organization_id', organizationId)
    .or(`quotation_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,customer.first_name.ilike.%${searchTerm}%,customer.last_name.ilike.%${searchTerm}%,vehicle.brand.ilike.%${searchTerm}%,vehicle.model.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching quotations:', error);
    throw new Error('Error al buscar cotizaciones');
  }

  return data || [];
}

export async function getQuotationsByCustomer(
  customerId: string,
  organizationId: string = 'default'
): Promise<Quotation[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotations by customer:', error);
    throw new Error('Error al obtener cotizaciones del cliente');
  }

  return data || [];
}

export async function getQuotationsByWorkOrder(
  workOrderId: string,
  organizationId: string = 'default'
): Promise<Quotation[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .eq('organization_id', organizationId)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotations by work order:', error);
    throw new Error('Error al obtener cotizaciones de la orden de trabajo');
  }

  return data || [];
}

export async function getQuotationStats(
  organizationId: string = 'default'
): Promise<QuotationStats> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('quotations')
    .select('status, total_amount')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching quotation stats:', error);
    throw new Error('Error al obtener estadísticas de cotizaciones');
  }

  const stats = data?.reduce(
    (acc, quotation) => {
      acc.total++;
      acc[quotation.status as QuotationStatus]++;
      acc.total_value += quotation.total_amount;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
      expired: 0,
      total_value: 0,
      average_value: 0,
    } as QuotationStats
  ) || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
    expired: 0,
    total_value: 0,
    average_value: 0,
  };

  stats.average_value = stats.total > 0 ? stats.total_value / stats.total : 0;

  return stats;
}

// =====================================================
// FUNCIONES DE ITEMS DE COTIZACIÓN
// =====================================================

export async function getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quotation items:', error);
    throw new Error('Error al obtener items de cotización');
  }

  return data || [];
}

export async function addQuotationItem(
  quotationId: string,
  data: CreateQuotationItemData
): Promise<QuotationItem> {
  const supabase = createServerClient();
  
  const itemData = {
    quotation_id: quotationId,
    item_type: data.item_type,
    item_name: data.item_name,
    description: data.description || null,
    quantity: data.quantity,
    unit_price: data.unit_price,
  };

  const { data: item, error } = await supabase
    .from('quotation_items')
    .insert(itemData as any)
    .select('*')
    .single();

  if (error) {
    console.error('Error adding quotation item:', error);
    throw new Error('Error al agregar item a cotización');
  }

  return item;
}

export async function updateQuotationItem(
  quotationId: string,
  itemId: string,
  data: UpdateQuotationItemData
): Promise<QuotationItem> {
  const supabase = createServerClient();
  
  const { data: item, error } = await supabase
    .from('quotation_items')
    .update(data as any)
    .eq('id', itemId)
    .eq('quotation_id', quotationId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating quotation item:', error);
    throw new Error('Error al actualizar item de cotización');
  }

  return item;
}

export async function deleteQuotationItem(
  quotationId: string,
  itemId: string
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('quotation_items')
    .delete()
    .eq('id', itemId)
    .eq('quotation_id', quotationId);

  if (error) {
    console.error('Error deleting quotation item:', error);
    throw new Error('Error al eliminar item de cotización');
  }
}

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

export async function recalculateQuotationTotals(quotationId: string): Promise<void> {
  const supabase = createServerClient();
  
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
  await supabase
    .from('quotations')
    .update({
      subtotal,
      tax,
      total_amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quotationId);
}

export async function updateQuotationDiscount(
  quotationId: string,
  discount: number
): Promise<Quotation> {
  const supabase = createServerClient();
  
  // Obtener totales actuales
  const { data: quotation } = await supabase
    .from('quotations')
    .select('subtotal, tax')
    .eq('id', quotationId)
    .single();

  if (!quotation) {
    throw new Error('Cotización no encontrada');
  }

  const total_amount = quotation.subtotal + quotation.tax - discount;

  const { data: updatedQuotation, error } = await supabase
    .from('quotations')
    .update({
      discount,
      total_amount,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', quotationId)
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      vehicle:vehicles(id, brand, model, year, license_plate),
      work_order:work_orders(id, description, status)
    `)
    .single();

  if (error) {
    console.error('Error updating quotation discount:', error);
    throw new Error('Error al actualizar descuento de cotización');
  }

  return updatedQuotation;
}