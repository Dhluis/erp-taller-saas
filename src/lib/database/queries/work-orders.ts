import { getSupabaseClient } from '../../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-simple';

type GenericSupabaseClient = SupabaseClient<Database>;

function getClient(): GenericSupabaseClient {
  return getSupabaseClient();
}

// ✅ ACTUALIZACIÓN: Filtro workshop_id removido - mostrar todas las órdenes
// ✅ Última actualización: Mejoras en logs y refresh de órdenes

// Verificar configuración de Supabase
console.log('🔧 Configuración de Supabase:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'No configurado',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado'
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'diagnosed'
  | 'approved'
  | 'in_repair'
  | 'waiting_parts'
  | 'completed'
  | 'delivered';

export interface OrderItem {
  id: string;
  work_order_id: string;
  item_type: 'service' | 'part' | 'labor';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  status: WorkOrderStatus;
  description: string;
  diagnosis?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  assigned_to?: string;
  estimated_completion?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  customer?: {
    id: string;
    name: string;
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
  order_items?: OrderItem[];
}

export interface CreateWorkOrderData {
  customer_id: string;
  vehicle_id: string;
  description: string;
  diagnosis?: string;
  assigned_to?: string;
  estimated_completion?: string;
  total_amount?: number;
  status?: WorkOrderStatus;
  workshop_id?: string;  // ✅ Agregar workshop_id opcional
  organization_id?: string;  // ✅ Agregar organization_id opcional
}

export interface UpdateWorkOrderData extends Partial<CreateWorkOrderData> {
  status?: WorkOrderStatus;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total_amount?: number;
}

export interface CreateOrderItemData {
  work_order_id: string;
  item_type: 'service' | 'part' | 'labor';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

const ORGANIZATION_ID = '042ab6bd-8979-4166-882a-c244b5e51e51';

interface WorkOrderFilters {
  status?: WorkOrderStatus;
}

// ============================================================================
// WORK ORDERS - CRUD
// ============================================================================

export async function getAllWorkOrders(organizationId?: string, filters?: WorkOrderFilters) {
  const supabase = getClient();

  const finalOrgId = organizationId || ORGANIZATION_ID;
  
  console.log('🔍 [getAllWorkOrders] Buscando órdenes con organization_id:', finalOrgId);
  console.log('🔍 [getAllWorkOrders] organizationId recibido:', organizationId);
  console.log('🔍 [getAllWorkOrders] ORGANIZATION_ID fallback:', ORGANIZATION_ID);

  let query = supabase
    .from('work_orders')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .eq('organization_id', finalOrgId)
    // ✅ REMOVIDO: .not('workshop_id', 'is', null) - Mostrar todas las órdenes, con o sin workshop
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [getAllWorkOrders] Error fetching work orders:', error);
    throw error;
  }

  console.log('✅ [getAllWorkOrders] Órdenes encontradas:', data?.length || 0);
  
  // Verificar si hay órdenes con diferentes organization_id
  if (data && data.length > 0) {
    const orgIds = [...new Set(data.map((o: any) => o.organization_id))];
    console.log('📋 [getAllWorkOrders] Organization IDs encontrados:', orgIds);
    console.log('📋 [getAllWorkOrders] Primera orden:', {
      id: data[0].id,
      organization_id: (data[0] as any).organization_id,
      status: (data[0] as any).status,
      created_at: (data[0] as any).created_at
    });
    
    // Buscar órdenes recientes (últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recentOrders = data.filter((o: any) => {
      const createdAt = new Date(o.created_at || o.entry_date);
      return createdAt >= new Date(fiveMinutesAgo);
    });
    console.log('🕐 [getAllWorkOrders] Órdenes creadas en últimos 5 minutos:', recentOrders.length);
    if (recentOrders.length > 0) {
      console.log('📋 [getAllWorkOrders] Órdenes recientes:', recentOrders.map((o: any) => ({
        id: o.id,
        organization_id: o.organization_id,
        status: o.status,
        created_at: o.created_at
      })));
    }
  }
  
  // Si no hay datos pero debería haber, intentar sin filtro de organization_id para debug
  if (!data || data.length === 0) {
    console.warn('⚠️ [getAllWorkOrders] No se encontraron órdenes. Verificando sin filtro de organization_id...');
    const { data: allData, error: allError } = await supabase
      .from('work_orders')
      .select('id, organization_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!allError && allData) {
      console.log('🔍 [getAllWorkOrders] Últimas 5 órdenes en DB (sin filtro):', allData);
    }
  }
  
  return data as WorkOrder[];
}

export async function getWorkOrderById(id: string) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .eq('id', id)
    .eq('organization_id', ORGANIZATION_ID)
    .gte('created_at', '1970-01-01')  // Forzar bypass de cache
    .single()
    // NO usar cache para obtener datos actualizados de notas
    .abortSignal(new AbortController().signal);

  if (error) throw error;
  return data as WorkOrder;
}

export async function createWorkOrder(orderData: CreateWorkOrderData) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('work_orders')
    .insert([
      {
        ...orderData,
        organization_id: orderData.organization_id || ORGANIZATION_ID,
        workshop_id: orderData.workshop_id || null,  // ✅ Incluir workshop_id si viene
        status: orderData.status || 'pending',
        subtotal: 0,
        tax: 0,
        discount: 0,
        total_amount: orderData.total_amount || 0,
      },
    ])
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .single();

  if (error) throw error;
  return data as WorkOrder;
}

export async function updateWorkOrder(id: string, orderData: UpdateWorkOrderData) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('work_orders')
    .update({
      ...orderData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', ORGANIZATION_ID)
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .single();

  if (error) throw error;
  return data as WorkOrder;
}

export async function deleteWorkOrder(id: string) {
  const supabase = getClient();

  console.log('🔧 deleteWorkOrder (DB) - Iniciando eliminación para ID:', id)
  console.log('🔧 deleteWorkOrder (DB) - Organization ID:', ORGANIZATION_ID)
  
  // Verificar si la tabla work_orders existe y tiene datos
  console.log('🔍 Verificando tabla work_orders...')
  const { data: allOrders, error: tableError } = await supabase
    .from('work_orders')
    .select('id, organization_id')
    .limit(5)
  
  console.log('🔍 Verificación de tabla:', { allOrders, tableError })
  
  if (tableError) {
    console.error('❌ Error al acceder a la tabla work_orders:', tableError)
    throw new Error(`La tabla work_orders no existe o no es accesible: ${tableError.message}`)
  }
  
  console.log('✅ Tabla work_orders accesible, órdenes encontradas:', allOrders?.length || 0)
  
  // Buscar la orden específica
  console.log('🔍 Buscando orden específica...')
  console.log('🔍 ID a buscar:', id)
  console.log('🔍 Tipo de ID:', typeof id)
  console.log('🔍 Longitud del ID:', id.length)
  
  type ExistingOrderRecord = { organization_id?: string } | null;
  let existingOrder: ExistingOrderRecord = null;
  
  try {
    console.log('🔍 Ejecutando consulta a Supabase...')
    const query = supabase
      .from('work_orders')
      .select('id, status, organization_id')
      .eq('id', id)
      .single()
    
    console.log('🔍 Query construida, ejecutando...')
    const result = await query
    
    console.log('🔍 Resultado completo:', result)
    console.log('🔍 Data:', result.data)
    console.log('🔍 Error:', result.error)
    console.log('🔍 Status:', result.status)
    console.log('🔍 StatusText:', result.statusText)
    
    const { data: orderData, error: fetchError } = result
    
    console.log('🔍 Resultado de búsqueda:', { orderData, fetchError })
    console.log('🔍 Tipo de fetchError:', typeof fetchError)
    console.log('🔍 fetchError es null?:', fetchError === null)
    console.log('🔍 fetchError es undefined?:', fetchError === undefined)
    console.log('🔍 fetchError es objeto vacío?:', JSON.stringify(fetchError) === '{}')
    
    if (fetchError) {
      console.error('❌ Error al buscar orden:', fetchError)
      console.error('❌ Código del error:', fetchError.code)
      console.error('❌ Mensaje del error:', fetchError.message)
      console.error('❌ Detalles del error:', fetchError.details)
      console.error('❌ Hint del error:', fetchError.hint)
      
      // Si el error es que no se encontró la orden, es normal
      if (fetchError.code === 'PGRST116') {
        throw new Error(`Orden no encontrada con ID: ${id}`)
      }
      
      throw new Error(`Error al buscar orden: ${fetchError.message}`)
    }
    
    existingOrder = (orderData as ExistingOrderRecord) ?? null;
    console.log('✅ Orden encontrada:', existingOrder)
    
    if ((existingOrder?.organization_id ?? null) !== ORGANIZATION_ID) {
      console.error('❌ La orden no pertenece a la organización correcta')
      console.error('❌ Organization ID de la orden:', existingOrder?.organization_id)
      console.error('❌ Organization ID esperado:', ORGANIZATION_ID)
      throw new Error(`La orden no pertenece a la organización correcta`)
    }
    
  } catch (error) {
    console.error('❌ Error en try-catch de búsqueda:', error)
    console.error('❌ Tipo de error:', typeof error)
    console.error('❌ Constructor del error:', error?.constructor?.name)
    throw error
  }
  
  console.log('🔧 Procediendo a eliminar la orden...')
  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', id)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) {
    console.error('❌ Error al eliminar orden en BD:', error)
    throw new Error(`Failed to delete work order: ${error.message}`)
  }
  
  console.log('✅ Orden eliminada exitosamente en BD')
  return { success: true };
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
  return updateWorkOrder(id, { status });
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================

export async function searchWorkOrders(searchTerm: string) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .eq('organization_id', ORGANIZATION_ID)
    .or(`description.ilike.%${searchTerm}%,diagnosis.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WorkOrder[];
}

export async function getWorkOrdersByCustomer(customerId: string) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .eq('customer_id', customerId)
    .eq('organization_id', ORGANIZATION_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WorkOrder[];
}

export async function getWorkOrdersByVehicle(vehicleId: string) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles(
        id,
        brand,
        model,
        year,
        license_plate
      ),
      order_items(*)
    `)
    .eq('vehicle_id', vehicleId)
    .eq('organization_id', ORGANIZATION_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WorkOrder[];
}

// ============================================================================
// ORDER ITEMS - CRUD
// ============================================================================

export async function getOrderItems(workOrderId: string) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as OrderItem[];
}

export async function createOrderItem(itemData: CreateOrderItemData) {
  const supabase = getClient();

  // Calcular total_price
  const total_price = itemData.quantity * itemData.unit_price;

  const { data, error } = await supabase
    .from('order_items')
    .insert([
      {
        ...itemData,
        total_price,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Recalcular totales de la orden
  await recalculateWorkOrderTotals(itemData.work_order_id);

  return data as OrderItem;
}

export async function updateOrderItem(
  id: string,
  itemData: Partial<CreateOrderItemData>
) {
  const supabase = getClient();

  // Si se actualiza quantity o unit_price, recalcular total_price
  const updateData: Partial<CreateOrderItemData> & { total_price?: number } = { ...itemData };
  
  if (itemData.quantity !== undefined || itemData.unit_price !== undefined) {
    const { data: currentItem } = await supabase
      .from('order_items')
      .select('quantity, unit_price, work_order_id')
      .eq('id', id)
      .single();

    if (currentItem) {
      const quantity = itemData.quantity ?? currentItem.quantity;
      const unit_price = itemData.unit_price ?? currentItem.unit_price;
      updateData.total_price = quantity * unit_price;

      // Actualizar item
      const { data, error } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Recalcular totales de la orden
      await recalculateWorkOrderTotals(currentItem.work_order_id);

      return data as OrderItem;
    }
  }

  const { data, error } = await supabase
    .from('order_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as OrderItem;
}

export async function deleteOrderItem(id: string) {
  const supabase = getClient();

  // Obtener work_order_id antes de eliminar
  const { data: item } = await supabase
    .from('order_items')
    .select('work_order_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Recalcular totales de la orden
  if (item) {
    await recalculateWorkOrderTotals(item.work_order_id);
  }

  return { success: true };
}

// ============================================================================
// UTILITIES
// ============================================================================

async function recalculateWorkOrderTotals(workOrderId: string) {
  const supabase = getClient();

  // Obtener todos los items de la orden
  const items = await getOrderItems(workOrderId);

  // Calcular subtotal
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  // Calcular tax (16% IVA en México)
  const tax = subtotal * 0.16;

  // Obtener descuento actual
  const { data: order } = await supabase
    .from('work_orders')
    .select('discount')
    .eq('id', workOrderId)
    .single();

  const discount = order?.discount || 0;

  // Calcular total
  const total_amount = subtotal + tax - discount;

  // Actualizar orden
  await supabase
    .from('work_orders')
    .update({
      subtotal,
      tax,
      total_amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId);
}

export async function updateWorkOrderDiscount(workOrderId: string, discount: number) {
  const supabase = getClient();

  // Actualizar descuento
  await supabase
    .from('work_orders')
    .update({ discount })
    .eq('id', workOrderId);

  // Recalcular totales
  await recalculateWorkOrderTotals(workOrderId);

  // Obtener orden actualizada
  return getWorkOrderById(workOrderId);
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getWorkOrderStats() {
  const supabase = getClient();

  const { data: orders, error } = await supabase
    .from('work_orders')
    .select('status, total_amount')
    .eq('organization_id', ORGANIZATION_ID);

  if (error) throw error;

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    diagnosed: orders.filter((o) => o.status === 'diagnosed').length,
    approved: orders.filter((o) => o.status === 'approved').length,
    in_repair: orders.filter((o) => o.status === 'in_repair').length,
    waiting_parts: orders.filter((o) => o.status === 'waiting_parts').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    total_revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  return stats;
}

export interface WorkOrderStats {
  total: number;
  pending: number;
  in_progress: number;
  diagnosed: number;
  approved: number;
  in_repair: number;
  waiting_parts: number;
  completed: number;
  delivered: number;
  total_revenue: number;
}

// TODO: Implementar cuando se necesite
export async function getOrderItemsByWorkOrder(workOrderId: string) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      services (
        id,
        name,
        description,
        unit_price
      )
    `)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching order items:', error)
    throw error
  }
  
  return data || []
}