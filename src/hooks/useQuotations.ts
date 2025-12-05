'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  customer_id: string;
  vehicle_id: string;
  quotation_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted' | 'expired';
  description: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  valid_until: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
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
  work_order?: {
    id: string;
    description: string;
    status: string;
  };
  items?: QuotationItem[];
}

export interface QuotationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  converted: number;
  expired: number;
  total_value: number;
  average_value: number;
}

export interface CreateQuotationData {
  work_order_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  valid_until?: string;
}

export interface UpdateQuotationData {
  work_order_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  description?: string;
  notes?: string;
  valid_until?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'converted' | 'expired';
}

export interface CreateQuotationItemData {
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface UpdateQuotationItemData {
  item_type?: 'service' | 'part';
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
}

export function useQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);
  const [stats, setStats] = useState<QuotationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // FUNCIONES DE COTIZACIONES
  // =====================================================

  const fetchQuotations = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/quotations', window.location.origin);
      if (status && status !== 'all') {
        url.searchParams.set('status', status);
      }

      const response = await fetch(url.toString());
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener cotizaciones');
      }

      setQuotations(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar cotizaciones', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const searchQuotations = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/quotations', window.location.origin);
      url.searchParams.set('search', searchTerm);

      const response = await fetch(url.toString());
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al buscar cotizaciones');
      }

      setQuotations(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al buscar cotizaciones', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/quotations?stats=true');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener estadísticas');
      }

      setStats(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error fetching quotation stats:', errorMessage);
    }
  }, []);

  const fetchQuotationById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${id}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener cotización');
      }

      setCurrentQuotation(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar cotización', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuotation = useCallback(async (data: CreateQuotationData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al crear cotización');
      }

      toast.success('Cotización creada exitosamente');
      await fetchQuotations();
      await fetchStats();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al crear cotización', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotations, fetchStats]);

  const updateQuotation = useCallback(async (id: string, data: UpdateQuotationData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar cotización');
      }

      toast.success('Cotización actualizada exitosamente');
      await fetchQuotations();
      await fetchStats();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar cotización', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotations, fetchStats]);

  const deleteQuotation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar cotización');
      }

      toast.success('Cotización eliminada exitosamente');
      await fetchQuotations();
      await fetchStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar cotización', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotations, fetchStats]);

  const updateQuotationStatus = useCallback(async (id: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar estado');
      }

      toast.success(`Estado actualizado a: ${status}`);
      await fetchQuotations();
      await fetchStats();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar estado', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotations, fetchStats]);

  // =====================================================
  // FUNCIONES DE ITEMS DE COTIZACIÓN
  // =====================================================

  const fetchQuotationItems = useCallback(async (quotationId: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/items`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener items');
      }

      return result.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al cargar items', {
        description: errorMessage,
      });
      return [];
    }
  }, []);

  const addQuotationItem = useCallback(async (quotationId: string, data: CreateQuotationItemData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${quotationId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al agregar item');
      }

      toast.success('Item agregado exitosamente');
      await fetchQuotationById(quotationId);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al agregar item', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotationById]);

  const updateQuotationItem = useCallback(async (quotationId: string, itemId: string, data: UpdateQuotationItemData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${quotationId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar item');
      }

      toast.success('Item actualizado exitosamente');
      await fetchQuotationById(quotationId);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar item', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotationById]);

  const deleteQuotationItem = useCallback(async (quotationId: string, itemId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations/${quotationId}/items/${itemId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar item');
      }

      toast.success('Item eliminado exitosamente');
      await fetchQuotationById(quotationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar item', {
        description: errorMessage,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuotationById]);

  // =====================================================
  // FUNCIONES DE UTILIDAD
  // =====================================================

  const fetchQuotationsByCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations?customer_id=${customerId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener cotizaciones del cliente');
      }

      setQuotations(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar cotizaciones del cliente', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuotationsByWorkOrder = useCallback(async (workOrderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotations?work_order_id=${workOrderId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener cotizaciones de la orden');
      }

      setQuotations(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar cotizaciones de la orden', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Estado
    quotations,
    currentQuotation,
    stats,
    loading,
    error,

    // Operaciones de cotizaciones
    fetchQuotations,
    searchQuotations,
    fetchStats,
    fetchQuotationById,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    updateQuotationStatus,

    // Operaciones de items
    fetchQuotationItems,
    addQuotationItem,
    updateQuotationItem,
    deleteQuotationItem,

    // Consultas especiales
    fetchQuotationsByCustomer,
    fetchQuotationsByWorkOrder,

    // Utilidades
    setCurrentQuotation,
  };
}

