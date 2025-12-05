import { createServerClient } from '@/lib/supabase/server';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'other';

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  payment_number: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
  created_by: string | null;
  invoice?: {
    id: string;
    invoice_number: string;
    customer_id: string;
    total_amount: number;
    customer?: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

export interface CreatePaymentData {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
  payment_date: string;
  created_by?: string;
}

export interface UpdatePaymentData {
  amount?: number;
  payment_method?: PaymentMethod;
  reference?: string;
  notes?: string;
  payment_date?: string;
}

export interface PaymentStats {
  total_payments: number;
  total_amount: number;
  average_payment: number;
  payments_by_method: Record<PaymentMethod, number>;
  payments_by_month: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

// =====================================================
// FUNCIONES DE PAGOS
// =====================================================

export async function getAllPayments(
  organizationId: string = 'default',
  invoiceId?: string
): Promise<Payment[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('payments')
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .eq('organization_id', organizationId)
    .order('payment_date', { ascending: false });

  if (invoiceId) {
    query = query.eq('invoice_id', invoiceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payments:', error);
    throw new Error('Error al obtener pagos');
  }

  return data || [];
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payment:', error);
    throw new Error('Error al obtener pago');
  }

  return data;
}

export async function createPayment(data: CreatePaymentData): Promise<Payment> {
  const supabase = createServerClient();
  
  const paymentData = {
    organization_id: 'default',
    invoice_id: data.invoice_id,
    amount: data.amount,
    payment_method: data.payment_method,
    reference: data.reference || null,
    notes: data.notes || null,
    payment_date: data.payment_date,
    created_by: data.created_by || null,
  };

  const { data: payment, error } = await supabase
    .from('payments')
    .insert(paymentData as any)
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    throw new Error('Error al crear pago');
  }

  return payment;
}

export async function updatePayment(
  id: string,
  data: UpdatePaymentData
): Promise<Payment> {
  const supabase = createServerClient();
  
  const { data: payment, error } = await supabase
    .from('payments')
    .update(data as any)
    .eq('id', id)
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .single();

  if (error) {
    console.error('Error updating payment:', error);
    throw new Error('Error al actualizar pago');
  }

  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting payment:', error);
    throw new Error('Error al eliminar pago');
  }
}

export async function searchPayments(
  searchTerm: string,
  organizationId: string = 'default'
): Promise<Payment[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .eq('organization_id', organizationId)
    .or(`payment_number.ilike.%${searchTerm}%,reference.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,invoice.invoice_number.ilike.%${searchTerm}%,invoice.customer.name.ilike.%${searchTerm}%`)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error searching payments:', error);
    throw new Error('Error al buscar pagos');
  }

  return data || [];
}

export async function getPaymentsByInvoice(
  invoiceId: string,
  organizationId: string = 'default'
): Promise<Payment[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .eq('organization_id', organizationId)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching payments by invoice:', error);
    throw new Error('Error al obtener pagos de la nota de venta');
  }

  return data || [];
}

export async function getPaymentsByCustomer(
  customerId: string,
  organizationId: string = 'default'
): Promise<Payment[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:sales_invoices(
        id,
        invoice_number,
        customer_id,
        total_amount,
        customer:customers(id, name, email, phone)
      )
    `)
    .eq('organization_id', organizationId)
    .eq('invoice.customer_id', customerId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching payments by customer:', error);
    throw new Error('Error al obtener pagos del cliente');
  }

  return data || [];
}

export async function getPaymentStats(
  organizationId: string = 'default',
  startDate?: string,
  endDate?: string
): Promise<PaymentStats> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('payments')
    .select('amount, payment_method, payment_date')
    .eq('organization_id', organizationId);

  if (startDate) {
    query = query.gte('payment_date', startDate);
  }
  if (endDate) {
    query = query.lte('payment_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payment stats:', error);
    throw new Error('Error al obtener estadísticas de pagos');
  }

  const stats: PaymentStats = {
    total_payments: 0,
    total_amount: 0,
    average_payment: 0,
    payments_by_method: {
      cash: 0,
      card: 0,
      transfer: 0,
      check: 0,
      other: 0,
    },
    payments_by_month: [],
  };

  if (data && data.length > 0) {
    stats.total_payments = data.length;
    stats.total_amount = data.reduce((sum, payment) => sum + payment.amount, 0);
    stats.average_payment = stats.total_amount / stats.total_payments;

    // Agrupar por método de pago
    data.forEach((payment) => {
      stats.payments_by_method[payment.payment_method]++;
    });

    // Agrupar por mes
    const monthlyData = data.reduce((acc, payment) => {
      const month = payment.payment_date.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { count: 0, amount: 0 };
      }
      acc[month].count++;
      acc[month].amount += payment.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    stats.payments_by_month = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  return stats;
}

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

export async function getTotalPaidByInvoice(
  invoiceId: string,
  organizationId: string = 'default'
): Promise<number> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('invoice_id', invoiceId);

  if (error) {
    console.error('Error fetching total paid by invoice:', error);
    throw new Error('Error al obtener total pagado de la nota de venta');
  }

  return data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
}

export async function getPaymentMethods(): Promise<Array<{ value: PaymentMethod; label: string }>> {
  return [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'check', label: 'Cheque' },
    { value: 'other', label: 'Otro' },
  ];
}

export async function validatePaymentAmount(
  invoiceId: string,
  amount: number,
  organizationId: string = 'default'
): Promise<{ valid: boolean; message?: string }> {
  const supabase = createServerClient();
  
  // Obtener total de la nota de venta
  const { data: invoice, error: invoiceError } = await supabase
    .from('sales_invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .eq('organization_id', organizationId)
    .single();

  if (invoiceError || !invoice) {
    return { valid: false, message: 'Nota de venta no encontrada' };
  }

  // Obtener total ya pagado
  const totalPaid = await getTotalPaidByInvoice(invoiceId, organizationId);
  const remainingAmount = invoice.total_amount - totalPaid;

  if (amount <= 0) {
    return { valid: false, message: 'El monto debe ser mayor a 0' };
  }

  if (amount > remainingAmount) {
    return { 
      valid: false, 
      message: `El monto no puede ser mayor al saldo pendiente ($${remainingAmount.toFixed(2)})` 
    };
  }

  return { valid: true };
}

