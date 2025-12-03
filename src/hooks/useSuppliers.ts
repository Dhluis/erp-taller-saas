'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';

// Supplier Type
export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Stats Type
export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalOrders: number;
  totalAmount: number;
}

// API Response Types
interface SuppliersResponse {
  success: boolean;
  data: Supplier[];
  error?: string;
}

interface SupplierResponse {
  success: boolean;
  data: Supplier;
  error?: string;
}

interface StatsResponse {
  success: boolean;
  data: SupplierStats;
  error?: string;
}

interface UseSuppliersReturn {
  suppliers: Supplier[];
  stats: SupplierStats;
  loading: boolean;
  error: string | null;
  createSupplier: (data: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  refreshSuppliers: () => Promise<void>;
}

export function useSuppliers(): UseSuppliersReturn {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalOrders: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId, ready } = useOrganization(); // ✅ FIX: Obtener organizationId y ready

  const fetchSuppliers = useCallback(async () => {
    // ✅ FIX: Solo cargar si organizationId está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useSuppliers] Esperando a que organizationId esté ready...', { organizationId: !!organizationId, ready });
      setLoading(false);
      setSuppliers([]); // Limpiar proveedores mientras espera
      setStats({
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalOrders: 0,
        totalAmount: 0,
      });
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [useSuppliers] Cargando proveedores para organizationId:', organizationId);
      
      const [suppliersResult, statsResult] = await Promise.all([
        safeFetch<SuppliersResponse>('/api/suppliers', { timeout: 30000 }),
        safeFetch<StatsResponse>('/api/suppliers/stats', { timeout: 30000 })
      ]);
      
      if (!suppliersResult.success) {
        setError(suppliersResult.error || 'Error al cargar proveedores');
        toast.error('Error al cargar proveedores', {
          description: suppliersResult.error || 'No se pudieron cargar los proveedores'
        });
        return [];
      }
      
      if (suppliersResult.data?.success) {
        console.log('✅ [useSuppliers] Proveedores cargados:', suppliersResult.data.data.length);
        setSuppliers(suppliersResult.data.data);
      } else {
        throw new Error(suppliersResult.data?.error || 'Error al obtener proveedores');
      }

      if (statsResult.success && statsResult.data?.success) {
        setStats(statsResult.data.data);
      }

      return suppliersResult.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar proveedores', {
        description: errorMessage
      });
      console.error('Error fetching suppliers:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [organizationId, ready]);

  const createSupplier = useCallback(async (data: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await safePost<SupplierResponse>('/api/suppliers', data, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al crear proveedor');
        toast.error('Error al crear proveedor', {
          description: result.error || 'No se pudo crear el proveedor'
        });
        return;
      }
      
      if (result.data?.success) {
        await fetchSuppliers(); // Recargar lista
        toast.success('Proveedor creado correctamente');
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al crear proveedor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear proveedor', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchSuppliers]);

  const updateSupplier = useCallback(async (id: string, data: Partial<Supplier>) => {
    try {
      const result = await safePut<SupplierResponse>(`/api/suppliers/${id}`, data, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al actualizar proveedor');
        toast.error('Error al actualizar proveedor', {
          description: result.error || 'No se pudo actualizar el proveedor'
        });
        return;
      }
      
      if (result.data?.success) {
        await fetchSuppliers(); // Recargar lista
        toast.success('Proveedor actualizado correctamente');
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al actualizar proveedor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar proveedor', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchSuppliers]);

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      const result = await safeDelete(`/api/suppliers/${id}`, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al eliminar proveedor');
        toast.error('Error al eliminar proveedor', {
          description: result.error || 'No se pudo eliminar el proveedor'
        });
        return;
      }
      
      await fetchSuppliers(); // Recargar lista
      toast.success('Proveedor eliminado correctamente');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar proveedor', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchSuppliers]);

  const refreshSuppliers = useCallback(async () => {
    await fetchSuppliers();
  }, [fetchSuppliers]);

  // ✅ FIX: Solo cargar cuando organizationId esté ready
  useEffect(() => {
    if (ready && organizationId) {
      console.log('🔄 [useSuppliers] useEffect triggered - organizationId ready:', organizationId);
      // Limpiar proveedores anteriores antes de cargar nuevos
      setSuppliers([]);
      setStats({
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalOrders: 0,
        totalAmount: 0,
      });
      fetchSuppliers();
    } else {
      console.log('⏳ [useSuppliers] Esperando a que organizationId esté ready...', { ready, organizationId: !!organizationId });
      // Limpiar proveedores si organizationId cambia
      setSuppliers([]);
      setStats({
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalOrders: 0,
        totalAmount: 0,
      });
    }
  }, [ready, organizationId, fetchSuppliers]);

  return {
    suppliers,
    stats,
    loading,
    error,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refreshSuppliers,
  };
}

