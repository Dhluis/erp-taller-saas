import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { safeFetch, safePost, safePut, safeDelete } from '../lib/api';

// =====================================================
// TIPOS
// =====================================================

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
    email?: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year?: number;
    license_plate?: string;
  };
  work_order?: {
    id: string;
    description: string;
    status: string;
    total_amount?: number;
  };
  items?: QuotationItem[];
}

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

export interface SalesInvoice {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  quotation_id: string | null;
  customer_id: string;
  vehicle_id: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'partial' | 'cancelled';
  description: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year?: number;
    license_plate?: string;
  };
  work_order?: {
    id: string;
    description: string;
    status: string;
    total_amount?: number;
  };
  quotation?: {
    id: string;
    quotation_number: string;
    status: string;
    total_amount: number;
  };
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  payment_number: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  reference: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
  created_by: string | null;
  invoice?: {
    id: string;
    invoice_number: string;
    customer_id: string;
    vehicle_id: string;
    total_amount: number;
    status: string;
  };
}

export interface InvoiceStats {
  total: number;
  pending: number;
  partial: number;
  paid: number;
  cancelled: number;
  total_revenue: number;
  total_collected: number;
  total_pending: number;
}

export interface CreateQuotationData {
  work_order_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  valid_until?: string;
}

export interface CreateInvoiceData {
  work_order_id?: string;
  quotation_id?: string;
  customer_id: string;
  vehicle_id: string;
  description: string;
  notes?: string;
  due_date?: string;
}

export interface CreatePaymentData {
  invoice_id: string;
  amount: number;
  payment_method: Payment['payment_method'];
  reference?: string;
  notes?: string;
  payment_date: string;
  created_by?: string;
}

export interface CreateItemData {
  item_type: 'service' | 'part';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

interface QuotationsResponse {
  success: boolean;
  data: Quotation[];
  error?: string;
}

interface QuotationResponse {
  success: boolean;
  data: Quotation;
  error?: string;
}

interface InvoicesResponse {
  success: boolean;
  data: SalesInvoice[];
  error?: string;
}

interface InvoiceResponse {
  success: boolean;
  data: SalesInvoice;
  error?: string;
}

interface InvoiceStatsResponse {
  success: boolean;
  data: InvoiceStats;
  error?: string;
}

interface PaymentsResponse {
  success: boolean;
  data: Payment[];
  error?: string;
}

interface PaymentResponse {
  success: boolean;
  data: Payment;
  error?: string;
}

interface ConversionResponse {
  success: boolean;
  data: {
    quotation?: Quotation;
    invoice?: SalesInvoice;
  };
  error?: string;
}

// =====================================================
// HOOK
// =====================================================

export function useBilling() {
  // Estados para cotizaciones
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);

  // Estados para notas de venta
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<SalesInvoice | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);

  // Estados para pagos
  const [payments, setPayments] = useState<Payment[]>([]);

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // COTIZACIONES
  // =====================================================

  // Obtener todas las cotizaciones
  const fetchQuotations = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = status ? `/api/quotations?status=${status}` : '/api/quotations';
      const result = await safeFetch<QuotationsResponse>(url, {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar cotizaciones');
        toast.error('Error al cargar cotizaciones', {
          description: result.error || 'Error al cargar cotizaciones',
        });
        return [];
      }

      if (result.data?.success) {
        setQuotations(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener cotizaciones');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar cotizaciones', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar cotizaciones
  const searchQuotations = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<QuotationsResponse>(
        `/api/quotations?search=${encodeURIComponent(searchTerm)}`,
        {
          timeout: 30000
        }
      );

      if (!result.success) {
        setError(result.error || 'Error al buscar cotizaciones');
        toast.error('Error en búsqueda', {
          description: result.error || 'Error al buscar cotizaciones',
        });
        return [];
      }

      if (result.data?.success) {
        setQuotations(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al buscar cotizaciones');
      }
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

  // Obtener cotización por ID
  const fetchQuotationById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<QuotationResponse>(`/api/quotations/${id}`, {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar cotización');
        toast.error('Error al cargar cotización', {
          description: result.error || 'Error al cargar cotización',
        });
        return null;
      }

      if (result.data?.success) {
        setCurrentQuotation(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener cotización');
      }
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

  // Crear cotización
  const createQuotation = useCallback(
    async (quotationData: CreateQuotationData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<QuotationResponse>('/api/quotations', quotationData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al crear cotización');
          toast.error('Error al crear cotización', {
            description: result.error || 'Error al crear cotización',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Cotización creada exitosamente', {
            description: `Cotización ${result.data.data.quotation_number} ha sido creada`,
          });

          await fetchQuotations();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al crear cotización');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al crear cotización', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchQuotations]
  );

  // Actualizar cotización
  const updateQuotation = useCallback(
    async (id: string, quotationData: Partial<Quotation>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePut<QuotationResponse>(`/api/quotations/${id}`, quotationData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al actualizar cotización');
          toast.error('Error al actualizar cotización', {
            description: result.error || 'Error al actualizar cotización',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Cotización actualizada', {
            description: 'Los cambios han sido guardados',
          });

          await fetchQuotations();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al actualizar cotización');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al actualizar cotización', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchQuotations]
  );

  // Eliminar cotización
  const deleteQuotation = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safeDelete(`/api/quotations/${id}`, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al eliminar cotización');
          toast.error('Error al eliminar cotización', {
            description: result.error || 'Error al eliminar cotización',
          });
          return false;
        }

        if (result.data?.success) {
          toast.success('Cotización eliminada', {
            description: 'La cotización ha sido eliminada correctamente',
          });

          await fetchQuotations();
          return true;
        } else {
          throw new Error(result.data?.error || 'Error al eliminar cotización');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al eliminar cotización', {
          description: errorMessage,
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchQuotations]
  );

  // Cambiar estado de cotización
  const updateQuotationStatus = useCallback(
    async (id: string, status: Quotation['status']) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePut<QuotationResponse>(`/api/quotations/${id}/status`, { status }, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al cambiar estado');
          toast.error('Error al cambiar estado', {
            description: result.error || 'Error al cambiar estado',
          });
          return null;
        }

        if (result.data?.success) {
          const statusLabels = {
            pending: 'Pendiente',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            converted: 'Convertida',
            expired: 'Expirada',
          };

          toast.success('Estado actualizado', {
            description: `Cotización cambió a: ${statusLabels[status]}`,
          });

          await fetchQuotations();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al cambiar estado');
        }
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
    },
    [fetchQuotations]
  );

  // Agregar item a cotización
  const addQuotationItem = useCallback(
    async (quotationId: string, itemData: CreateItemData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost(`/api/quotations/${quotationId}/items`, itemData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al agregar item');
          toast.error('Error al agregar item', {
            description: result.error || 'Error al agregar item',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Item agregado', {
            description: `${itemData.item_name} agregado a la cotización`,
          });

          if (currentQuotation?.id === quotationId) {
            await fetchQuotationById(quotationId);
          }

          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al agregar item');
        }
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
    },
    [currentQuotation, fetchQuotationById]
  );

  // Actualizar item de cotización
  const updateQuotationItem = useCallback(
    async (quotationId: string, itemId: string, itemData: Partial<QuotationItem>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePut(
          `/api/quotations/${quotationId}/items/${itemId}`,
          itemData,
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al actualizar item');
          toast.error('Error al actualizar item', {
            description: result.error || 'Error al actualizar item',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Item actualizado', {
            description: 'Los cambios han sido guardados',
          });

          if (currentQuotation?.id === quotationId) {
            await fetchQuotationById(quotationId);
          }

          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al actualizar item');
        }
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
    },
    [currentQuotation, fetchQuotationById]
  );

  // Eliminar item de cotización
  const deleteQuotationItem = useCallback(
    async (quotationId: string, itemId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safeDelete(
          `/api/quotations/${quotationId}/items/${itemId}`,
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al eliminar item');
          toast.error('Error al eliminar item', {
            description: result.error || 'Error al eliminar item',
          });
          return false;
        }

        if (result.data?.success) {
          toast.success('Item eliminado', {
            description: 'El item ha sido eliminado de la cotización',
          });

          if (currentQuotation?.id === quotationId) {
            await fetchQuotationById(quotationId);
          }

          return true;
        } else {
          throw new Error(result.data?.error || 'Error al eliminar item');
        }
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
    },
    [currentQuotation, fetchQuotationById]
  );

  // =====================================================
  // NOTAS DE VENTA (INVOICES)
  // =====================================================

  // Obtener todas las notas de venta
  const fetchInvoices = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = status ? `/api/invoices?status=${status}` : '/api/invoices';
      const result = await safeFetch<InvoicesResponse>(url, {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar notas de venta');
        toast.error('Error al cargar notas de venta', {
          description: result.error || 'Error al cargar notas de venta',
        });
        return [];
      }

      if (result.data?.success) {
        setInvoices(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener notas de venta');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar notas de venta', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar notas de venta
  const searchInvoices = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<InvoicesResponse>(
        `/api/invoices?search=${encodeURIComponent(searchTerm)}`,
        {
          timeout: 30000
        }
      );

      if (!result.success) {
        setError(result.error || 'Error al buscar notas de venta');
        toast.error('Error en búsqueda', {
          description: result.error || 'Error al buscar notas de venta',
        });
        return [];
      }

      if (result.data?.success) {
        setInvoices(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al buscar notas de venta');
      }
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

  // Obtener estadísticas de facturación
  const fetchInvoiceStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<InvoiceStatsResponse>('/api/invoices?stats=true', {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar estadísticas');
        toast.error('Error al cargar estadísticas', {
          description: result.error || 'Error al cargar estadísticas',
        });
        return null;
      }

      if (result.data?.success) {
        setInvoiceStats(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener estadísticas');
      }
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

  // Obtener nota de venta por ID
  const fetchInvoiceById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<InvoiceResponse>(`/api/invoices/${id}`, {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar nota de venta');
        toast.error('Error al cargar nota de venta', {
          description: result.error || 'Error al cargar nota de venta',
        });
        return null;
      }

      if (result.data?.success) {
        setCurrentInvoice(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener nota de venta');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar nota de venta', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nota de venta
  const createInvoice = useCallback(
    async (invoiceData: CreateInvoiceData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<InvoiceResponse>('/api/invoices', invoiceData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al crear nota de venta');
          toast.error('Error al crear nota de venta', {
            description: result.error || 'Error al crear nota de venta',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Nota de venta creada exitosamente', {
            description: `Nota ${result.data.data.invoice_number} ha sido creada`,
          });

          await fetchInvoices();
          await fetchInvoiceStats();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al crear nota de venta');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al crear nota de venta', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchInvoices, fetchInvoiceStats]
  );

  // Actualizar nota de venta
  const updateInvoice = useCallback(
    async (id: string, invoiceData: Partial<SalesInvoice>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePut<InvoiceResponse>(`/api/invoices/${id}`, invoiceData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al actualizar nota de venta');
          toast.error('Error al actualizar nota de venta', {
            description: result.error || 'Error al actualizar nota de venta',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Nota de venta actualizada', {
            description: 'Los cambios han sido guardados',
          });

          await fetchInvoices();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al actualizar nota de venta');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al actualizar nota de venta', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchInvoices]
  );

  // Eliminar nota de venta
  const deleteInvoice = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safeDelete(`/api/invoices/${id}`, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al eliminar nota de venta');
          toast.error('Error al eliminar nota de venta', {
            description: result.error || 'Error al eliminar nota de venta',
          });
          return false;
        }

        if (result.data?.success) {
          toast.success('Nota de venta eliminada', {
            description: 'La nota de venta ha sido eliminada correctamente',
          });

          await fetchInvoices();
          await fetchInvoiceStats();
          return true;
        } else {
          throw new Error(result.data?.error || 'Error al eliminar nota de venta');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al eliminar nota de venta', {
          description: errorMessage,
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchInvoices, fetchInvoiceStats]
  );

  // Agregar item a nota de venta
  const addInvoiceItem = useCallback(
    async (invoiceId: string, itemData: CreateItemData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost(`/api/invoices/${invoiceId}/items`, itemData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al agregar item');
          toast.error('Error al agregar item', {
            description: result.error || 'Error al agregar item',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Item agregado', {
            description: `${itemData.item_name} agregado a la nota de venta`,
          });

          if (currentInvoice?.id === invoiceId) {
            await fetchInvoiceById(invoiceId);
          }

          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al agregar item');
        }
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
    },
    [currentInvoice, fetchInvoiceById]
  );

  // Actualizar item de nota de venta
  const updateInvoiceItem = useCallback(
    async (invoiceId: string, itemId: string, itemData: Partial<InvoiceItem>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePut(
          `/api/invoices/${invoiceId}/items/${itemId}`,
          itemData,
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al actualizar item');
          toast.error('Error al actualizar item', {
            description: result.error || 'Error al actualizar item',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Item actualizado', {
            description: 'Los cambios han sido guardados',
          });

          if (currentInvoice?.id === invoiceId) {
            await fetchInvoiceById(invoiceId);
          }

          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al actualizar item');
        }
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
    },
    [currentInvoice, fetchInvoiceById]
  );

  // Eliminar item de nota de venta
  const deleteInvoiceItem = useCallback(
    async (invoiceId: string, itemId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safeDelete(
          `/api/invoices/${invoiceId}/items/${itemId}`,
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al eliminar item');
          toast.error('Error al eliminar item', {
            description: result.error || 'Error al eliminar item',
          });
          return false;
        }

        if (result.data?.success) {
          toast.success('Item eliminado', {
            description: 'El item ha sido eliminado de la nota de venta',
          });

          if (currentInvoice?.id === invoiceId) {
            await fetchInvoiceById(invoiceId);
          }

          return true;
        } else {
          throw new Error(result.data?.error || 'Error al eliminar item');
        }
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
    },
    [currentInvoice, fetchInvoiceById]
  );

  // Actualizar descuento de nota de venta
  const updateInvoiceDiscount = useCallback(
    async (invoiceId: string, discount: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePut<InvoiceResponse>(
          `/api/invoices/${invoiceId}/discount`,
          { discount },
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al actualizar descuento');
          toast.error('Error al actualizar descuento', {
            description: result.error || 'Error al actualizar descuento',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Descuento actualizado', {
            description: `Descuento de $${discount.toFixed(2)} aplicado`,
          });

          if (currentInvoice?.id === invoiceId) {
            await fetchInvoiceById(invoiceId);
          }

          await fetchInvoices();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al actualizar descuento');
        }
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
    },
    [currentInvoice, fetchInvoiceById, fetchInvoices]
  );

  // =====================================================
  // PAGOS
  // =====================================================

  // Obtener todos los pagos
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<PaymentsResponse>('/api/payments', {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar pagos');
        toast.error('Error al cargar pagos', {
          description: result.error || 'Error al cargar pagos',
        });
        return [];
      }

      if (result.data?.success) {
        setPayments(result.data.data);
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener pagos');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar pagos', {
        description: errorMessage,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener pagos por nota de venta
  const fetchPaymentsByInvoice = useCallback(async (invoiceId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<PaymentsResponse>(`/api/payments/invoice/${invoiceId}`, {
        timeout: 30000
      });

      if (!result.success) {
        setError(result.error || 'Error al cargar pagos');
        toast.error('Error al cargar pagos', {
          description: result.error || 'Error al cargar pagos',
        });
        return null;
      }

      if (result.data?.success) {
        return result.data.data;
      } else {
        throw new Error(result.data?.error || 'Error al obtener pagos');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar pagos', {
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear pago
  const createPayment = useCallback(
    async (paymentData: CreatePaymentData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<PaymentResponse>('/api/payments', paymentData, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al registrar pago');
          toast.error('Error al registrar pago', {
            description: result.error || 'Error al registrar pago',
          });
          return null;
        }

        if (result.data?.success) {
          const methodLabels = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            transfer: 'Transferencia',
            check: 'Cheque',
            other: 'Otro',
          };

          toast.success('Pago registrado exitosamente', {
            description: `$${paymentData.amount.toFixed(2)} - ${
              methodLabels[paymentData.payment_method]
            }`,
          });

          await fetchPayments();
          await fetchInvoiceStats();

          // Actualizar la nota de venta actual si es la misma
          if (currentInvoice?.id === paymentData.invoice_id) {
            await fetchInvoiceById(paymentData.invoice_id);
          }

          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al registrar pago');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al registrar pago', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentInvoice, fetchPayments, fetchInvoiceStats, fetchInvoiceById]
  );

  // Eliminar pago
  const deletePayment = useCallback(
    async (paymentId: string, invoiceId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safeDelete(`/api/payments/${paymentId}`, {
          timeout: 30000
        });

        if (!result.success) {
          setError(result.error || 'Error al eliminar pago');
          toast.error('Error al eliminar pago', {
            description: result.error || 'Error al eliminar pago',
          });
          return false;
        }

        if (result.data?.success) {
          toast.success('Pago eliminado', {
            description: 'El pago ha sido eliminado correctamente',
          });

          await fetchPayments();
          await fetchInvoiceStats();

          // Actualizar la nota de venta actual si es la misma
          if (currentInvoice?.id === invoiceId) {
            await fetchInvoiceById(invoiceId);
          }

          return true;
        } else {
          throw new Error(result.data?.error || 'Error al eliminar pago');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al eliminar pago', {
          description: errorMessage,
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentInvoice, fetchPayments, fetchInvoiceStats, fetchInvoiceById]
  );

  // =====================================================
  // FUNCIONES DE ESTADO
  // =====================================================

  // Establecer cotización actual
  const setCurrentQuotationState = useCallback((quotation: Quotation | null) => {
    setCurrentQuotation(quotation);
  }, []);

  // Establecer nota de venta actual
  const setCurrentInvoiceState = useCallback((invoice: SalesInvoice | null) => {
    setCurrentInvoice(invoice);
  }, []);

  // =====================================================
  // CONVERSIONES
  // =====================================================

  // Convertir orden de trabajo a cotización
  const convertWorkOrderToQuotation = useCallback(
    async (workOrderId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<ConversionResponse>(
          '/api/conversions/work-order-to-quotation',
          { work_order_id: workOrderId },
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al crear cotización');
          toast.error('Error al crear cotización', {
            description: result.error || 'Error al crear cotización',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Cotización creada desde orden de trabajo', {
            description: `Cotización ${result.data.data.quotation?.quotation_number} generada`,
          });

          await fetchQuotations();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al crear cotización');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al crear cotización', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchQuotations]
  );

  // Convertir cotización a nota de venta
  const convertQuotationToInvoice = useCallback(
    async (quotationId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<ConversionResponse>(
          '/api/conversions/quotation-to-invoice',
          { quotation_id: quotationId },
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al crear nota de venta');
          toast.error('Error al crear nota de venta', {
            description: result.error || 'Error al crear nota de venta',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Nota de venta creada desde cotización', {
            description: `Nota ${result.data.data.invoice?.invoice_number} generada`,
          });

          await fetchInvoices();
          await fetchQuotations(); // Actualizar cotizaciones para reflejar estado "converted"
          await fetchInvoiceStats();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al crear nota de venta');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al crear nota de venta', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchInvoices, fetchQuotations, fetchInvoiceStats]
  );

  // Convertir orden de trabajo a nota de venta
  const convertWorkOrderToInvoice = useCallback(
    async (workOrderId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<ConversionResponse>(
          '/api/conversions/work-order-to-invoice',
          { work_order_id: workOrderId },
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al crear nota de venta');
          toast.error('Error al crear nota de venta', {
            description: result.error || 'Error al crear nota de venta',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Nota de venta creada desde orden de trabajo', {
            description: `Nota ${result.data.data.invoice?.invoice_number} generada`,
          });

          await fetchInvoices();
          await fetchInvoiceStats();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al crear nota de venta');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al crear nota de venta', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchInvoices, fetchInvoiceStats]
  );

  // Convertir cotización a nota de venta (endpoint específico)
  const convertQuotationToInvoiceById = useCallback(
    async (quotationId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await safePost<ConversionResponse>(
          `/api/quotations/${quotationId}/convert`,
          {},
          {
            timeout: 30000
          }
        );

        if (!result.success) {
          setError(result.error || 'Error al convertir cotización');
          toast.error('Error al convertir cotización', {
            description: result.error || 'Error al convertir cotización',
          });
          return null;
        }

        if (result.data?.success) {
          toast.success('Cotización convertida exitosamente', {
            description: `Nota ${result.data.data.invoice?.invoice_number} creada desde cotización`,
          });

          await fetchQuotations();
          await fetchInvoices();
          await fetchInvoiceStats();
          return result.data.data;
        } else {
          throw new Error(result.data?.error || 'Error al convertir cotización');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast.error('Error al convertir cotización', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchQuotations, fetchInvoices, fetchInvoiceStats]
  );

  // =====================================================
  // RETORNO DEL HOOK
  // =====================================================

  return {
    // Estados
    quotations,
    currentQuotation,
    invoices,
    currentInvoice,
    invoiceStats,
    payments,
    loading,
    error,

    // Cotizaciones
    fetchQuotations,
    searchQuotations,
    fetchQuotationById,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    updateQuotationStatus,
    addQuotationItem,
    updateQuotationItem,
    deleteQuotationItem,
    setCurrentQuotation: setCurrentQuotationState,

    // Notas de venta
    fetchInvoices,
    searchInvoices,
    fetchInvoiceStats,
    fetchInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    addInvoiceItem,
    updateInvoiceItem,
    deleteInvoiceItem,
    updateInvoiceDiscount,
    setCurrentInvoice: setCurrentInvoiceState,

    // Pagos
    fetchPayments,
    fetchPaymentsByInvoice,
    createPayment,
    deletePayment,

    // Conversiones
    convertWorkOrderToQuotation,
    convertQuotationToInvoice,
    convertWorkOrderToInvoice,
    convertQuotationToInvoiceById,
    
    // Aliases para compatibilidad
    createQuotationFromWorkOrder: convertWorkOrderToQuotation,
    createInvoiceFromQuotation: convertQuotationToInvoice,
    createInvoiceFromWorkOrder: convertWorkOrderToInvoice,
  };
}
