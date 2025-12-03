'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { safeFetch, safePost, safePut, safeDelete } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Vehicle, CreateVehicleData, UpdateVehicleData } from '@/lib/database/queries/vehicles';

// API Response Types
interface VehiclesResponse {
  success: boolean;
  data: Vehicle[];
  error?: string;
}

interface VehicleResponse {
  success: boolean;
  data: Vehicle;
  error?: string;
}

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  createVehicle: (data: CreateVehicleData) => Promise<void>;
  updateVehicle: (id: string, data: UpdateVehicleData) => Promise<void>;
  deleteVehicle: (id: string) => Promise<boolean>;
  refreshVehicles: () => Promise<void>;
}

export function useVehicles(): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId, ready } = useOrganization(); // ✅ FIX: Obtener organizationId y ready

  const fetchVehicles = useCallback(async () => {
    // ✅ FIX: Solo cargar si organizationId está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useVehicles] Esperando a que organizationId esté ready...', { organizationId: !!organizationId, ready });
      setLoading(false);
      setVehicles([]); // Limpiar vehículos mientras espera
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [useVehicles] Cargando vehículos para organizationId:', organizationId);
      
      const result = await safeFetch<VehiclesResponse>('/api/vehicles', {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al cargar vehículos');
        toast.error('Error al cargar vehículos', {
          description: result.error || 'No se pudieron cargar los vehículos'
        });
        return [];
      }
      
      if (result.data?.success) {
        console.log('✅ [useVehicles] Vehículos cargados:', result.data.data.length);
        setVehicles(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener vehículos');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar vehículos', {
        description: errorMessage
      });
      console.error('Error fetching vehicles:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [organizationId, ready]);

  const createVehicle = useCallback(async (data: CreateVehicleData) => {
    try {
      const result = await safePost<VehicleResponse>('/api/vehicles', data, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al crear vehículo');
        toast.error('Error al crear vehículo', {
          description: result.error || 'No se pudo crear el vehículo'
        });
        return;
      }
      
      if (result.data) {
        await fetchVehicles(); // Recargar lista
        toast.success('Vehículo creado correctamente');
        return result.data;
      } else {
        throw new Error('Error al crear vehículo');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear vehículo', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchVehicles]);

  const updateVehicle = useCallback(async (id: string, data: UpdateVehicleData) => {
    try {
      const result = await safePut<VehicleResponse>(`/api/vehicles/${id}`, data, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al actualizar vehículo');
        toast.error('Error al actualizar vehículo', {
          description: result.error || 'No se pudo actualizar el vehículo'
        });
        return;
      }
      
      if (result.data?.success) {
        await fetchVehicles(); // Recargar lista
        toast.success('Vehículo actualizado correctamente');
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al actualizar vehículo');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar vehículo', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchVehicles]);

  const deleteVehicle = useCallback(async (id: string) => {
    try {
      const result = await safeDelete(`/api/vehicles/${id}`, {
        timeout: 30000
      });
      
      if (!result.success) {
        setError(result.error || 'Error al eliminar vehículo');
        toast.error('Error al eliminar vehículo', {
          description: result.error || 'No se pudo eliminar el vehículo'
        });
        return false;
      }
      
      await fetchVehicles(); // Recargar lista
      toast.success('Vehículo eliminado correctamente');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar vehículo', {
        description: errorMessage
      });
      throw err;
    }
  }, [fetchVehicles]);

  const refreshVehicles = useCallback(async () => {
    await fetchVehicles();
  }, [fetchVehicles]);

  // ✅ FIX: Solo cargar cuando organizationId esté ready
  useEffect(() => {
    if (ready && organizationId) {
      console.log('🔄 [useVehicles] useEffect triggered - organizationId ready:', organizationId);
      // Limpiar vehículos anteriores antes de cargar nuevos
      setVehicles([]);
      fetchVehicles();
    } else {
      console.log('⏳ [useVehicles] Esperando a que organizationId esté ready...', { ready, organizationId: !!organizationId });
      // Limpiar vehículos si organizationId cambia
      setVehicles([]);
    }
  }, [ready, organizationId, fetchVehicles]);

  return {
    vehicles,
    loading,
    error,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    refreshVehicles,
  };
}
