import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/context/SessionContext';

const supabase = createClient();

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
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
  status: 'reception' | 'diagnosis' | 'initial_quote' | 'waiting_approval' | 'disassembly' | 'waiting_parts' | 'assembly' | 'testing' | 'ready' | 'completed' | 'cancelled';
  description: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  entry_date: string;
  estimated_completion: string | null;
  completed_at: string | null;
  notes: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    license_plate: string | null;
  };
  items?: WorkOrderItem[];
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  color: string | null;
  mileage: number | null;
  created_at: string;
  updated_at: string;
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
  average_order_value: number;
}

export interface CreateWorkOrderData {
  customer_id: string;
  vehicle_id: string;
  description: string;
  diagnosis?: string;
  assigned_to?: string;
  estimated_completion?: string;
}

export interface UpdateWorkOrderData {
  customer_id?: string;
  vehicle_id?: string;
  description?: string;
  diagnosis?: string;
  assigned_to?: string;
  estimated_completion?: string;
}

export interface CreateOrderItemData {
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface UpdateOrderItemData {
  item_type?: 'service' | 'part';
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
}

export function useWorkOrders() {
  const { organizationId } = useSession();
  const [workOrders, setWorkOrders] = useState<WorkOrder[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkOrder | null>(null);
  const [stats, setStats] = useState<WorkOrderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 📋 OBTENER TODAS LAS ÓRDENES
  const fetchWorkOrders = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = status
        ? `/api/work-orders?status=${status}`
        : '/api/work-orders';
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener órdenes');
      }

      setWorkOrders(data.data);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar órdenes', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔍 BUSCAR ÓRDENES
  const searchWorkOrders = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders?search=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al buscar órdenes');
      }

      setWorkOrders(data.data);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error en búsqueda', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 📊 OBTENER ESTADÍSTICAS
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/work-orders?stats=true');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener estadísticas');
      }

      setStats(data.data);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar estadísticas', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 👁️ OBTENER UNA ORDEN POR ID
  const fetchWorkOrderById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener orden');
      }

      setCurrentWorkOrder(data.data);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar orden', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ➕ CREAR NUEVA ORDEN
  const createWorkOrder = useCallback(async (orderData: CreateWorkOrderData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al crear orden');
      }

      toast.success('Orden creada exitosamente', {
        description: `Orden #${data.data.id.slice(0, 8)} ha sido creada`,
      });

      // Actualizar lista
      await fetchWorkOrders();

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear orden', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders]);

  // ✏️ ACTUALIZAR ORDEN
  const updateWorkOrder = useCallback(async (id: string, orderData: UpdateWorkOrderData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar orden');
      }

      toast.success('Orden actualizada', {
        description: 'Los cambios han sido guardados',
      });

      // Actualizar lista
      await fetchWorkOrders();

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar orden', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders]);

  // 🗑️ ELIMINAR ORDEN
  const deleteWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al eliminar orden');
      }

      toast.success('Orden eliminada', {
        description: 'La orden ha sido eliminada correctamente',
      });

      // Actualizar lista
      await fetchWorkOrders();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar orden', {
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders]);

  // 🔄 CAMBIAR ESTADO DE ORDEN
  const updateWorkOrderStatus = useCallback(async (id: string, status: WorkOrder['status']) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al cambiar estado');
      }

      const statusLabels = {
        pending: 'Pendiente',
        in_progress: 'En Progreso',
        diagnosed: 'Diagnosticada',
        approved: 'Aprobada',
        in_repair: 'En Reparación',
        waiting_parts: 'Esperando Piezas',
        completed: 'Completada',
        delivered: 'Entregada',
      };

      toast.success('Estado actualizado', {
        description: `Orden cambió a: ${statusLabels[status]}`,
      });

      // Actualizar lista
      await fetchWorkOrders();

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cambiar estado', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders]);

  // 💰 ACTUALIZAR DESCUENTO
  const updateDiscount = useCallback(async (id: string, discount: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${id}/discount`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ discount }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar descuento');
      }

      toast.success('Descuento actualizado', {
        description: `Nuevo descuento: $${discount.toFixed(2)}`,
      });

      // Si tenemos la orden actual cargada, actualizarla
      if (currentWorkOrder?.id === id) {
        setCurrentWorkOrder(data.data);
      }

      // Actualizar lista
      await fetchWorkOrders();

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar descuento', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrders]);

  // 📦 OBTENER ITEMS DE UNA ORDEN
  const fetchOrderItems = useCallback(async (workOrderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener items');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar items', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ➕ AGREGAR ITEM A ORDEN
  const addOrderItem = useCallback(async (workOrderId: string, itemData: CreateOrderItemData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al agregar item');
      }

      toast.success('Item agregado', {
        description: `${itemData.item_name} agregado a la orden`,
      });

      // Recargar orden actual si es la misma
      if (currentWorkOrder?.id === workOrderId) {
        await fetchWorkOrderById(workOrderId);
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al agregar item', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrderById]);

  // ✏️ ACTUALIZAR ITEM
  const updateOrderItem = useCallback(async (
    workOrderId: string,
    itemId: string,
    itemData: UpdateOrderItemData
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar item');
      }

      toast.success('Item actualizado', {
        description: 'Los cambios han sido guardados',
      });

      // Recargar orden actual si es la misma
      if (currentWorkOrder?.id === workOrderId) {
        await fetchWorkOrderById(workOrderId);
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar item', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrderById]);

  // 🗑️ ELIMINAR ITEM
  const deleteOrderItem = useCallback(async (workOrderId: string, itemId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al eliminar item');
      }

      toast.success('Item eliminado', {
        description: 'El item ha sido eliminado de la orden',
      });

      // Recargar orden actual si es la misma
      if (currentWorkOrder?.id === workOrderId) {
        await fetchWorkOrderById(workOrderId);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar item', {
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentWorkOrder, fetchWorkOrderById]);

  // 👤 OBTENER ÓRDENES POR CLIENTE
  const fetchWorkOrdersByCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/customer/${customerId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener órdenes');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar órdenes del cliente', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚗 OBTENER ÓRDENES POR VEHÍCULO
  const fetchWorkOrdersByVehicle = useCallback(async (vehicleId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-orders/vehicle/${vehicleId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener órdenes');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar órdenes del vehículo', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 📋 CARGAR TODOS LOS DATOS PARA KANBAN
  const loadData = useCallback(async () => {
    // ✅ Validar organizationId del contexto
    if (!organizationId) {
      console.error('❌ No organization ID available');
      setError('No se encontró la organización');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Cargando datos del Kanban...');
      
      // Obtener usuario y workshop
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: userData } = await supabase
        .from('users')
        .select('workshop_id, organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData || !(userData as any).workshop_id) throw new Error('No se encontró el taller');
      
      // ✅ Validar que el organizationId del contexto coincida con el de la BD
      const userOrganizationId = (userData as any).organization_id as string;
      if (userOrganizationId !== organizationId) {
        console.error('❌ Organization ID mismatch:', { context: organizationId, db: userOrganizationId });
        throw new Error('Inconsistencia en la organización del usuario');
      }

      const workshopId = (userData as any).workshop_id as string;
      console.log('✅ Workshop ID:', workshopId);
      console.log('✅ Organization ID:', organizationId);

      // Cargar órdenes con relaciones
      const { data: ordersData, error: ordersError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          vehicle:vehicles(id, brand, model, year, license_plate),
          assigned_mechanic:employees(id, name)
        `)
        .eq('organization_id', organizationId) // ✅ Filtrar primero por organization
        .eq('workshop_id', workshopId)
        .order('entry_date', { ascending: false });

      if (ordersError) {
        console.error('❌ Error cargando órdenes:', ordersError);
        throw ordersError;
      }

      console.log('✅ Órdenes cargadas:', ordersData?.length || 0);

      // Cargar clientes
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId) // ✅ Filtrar primero por organization
        .eq('workshop_id', workshopId)
        .order('name');

      if (customersError) {
        console.error('❌ Error cargando clientes:', customersError);
        throw customersError;
      }

      console.log('✅ Clientes cargados:', customersData?.length || 0);

      // Cargar vehículos
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', organizationId) // ✅ Filtrar primero por organization
        .order('brand');

      if (vehiclesError) {
        console.error('❌ Error cargando vehículos:', vehiclesError);
        throw vehiclesError;
      }

      console.log('✅ Vehículos cargados:', vehiclesData?.length || 0);

      // Actualizar estados
      setWorkOrders(ordersData || []);
      setCustomers(customersData || []);
      setVehicles(vehiclesData || []);

      console.log('✅ Datos cargados exitosamente');

    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      console.error('💥 Error en loadData:', errorMessage);
      setError(errorMessage);
      toast.error('Error al cargar datos', {
        description: errorMessage,
      });
      
      // IMPORTANTE: Setear arrays vacíos para que el Kanban no se quede cargando
      setWorkOrders([]);
      setCustomers([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // 🔄 ACTUALIZAR ESTADO DE ORDEN (PARA KANBAN)
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    // ✅ Validar organizationId del contexto
    if (!organizationId) {
      console.error('❌ No organization ID available');
      throw new Error('No se encontró la organización');
    }

    try {
      // @ts-expect-error - Supabase generated types don't match runtime
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('organization_id', organizationId); // ✅ Validar que pertenece a la org

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }, [organizationId]);

  return {
    // Estado
    workOrders,
    customers,
    vehicles,
    currentWorkOrder,
    stats,
    loading,
    error,

    // Operaciones de órdenes
    fetchWorkOrders,
    searchWorkOrders,
    fetchStats,
    fetchWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    updateWorkOrderStatus,
    updateDiscount,

    // Operaciones de items
    fetchOrderItems,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,

    // Consultas especiales
    fetchWorkOrdersByCustomer,
    fetchWorkOrdersByVehicle,

    // Funciones para Kanban
    loadData,
    updateOrderStatus,

    // Utilidades
    setCurrentWorkOrder,
  };
}