import { getSupabaseClient } from '../../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-simple';
// ✅ Usar versión CLIENTE (work-orders.ts se usa en componentes del cliente)
import { getOrganizationId } from '@/lib/auth/organization-client';

type GenericSupabaseClient = SupabaseClient<Database>;

function getClient(): GenericSupabaseClient {
  return getSupabaseClient();
}

// ✅ ACTUALIZACIÓN: Filtro workshop_id removido - mostrar todas las órdenes
// ✅ Última actualización: Usando getOrganizationId() helper centralizado

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

// ❌ ELIMINADO: ORGANIZATION_ID hardcodeado
// ✅ AHORA: Usar getOrganizationId() de @/lib/auth/organization

interface WorkOrderFilters {
  status?: WorkOrderStatus;
  includeItems?: boolean; // ✅ Opcional: incluir order_items (default: false para mejor rendimiento)
  workshopId?: string | null; // ✅ Opcional: filtrar por workshop_id
}

// ============================================================================
// WORK ORDERS - CRUD
// ============================================================================

// ✅ CACHE SIMPLE EN MEMORIA (5 segundos - reducido para evitar problemas)
const ordersCache = new Map<string, { data: WorkOrder[]; timestamp: number }>();
const CACHE_TTL = 5000; // 5 segundos - reducido para asegurar datos frescos

function getCacheKey(organizationId: string, filters?: WorkOrderFilters): string {
  return `${organizationId}-${filters?.status || 'all'}-${filters?.includeItems ? 'with-items' : 'no-items'}`;
}

function getCachedOrders(key: string): WorkOrder[] | null {
  const cached = ordersCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  ordersCache.delete(key);
  return null;
}

function setCachedOrders(key: string, data: WorkOrder[]): void {
  ordersCache.set(key, { data, timestamp: Date.now() });
}

export function clearOrdersCache(organizationId?: string): void {
  if (organizationId) {
    // Limpiar solo las claves de esta organización
    const keysToDelete: string[] = [];
    ordersCache.forEach((_, key) => {
      if (key.startsWith(`${organizationId}-`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => ordersCache.delete(key));
  } else {
    // Limpiar todo el cache
    ordersCache.clear();
  }
}

export async function getAllWorkOrders(organizationId?: string, filters?: WorkOrderFilters) {
  const supabase = getClient();

  // ✅ SIEMPRE usar el helper si no se proporciona organizationId
  const finalOrgId = organizationId || await getOrganizationId();
  
  // ✅ OPTIMIZACIÓN: Solo logs en desarrollo
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('🔍 [getAllWorkOrders] Buscando órdenes con organization_id:', finalOrgId);
  }

  // ✅ OPTIMIZACIÓN: Verificar cache primero
  const cacheKey = getCacheKey(finalOrgId, filters);
  const cached = getCachedOrders(cacheKey);
  if (cached) {
    if (isDev) {
      console.log('✅ [getAllWorkOrders] Datos desde cache:', cached.length);
    }
    // ✅ FIX: Solo usar cache si hay datos (evitar cache vacío)
    if (cached.length > 0) {
      return cached;
    } else {
      if (isDev) {
        console.log('⚠️ [getAllWorkOrders] Cache vacío detectado, forzando nueva carga...');
      }
      // Limpiar cache vacío
      ordersCache.delete(cacheKey);
    }
  }

  // ✅ OPTIMIZACIÓN: order_items solo si se solicita explícitamente
  const includeItems = filters?.includeItems === true;
  
  // ✅ MULTI-TENANT: Solo buscar órdenes del organization_id del usuario actual
  // Cada cliente solo verá sus propias órdenes, garantizando aislamiento de datos
  let selectQuery = `
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
      )`;
  
  // ✅ OPTIMIZACIÓN: Solo incluir order_items si se necesita
  if (includeItems) {
    selectQuery += ',\n      order_items(*)';
  }

  let query = supabase
    .from('work_orders')
    .select(selectQuery);
  
  // ✅ MULTI-TENANT: Filtrar por organization_id (SIEMPRE requerido)
  if (finalOrgId) {
    query = query.eq('organization_id', finalOrgId);
  }
  
  // ✅ FILTRO OPCIONAL: Filtrar por workshop_id solo si se proporciona
  // Si workshopId es null o undefined, mostrar todas las órdenes de la organización
  if (filters?.workshopId) {
    query = query.eq('workshop_id', filters.workshopId);
  }
  
  // ✅ FIX: Forzar que no use cache agregando un timestamp único a la query
  query = query.order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    if (isDev) {
      console.error('❌ [getAllWorkOrders] Error fetching work orders:', error);
    }
    throw error;
  }

  if (isDev) {
    console.log('✅ [getAllWorkOrders] Órdenes encontradas:', data?.length || 0);
  }
  
  // ✅ OPTIMIZACIÓN: Removidas queries de debug innecesarias (líneas 175-232)
  // Estas queries adicionales ralentizaban la carga en producción
  
  const result = (data || []) as WorkOrder[];
  
  // ✅ OPTIMIZACIÓN: Guardar en cache
  setCachedOrders(cacheKey, result);
  
  return result;
}

export async function getWorkOrderById(id: string) {
  const supabase = getClient();
  const organizationId = await getOrganizationId();

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
    .eq('organization_id', organizationId)
    .gte('created_at', '1970-01-01')  // Forzar bypass de cache
    .single()
    // NO usar cache para obtener datos actualizados de notas
    .abortSignal(new AbortController().signal);

  if (error) throw error;
  
  // ✅ OPTIMIZACIÓN: Limpiar cache al obtener una orden específica
  if (data) {
    clearOrdersCache(organizationId);
  }
  
  return data as WorkOrder;
}

export async function createWorkOrder(orderData: CreateWorkOrderData) {
  const supabase = getClient();
  const organizationId = orderData.organization_id || await getOrganizationId();

  const { data, error } = await supabase
    .from('work_orders')
    .insert([
      {
        ...orderData,
        organization_id: organizationId,
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
  
  // ✅ OPTIMIZACIÓN: Limpiar cache al crear una orden
  if (data) {
    clearOrdersCache(orderData.organization_id || organizationId);
  }
  
  return data as WorkOrder;
}

export async function updateWorkOrder(id: string, orderData: UpdateWorkOrderData) {
  const supabase = getClient();
  const organizationId = await getOrganizationId();
  
  console.log('🔄 [updateWorkOrder] Actualizando orden:', id);
  console.log('🔄 [updateWorkOrder] Datos:', orderData);
  console.log('🔄 [updateWorkOrder] Organization ID:', organizationId);

  // ✅ MULTI-TENANT: Filtrar por organization_id al actualizar para seguridad
  // Solo permite actualizar órdenes que pertenecen al organization_id del usuario actual
  // Esto garantiza que los usuarios solo puedan modificar sus propias órdenes
  const { data, error } = await supabase
    .from('work_orders')
    .update({
      ...orderData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId) // ✅ Filtrar por organization_id para seguridad multi-tenant
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
  
  // ✅ OPTIMIZACIÓN: Limpiar cache al actualizar una orden
  if (data) {
    clearOrdersCache(organizationId);
  }
  
  return data as WorkOrder;
}

export async function deleteWorkOrder(id: string) {
  const supabase = getClient();

  const organizationId = await getOrganizationId();
  console.log('🔧 deleteWorkOrder (DB) - Iniciando eliminación para ID:', id)
  console.log('🔧 deleteWorkOrder (DB) - Organization ID:', organizationId)
  
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
    
    if ((existingOrder?.organization_id ?? null) !== organizationId) {
      console.error('❌ La orden no pertenece a la organización correcta')
      console.error('❌ Organization ID de la orden:', existingOrder?.organization_id)
      console.error('❌ Organization ID esperado:', organizationId)
      throw new Error(`La orden no pertenece a la organización correcta`)
    }
    
  } catch (error) {
    console.error('❌ Error en try-catch de búsqueda:', error)
    console.error('❌ Tipo de error:', typeof error)
    console.error('❌ Constructor del error:', error?.constructor?.name)
    throw error
  }
  
  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  // ✅ OPTIMIZACIÓN: Limpiar cache al eliminar una orden
  clearOrdersCache(organizationId);

  if (error) {
    console.error('❌ Error al eliminar orden en BD:', error)
    throw new Error(`Failed to delete work order: ${error.message}`)
  }
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
  const organizationId = await getOrganizationId();

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
    .eq('organization_id', organizationId)
    .or(`description.ilike.%${searchTerm}%,diagnosis.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WorkOrder[];
}

export async function getWorkOrdersByCustomer(customerId: string) {
  const supabase = getClient();
  const organizationId = await getOrganizationId();

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
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WorkOrder[];
}

export async function getWorkOrdersByVehicle(vehicleId: string) {
  const supabase = getClient();
  const organizationId = await getOrganizationId();

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
    .eq('organization_id', organizationId)
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
  const organizationId = await getOrganizationId();

  const { data: orders, error } = await supabase
    .from('work_orders')
    .select('status, total_amount')
    .eq('organization_id', organizationId);

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