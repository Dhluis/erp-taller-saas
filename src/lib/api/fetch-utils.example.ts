/**
 * EJEMPLOS DE USO DE FETCH-UTILS
 * 
 * Este archivo muestra cómo usar las utilidades seguras de fetch
 * en diferentes escenarios del proyecto.
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
// EJEMPLO 1: USO BÁSICO CON safeFetch
// ============================================================================

export async function fetchCustomers() {
  const result = await safeFetch('/api/customers');
  
  if (result.success) {
    console.log('Clientes cargados:', result.data);
    return result.data;
  } else {
    console.error('Error al cargar clientes:', result.error);
    throw new Error(result.error);
  }
}

// ============================================================================
// EJEMPLO 2: USO CON CONFIGURACIÓN AVANZADA
// ============================================================================

export async function fetchCustomersWithRetry() {
  const result = await safeFetch('/api/customers', {
    timeout: 15000,        // 15 segundos de timeout
    retries: 3,           // 3 reintentos
    retryDelay: 2000,     // 2 segundos entre reintentos
    headers: {
      'Authorization': 'Bearer token',
    },
  });
  
  return result;
}

// ============================================================================
// EJEMPLO 3: POST REQUEST SEGURO
// ============================================================================

export async function createCustomer(customerData: any) {
  const result = await safePost('/api/customers', customerData, {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (result.success) {
    console.log('Cliente creado:', result.data);
    return result.data;
  } else {
    console.error('Error al crear cliente:', result.error);
    throw new Error(result.error);
  }
}

// ============================================================================
// EJEMPLO 4: MANEJO DE ERRORES ESPECÍFICOS
// ============================================================================

export async function fetchCustomerById(id: string) {
  try {
    const result = await safeGet(`/api/customers/${id}`);
    
    if (result.success) {
      return result.data;
    } else {
      // Manejar diferentes tipos de errores
      if (result.status === 404) {
        throw new Error('Cliente no encontrado');
      } else if (result.status === 500) {
        throw new Error('Error interno del servidor');
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    const apiError = handleApiError(error);
    console.error('Error normalizado:', apiError);
    throw apiError;
  }
}

// ============================================================================
// EJEMPLO 5: USO EN HOOK PERSONALIZADO
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/customers');
    
    if (result.success) {
      setCustomers(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  const createCustomer = useCallback(async (customerData: any) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    
    if (result.success) {
      setCustomers(prev => [...prev, result.data]);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);
  
  return {
    customers,
    loading,
    error,
    createCustomer,
    refreshCustomers: loadCustomers,
  };
}

// ============================================================================
// EJEMPLO 6: REFACTORIZACIÓN DE HOOK INSEGURO
// ============================================================================

// ❌ ANTES (INSEGURO):
/*
export function useInventory() {
  const fetchItems = async () => {
    const response = await fetch('/api/inventory');
    const data = await response.json(); // ❌ SIN VALIDACIÓN
    setItems(data);
  };
}
*/

// ✅ DESPUÉS (SEGURO):
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
  
  return {
    items,
    loading,
    error,
    fetchItems,
  };
}

// ============================================================================
// EJEMPLO 7: MANEJO DE DIFERENTES TIPOS DE ERRORES
// ============================================================================

export async function handleApiCall() {
  try {
    const result = await safeFetch('/api/some-endpoint');
    
    if (result.success) {
      return result.data;
    } else {
      // El error ya está manejado por safeFetch
      throw new Error(result.error);
    }
  } catch (error) {
    const apiError = handleApiError(error);
    
    // Manejar diferentes tipos de errores
    switch (apiError.code) {
      case 'NETWORK_ERROR':
        console.error('Error de red:', apiError.message);
        break;
      case 'TIMEOUT_ERROR':
        console.error('Timeout:', apiError.message);
        break;
      case 'JSON_PARSE_ERROR':
        console.error('Error de parsing:', apiError.message);
        break;
      case 'HTTP_404':
        console.error('Recurso no encontrado');
        break;
      case 'HTTP_500':
        console.error('Error interno del servidor');
        break;
      default:
        console.error('Error desconocido:', apiError.message);
    }
    
    throw apiError;
  }
}

// ============================================================================
// EJEMPLO 8: USO CON TIPOS TYPESCRIPT
// ============================================================================

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CustomerResponse {
  success: boolean;
  data: Customer[];
  error?: string;
}

export async function fetchCustomersTyped(): Promise<Customer[]> {
  const result = await safeFetch<CustomerResponse>('/api/customers');
  
  if (result.success && result.data) {
    return result.data.data; // Acceder a la propiedad data del response
  } else {
    throw new Error(result.error || 'Error al cargar clientes');
  }
}

// ============================================================================
// EJEMPLO 9: CONFIGURACIÓN GLOBAL
// ============================================================================

// Configuración por defecto para toda la aplicación
export const defaultFetchConfig = {
  timeout: 10000,
  retries: 2,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export async function fetchWithDefaultConfig<T>(url: string, options: any = {}) {
  return safeFetch<T>(url, {
    ...defaultFetchConfig,
    ...options,
  });
}


















