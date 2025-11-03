import { createClient } from '@/lib/supabase/client';
import { withRetry } from '@/lib/supabase/retry-client';
import type { WorkOrder, OrderStatus } from '@/types/orders';

// Cache simple en memoria (solo para desarrollo/testing)
let ordersCache: { [key: string]: { data: WorkOrder[]; timestamp: number } } = {}
const CACHE_TTL = 10000 // 10 segundos

// Opciones de paginación
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

// Obtener todas las órdenes de una organización con sus relaciones (OPTIMIZADA)
export async function getAllOrders(
  organizationId: string, 
  options: {
    useCache?: boolean;
    pagination?: PaginationOptions;
    includeCompleted?: boolean; // Si false, excluye órdenes completadas antiguas
  } = {}
): Promise<WorkOrder[]> {
  const { useCache = true, pagination, includeCompleted = true } = options;
  const supabaseClient = createClient()
  
  // Verificar cache (solo en desarrollo, opcional)
  const cacheKey = `orders_${organizationId}_${pagination?.page || 0}_${includeCompleted}`
  if (useCache && !pagination && ordersCache[cacheKey]) {
    const cached = ordersCache[cacheKey]
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getAllOrders] Usando cache (datos frescos)')
      }
      return cached.data
    }
  }
  
  const startTime = performance.now()
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔌 [getAllOrders] Ejecutando query optimizada...')
  }

  // ✅ Query optimizada: Seleccionar solo campos necesarios
  // Campos principales de work_orders (los más usados)
  const workOrderFields = [
    'id',
    'status',
    'description',
    'notes',
    'estimated_cost',
    'final_cost',
    'total_amount',
    'entry_date',
    'estimated_completion',
    'completed_at',
    'created_at',
    'updated_at',
    'organization_id',
    'customer_id',
    'vehicle_id',
    'mechanic_id'
  ].join(',')

  // ✅ Relaciones optimizadas: solo campos necesarios
  // Nota: assigned_to podría no estar definida como FK, usar mechanic_id si existe
  const customerFields = 'id,name,phone,email'
  const vehicleFields = 'id,brand,model,year,license_plate,color'
  
  // Construir query base sin employees (puede no tener FK definida)
  let query = supabaseClient
    .from('work_orders')
    .select(`${workOrderFields}, customer:customers(${customerFields}), vehicle:vehicles(${vehicleFields})`)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // ✅ Filtrar órdenes completadas antiguas (mejora rendimiento)
  // Solo órdenes no completadas o completadas recientemente (últimos 6 meses)
  // Nota: El filtro se aplica después de obtener los datos para evitar problemas con .or()
  // Esto es menos eficiente pero más confiable
  const shouldFilterOldCompleted = !includeCompleted

  // ✅ Paginación inteligente
  const limit = pagination?.limit || 300; // Reducido de 500 a 300 para mejor rendimiento
  const offset = pagination?.offset || (pagination?.page ? (pagination.page - 1) * limit : 0);
  
  // Solo usar range, no limit también
  if (pagination || limit < 1000) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error } = await withRetry(
    async () => await query,
    { maxRetries: 2, delayMs: 300 }
  )
  
  const endTime = performance.now()
  const queryTime = Math.round(endTime - startTime)
  
  if (error) {
    console.error('❌ Error obteniendo órdenes:', error)
    throw error
  }
  
  // Guardar en cache (solo si no hay paginación)
  if (useCache && !pagination && data) {
    ordersCache[cacheKey] = {
      data: data as WorkOrder[],
      timestamp: Date.now()
    }
  }
  
  // ✅ Filtrar órdenes completadas antiguas en el cliente (más confiable)
  let filteredData = data || []
  if (shouldFilterOldCompleted && filteredData.length > 0) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    filteredData = filteredData.filter(order => {
      // Incluir si: no está completada O fue completada hace menos de 6 meses
      return !order.completed_at || new Date(order.completed_at) >= sixMonthsAgo
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [getAllOrders] Filtradas ${(data?.length || 0) - filteredData.length} órdenes antiguas`)
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ [getAllOrders] Query completada en ${queryTime}ms`)
    console.log(`✅ Órdenes encontradas: ${filteredData.length}`)
    console.log(`📊 Límite aplicado: ${limit}, Offset: ${offset}`)
  }

  return filteredData as WorkOrder[]
}

// Actualizar estado de una orden
export async function updateOrderStatus(
  orderId: string, 
  newStatus: OrderStatus
): Promise<void> {
  console.log('🔄 [updateOrderStatus] Iniciando actualización...');
  console.log('🔄 [updateOrderStatus] orderId:', orderId, '(tipo:', typeof orderId, ')');
  console.log('🔄 [updateOrderStatus] newStatus:', newStatus, '(tipo:', typeof newStatus, ')');
  console.log('🔄 [updateOrderStatus] Parámetros recibidos:', { orderId, newStatus });
  
  // Validar que orderId sea un UUID válido (formato básico)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    const error = new Error(`ID de orden inválido: ${orderId}`);
    console.error('❌ [updateOrderStatus] Error de validación:', error.message);
    throw error;
  }

  // Validar que el status sea válido
  const validStatuses: OrderStatus[] = [
    'reception',
    'diagnosis',
    'initial_quote',
    'waiting_approval',
    'disassembly',
    'waiting_parts',
    'assembly',
    'testing',
    'ready',
    'completed',
    'cancelled',
    'pending',
    'in_progress'
  ];

  if (!validStatuses.includes(newStatus)) {
    const error = new Error(`Status inválido: ${newStatus}. Status válidos: ${validStatuses.join(', ')}`);
    console.error('❌ [updateOrderStatus] Error de validación:', error.message);
    throw error;
  }
  
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  // Si se marca como completada, agregar fecha de completado
  if (newStatus === 'completed' || newStatus === 'ready') {
    updateData.completed_at = new Date().toISOString();
  }

  console.log('🔄 [updateOrderStatus] updateData:', JSON.stringify(updateData, null, 2));

  try {
    const supabaseClient = createClient()
    const { data, error } = await supabaseClient
      .from('work_orders')
      .update(updateData)
      .eq('id', orderId)
      .select('id, status, updated_at');

    if (error) {
      console.error('❌ [updateOrderStatus] Error de Supabase:', JSON.stringify(error, null, 2));
      console.error('❌ [updateOrderStatus] Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ [updateOrderStatus] Respuesta de Supabase:', JSON.stringify(data, null, 2));
    console.log('✅ [updateOrderStatus] Orden actualizada exitosamente');
    
  } catch (err) {
    console.error('❌ [updateOrderStatus] Excepción capturada:', err);
    throw err;
  }
}

// Crear nueva orden
export async function createOrder(orderData: {
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  estimated_cost?: number;
  notes?: string;
}): Promise<WorkOrder> {
  console.log('🆕 [createOrder] Creando nueva orden:', orderData);
  
  const supabaseClient = createClient()
  const { data, error } = await supabaseClient
    .from('work_orders')
    .insert({
      organization_id: orderData.organization_id,
      customer_id: orderData.customer_id,
      vehicle_id: orderData.vehicle_id,
      status: 'reception', // Estado inicial
      description: orderData.description,
      estimated_cost: orderData.estimated_cost || 0,
      notes: orderData.notes,
      entry_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(`
      *,
      customer:customers!customer_id (
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles!vehicle_id (
        id,
        brand,
        model,
        year,
        license_plate,
        color
      )
    `)
    .single();

  if (error) {
    console.error('❌ [createOrder] Error:', error);
    throw error;
  }

  console.log('✅ [createOrder] Orden creada exitosamente:', data);
  return data as WorkOrder;
}

// Obtener todos los clientes de una organización
export async function getCustomers(organizationId: string) {
  const supabaseClient = createClient()
  const { data, error } = await withRetry(
    async () => await supabaseClient
      .from('customers')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId)
      .order('name'),
    { maxRetries: 3, delayMs: 500 }
  )

  if (error) {
    console.error('❌ [getCustomers] Error:', error);
    throw error;
  }

  return data || [];
}

// Obtener vehículos de un cliente
export async function getVehiclesByCustomer(customerId: string) {
  const supabaseClient = createClient()
  const { data, error } = await supabaseClient
    .from('vehicles')
    .select('id, brand, model, year, license_plate, color')
    .eq('customer_id', customerId)
    .order('brand');

  if (error) {
    console.error('❌ [getVehiclesByCustomer] Error:', error);
    throw error;
  }

  return data || [];
}