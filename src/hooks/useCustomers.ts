'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api';
import { useOrganization } from '@/lib/context/SessionContext';
import type { Customer } from '@/lib/database/queries/customers';

// API Response Types
interface CustomersResponse {
  success: boolean;
  data: Customer[];
  error?: string;
}

interface CustomerResponse {
  success: boolean;
  data: Customer;
  error?: string;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  createCustomer: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<boolean>;
  refreshCustomers: () => Promise<void>;
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId, ready } = useOrganization(); // ✅ FIX: Obtener organizationId y ready

  const fetchCustomers = useCallback(async () => {
    // ✅ FIX: Solo cargar si organizationId está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useCustomers] Esperando a que organizationId esté ready...', { organizationId: !!organizationId, ready });
      setLoading(false);
      setCustomers([]); // Limpiar clientes mientras espera
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [useCustomers] Cargando clientes para organizationId:', organizationId);
      
      // ✅ FIX: Forzar sin cache agregando timestamp
      const result = await safeFetch<CustomersResponse>(`/api/customers?_t=${Date.now()}`, {
        timeout: 30000,
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      console.log('🔍 [useCustomers] Resultado de safeFetch:', {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        error: result.error,
        status: result.status,
        statusText: result.statusText,
        // Log completo del data para diagnóstico
        dataPreview: result.data ? JSON.stringify(result.data).substring(0, 200) : null
      });
      
      if (!result.success) {
        console.error('❌ [useCustomers] Error en safeFetch:', result.error);
        setError(result.error || 'Error al cargar clientes');
        toast.error('Error al cargar clientes', {
          description: result.error || 'No se pudieron cargar los clientes'
        });
        return [];
      }
      
      // ✅ FIX: Manejar ambos formatos de respuesta
      // La API devuelve { success: true, data: [...] }
      // safeFetch devuelve el JSON parseado directamente en result.data
      let customersData: Customer[] = [];
      
      if (!result.data) {
        console.error('❌ [useCustomers] result.data es null o undefined');
        setError('No se recibieron datos de la API');
        return [];
      }
      
      // Si result.data tiene la estructura { success: true, data: [...] }
      if (typeof result.data === 'object' && 'success' in result.data) {
        const apiResponse = result.data as CustomersResponse;
        if (apiResponse.success && apiResponse.data) {
          customersData = apiResponse.data;
          console.log('✅ [useCustomers] Clientes desde result.data.data (formato API estándar):', customersData.length);
        } else {
          console.error('❌ [useCustomers] API devolvió success:false:', apiResponse.error);
          setError(apiResponse.error || 'Error al obtener clientes');
          return [];
        }
      } 
      // Si result.data es directamente un array (formato alternativo)
      else if (Array.isArray(result.data)) {
        customersData = result.data;
        console.log('✅ [useCustomers] Clientes desde result.data (array directo):', customersData.length);
      }
      // Si result.data tiene data dentro (formato anidado)
      else if (typeof result.data === 'object' && 'data' in result.data && Array.isArray((result.data as any).data)) {
        customersData = (result.data as any).data;
        console.log('✅ [useCustomers] Clientes desde result.data.data (nested):', customersData.length);
      }
      else {
        console.error('❌ [useCustomers] Formato de respuesta inesperado:', {
          dataType: typeof result.data,
          isObject: typeof result.data === 'object',
          hasSuccess: result.data && typeof result.data === 'object' && 'success' in result.data,
          hasData: result.data && typeof result.data === 'object' && 'data' in result.data,
          isArray: Array.isArray(result.data),
          data: result.data
        });
        setError('Formato de respuesta inesperado de la API');
        return [];
      }
      
      console.log('✅ [useCustomers] Clientes cargados:', customersData.length);
      console.log('✅ [useCustomers] Primeros clientes:', customersData.slice(0, 3).map(c => ({ id: c.id, name: c.name, org_id: (c as any).organization_id })));
      
      // ✅ FIX: Filtrar solo clientes de la organización actual (por seguridad)
      const filteredCustomers = customersData.filter((c: any) => {
        const customerOrgId = c.organization_id;
        const matches = customerOrgId === organizationId;
        if (!matches) {
          console.warn('⚠️ [useCustomers] Cliente con organization_id diferente encontrado:', {
            customer_id: c.id,
            customer_name: c.name,
            customer_org_id: customerOrgId,
            expected_org_id: organizationId
          });
        }
        return matches;
      });
      
      console.log('✅ [useCustomers] Clientes filtrados por organizationId:', filteredCustomers.length);
      setCustomers(filteredCustomers);
      return filteredCustomers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar clientes', {
        description: errorMessage
      });
      console.error('Error fetching customers:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [organizationId, ready]); // ✅ FIX: Agregar organizationId y ready a las dependencias

  const createCustomer = useCallback(async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await safePost<CustomerResponse>('/api/customers', data, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al crear cliente');
        toast.error('Error al crear cliente', {
          description: result.error || 'No se pudo crear el cliente'
        });
        return;
      }
      
      if (result.data?.success) {
        await fetchCustomers(); // Recargar lista
        toast.success('Cliente creado correctamente');
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al crear cliente');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear cliente', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchCustomers]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      const result = await safePut<CustomerResponse>(`/api/customers/${id}`, data, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al actualizar cliente');
        toast.error('Error al actualizar cliente', {
          description: result.error || 'No se pudo actualizar el cliente'
        });
        return;
      }
      
      if (result.data?.success) {
        await fetchCustomers(); // Recargar lista
        toast.success('Cliente actualizado correctamente');
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al actualizar cliente');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar cliente', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const result = await safeDelete(`/api/customers/${id}`, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al eliminar cliente');
        toast.error('Error al eliminar cliente', {
          description: result.error || 'No se pudo eliminar el cliente'
        });
        return;
      }
      
      await fetchCustomers(); // Recargar lista
      toast.success('Cliente eliminado correctamente');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar cliente', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchCustomers]);

  const refreshCustomers = useCallback(async () => {
    await fetchCustomers();
  }, [fetchCustomers]);

  // ✅ FIX: Solo cargar cuando organizationId esté ready
  useEffect(() => {
    console.log('🔄 [useCustomers] useEffect ejecutado:', {
      ready,
      organizationId: !!organizationId,
      organizationIdValue: organizationId,
      fetchCustomersExists: !!fetchCustomers
    });
    
    if (ready && organizationId) {
      console.log('✅ [useCustomers] Condiciones cumplidas, llamando fetchCustomers...');
      // ✅ FIX: Limpiar clientes anteriores antes de cargar nuevos
      setCustomers([]);
      fetchCustomers();
    } else {
      console.log('⏳ [useCustomers] Esperando a que organizationId esté ready...', { 
        ready, 
        organizationId: !!organizationId,
        organizationIdValue: organizationId 
      });
      // Limpiar clientes si organizationId cambia
      setCustomers([]);
      setLoading(false);
    }
  }, [ready, organizationId, fetchCustomers]);

  return {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refreshCustomers,
  };
}

