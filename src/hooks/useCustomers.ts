'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
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
      
      if (!result.success) {
        setError(result.error || 'Error al cargar clientes');
        toast.error('Error al cargar clientes', {
          description: result.error || 'No se pudieron cargar los clientes'
        });
        return [];
      }
      
      if (result.data?.success) {
        const customersData = result.data.data || [];
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
      } else {
        throw new Error(result.data?.error || 'Error al obtener clientes');
      }
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
  }, []);

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
    if (ready && organizationId) {
      console.log('🔄 [useCustomers] useEffect triggered - organizationId ready:', organizationId);
      // ✅ FIX: Limpiar clientes anteriores antes de cargar nuevos
      setCustomers([]);
      fetchCustomers();
    } else {
      console.log('⏳ [useCustomers] Esperando a que organizationId esté ready...', { ready, organizationId: !!organizationId });
      // Limpiar clientes si organizationId cambia
      setCustomers([]);
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

