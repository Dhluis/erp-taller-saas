/**
 * DEMOSTRACIÓN DE USO DE FETCH-UTILS
 * 
 * Este archivo muestra ejemplos prácticos de cómo usar las utilidades
 * seguras de fetch en diferentes escenarios del proyecto ERP.
 */

import { 
  safeFetch, 
  safeGet, 
  safePost, 
  safePut, 
  safeDelete,
  handleApiError,
  useSafeFetch 
} from './fetch-utils';

// ============================================================================
// EJEMPLO 1: REFACTORIZACIÓN DE useInventory (ANTES vs DESPUÉS)
// ============================================================================

// ❌ ANTES (INSEGURO) - src/hooks/useInventory.ts
/*
export function useInventory() {
  const fetchItems = async () => {
    const response = await fetch('/api/inventory');
    const data = await response.json(); // ❌ SIN VALIDACIÓN
    setItems(data);
  };
}
*/

// ✅ DESPUÉS (SEGURO) - Refactorizado con fetch-utils
export function useInventorySafe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/inventory');
    
    if (result.success) {
      setItems(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  const createItem = useCallback(async (itemData: any) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
    
    if (result.success) {
      setItems(prev => [...prev, result.data]);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
  };
}

// ============================================================================
// EJEMPLO 2: REFACTORIZACIÓN DE useBilling (ANTES vs DESPUÉS)
// ============================================================================

// ❌ ANTES (INSEGURO) - src/hooks/useBilling.ts
/*
export function useBilling() {
  const fetchQuotations = async () => {
    const response = await fetch('/api/quotations');
    const data = await response.json(); // ❌ SIN VALIDACIÓN
    setQuotations(data);
  };
}
*/

// ✅ DESPUÉS (SEGURO) - Refactorizado con fetch-utils
export function useBillingSafe() {
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/quotations');
    
    if (result.success) {
      setQuotations(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  const createQuotation = useCallback(async (quotationData: any) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
    
    if (result.success) {
      setQuotations(prev => [...prev, result.data]);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  return {
    quotations,
    invoices,
    loading,
    error,
    fetchQuotations,
    createQuotation,
  };
}

// ============================================================================
// EJEMPLO 3: REFACTORIZACIÓN DE COMPONENTES
// ============================================================================

// ❌ ANTES (INSEGURO) - src/components/orders/add-item-modal.tsx
/*
export function AddItemModal() {
  const loadData = async () => {
    const servicesResponse = await fetch('/api/services');
    if (servicesResponse.ok) {
      const servicesData = await servicesResponse.json(); // ✅ BIEN
    }
    
    const inventoryResponse = await fetch('/api/inventory');
    if (inventoryResponse.ok) {
      const inventoryData = await inventoryResponse.json(); // ✅ BIEN
    }
  };
}
*/

// ✅ DESPUÉS (SEGURO) - Refactorizado con fetch-utils
export function AddItemModalSafe() {
  const [services, setServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cargar servicios y inventario en paralelo
      const [servicesResult, inventoryResult] = await Promise.all([
        fetchData('/api/services'),
        fetchData('/api/inventory'),
      ]);
      
      if (servicesResult.success) {
        setServices(servicesResult.data);
      }
      
      if (inventoryResult.success) {
        setInventory(inventoryResult.data);
      }
      
      // Si hay errores, mostrar el primero
      if (!servicesResult.success) {
        setError(servicesResult.error);
      } else if (!inventoryResult.success) {
        setError(inventoryResult.error);
      }
      
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);
  
  return {
    services,
    inventory,
    loading,
    error,
    loadData,
  };
}

// ============================================================================
// EJEMPLO 4: REFACTORIZACIÓN DE PÁGINAS
// ============================================================================

// ❌ ANTES (INSEGURO) - src/app/ordenes/[id]/page.tsx
/*
export default function OrderDetailPage() {
  const loadOrderDetails = async () => {
    const response = await fetch(`/api/orders/${orderId}`);
    if (!response.ok) throw new Error('Error al cargar la orden');
    const data = await response.json(); // ✅ BIEN - Verifica response.ok primero
  };
}
*/

// ✅ DESPUÉS (SEGURO) - Refactorizado con fetch-utils
export function OrderDetailPageSafe() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const loadOrderDetails = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData(`/api/orders/${orderId}`);
    
    if (result.success) {
      setOrder(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  const updateOrderTotal = useCallback(async (orderId: string, total: number) => {
    const result = await fetchData(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ final_cost: total }),
    });
    
    if (result.success) {
      setOrder(prev => ({ ...prev, final_cost: total }));
    } else {
      setError(result.error);
    }
  }, [fetchData]);
  
  return {
    order,
    loading,
    error,
    loadOrderDetails,
    updateOrderTotal,
  };
}

// ============================================================================
// EJEMPLO 5: MANEJO DE ERRORES ESPECÍFICOS
// ============================================================================

export async function handleApiCallWithSpecificErrors() {
  try {
    const result = await safeFetch('/api/some-endpoint');
    
    if (result.success) {
      return result.data;
    } else {
      // Manejar diferentes tipos de errores HTTP
      switch (result.status) {
        case 404:
          throw new Error('Recurso no encontrado');
        case 403:
          throw new Error('No tienes permisos para acceder a este recurso');
        case 500:
          throw new Error('Error interno del servidor');
        default:
          throw new Error(result.error);
      }
    }
  } catch (error) {
    const apiError = handleApiError(error);
    
    // Log del error para debugging
    console.error('API Error:', {
      code: apiError.code,
      message: apiError.message,
      status: apiError.status,
      details: apiError.details,
    });
    
    // Mostrar mensaje apropiado al usuario
    switch (apiError.code) {
      case 'NETWORK_ERROR':
        throw new Error('Error de conexión. Verifica tu internet.');
      case 'TIMEOUT_ERROR':
        throw new Error('La petición tardó demasiado. Intenta de nuevo.');
      case 'JSON_PARSE_ERROR':
        throw new Error('Error al procesar la respuesta del servidor.');
      default:
        throw new Error(apiError.message);
    }
  }
}

// ============================================================================
// EJEMPLO 6: CONFIGURACIÓN AVANZADA CON REINTENTOS
// ============================================================================

export async function fetchWithRetries() {
  const result = await safeFetch('/api/unreliable-endpoint', {
    timeout: 15000,        // 15 segundos de timeout
    retries: 3,           // 3 reintentos
    retryDelay: 2000,     // 2 segundos entre reintentos
    headers: {
      'Authorization': 'Bearer token',
      'X-Request-ID': Math.random().toString(36),
    },
  });
  
  return result;
}

// ============================================================================
// EJEMPLO 7: MÚLTIPLES PETICIONES EN PARALELO
// ============================================================================

export async function loadDashboardData() {
  const [customersResult, vehiclesResult, ordersResult] = await Promise.all([
    safeGet('/api/customers'),
    safeGet('/api/vehicles'),
    safeGet('/api/orders'),
  ]);
  
  const results = {
    customers: customersResult.success ? customersResult.data : null,
    vehicles: vehiclesResult.success ? vehiclesResult.data : null,
    orders: ordersResult.success ? ordersResult.data : null,
    errors: {
      customers: customersResult.error,
      vehicles: vehiclesResult.error,
      orders: ordersResult.error,
    },
  };
  
  return results;
}

// ============================================================================
// EJEMPLO 8: HOOK PERSONALIZADO COMPLETO
// ============================================================================

export function useApiEndpoint<T = any>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData(endpoint);
    
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [endpoint, fetchData]);
  
  const create = useCallback(async (newData: any) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData(endpoint, {
      method: 'POST',
      body: JSON.stringify(newData),
    });
    
    if (result.success) {
      setData(prev => prev ? [...prev, result.data] : [result.data]);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [endpoint, fetchData]);
  
  const update = useCallback(async (id: string, updateData: any) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData(`${endpoint}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    if (result.success) {
      setData(prev => prev ? prev.map(item => 
        item.id === id ? result.data : item
      ) : [result.data]);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [endpoint, fetchData]);
  
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData(`${endpoint}/${id}`, {
      method: 'DELETE',
    });
    
    if (result.success) {
      setData(prev => prev ? prev.filter(item => item.id !== id) : null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [endpoint, fetchData]);
  
  return {
    data,
    loading,
    error,
    load,
    create,
    update,
    remove,
  };
}

// ============================================================================
// EJEMPLO 9: USO DEL HOOK PERSONALIZADO
// ============================================================================

export function useCustomers() {
  return useApiEndpoint('/api/customers');
}

export function useVehicles() {
  return useApiEndpoint('/api/vehicles');
}

export function useInventory() {
  return useApiEndpoint('/api/inventory');
}

// ============================================================================
// EXPORTACIONES PARA DEMO
// ============================================================================

export default {
  useInventorySafe,
  useBillingSafe,
  AddItemModalSafe,
  OrderDetailPageSafe,
  handleApiCallWithSpecificErrors,
  fetchWithRetries,
  loadDashboardData,
  useApiEndpoint,
  useCustomers,
  useVehicles,
  useInventory,
};










