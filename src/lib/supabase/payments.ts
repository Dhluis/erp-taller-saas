/**
 * Servicio de Pagos
 * Funciones para manejar pagos del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Payment, PaymentInsert, PaymentUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Payment

export interface PaymentStats {
  total: number
  pending: number
  completed: number
  failed: number
  cancelled: number
  totalAmount: number
  totalCompleted: number
  totalPending: number
}

export interface CreatePayment {
  supplier_id: string
  supplier_name?: string
  amount: number
  currency?: string
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other' | 'transfer'
  method?: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other' | 'transfer'
  payment_date: string
  due_date?: string
  reference_number?: string
  reference?: string
  notes?: string
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'paid' | 'overdue'
  created_by?: string
}

export interface UpdatePayment {
  amount?: number
  payment_method?: string
  payment_date?: string
  status?: string
  reference_number?: string
  notes?: string
  updated_by?: string
}

/**
 * Obtener pagos
 */
export async function getPayments(filters?: {
  status?: string
  supplier_id?: string
  payment_method?: string
  date_from?: string
  date_to?: string
}): Promise<Payment[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('payments').select('*')
      
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.supplier_id) {
          query = query.eq('supplier_id', filters.supplier_id)
        }
        if (filters.payment_method) {
          query = query.eq('payment_method', filters.payment_method)
        }
        if (filters.date_from) {
          query = query.gte('payment_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('payment_date', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('payment_date', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch payments: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getPayments',
      table: 'payments'
    }
  )
}

/**
 * Obtener estadísticas de pagos
 */
export async function getPaymentStats(): Promise<PaymentStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('payments')
        .select('status, amount')
      
      if (error) {
        throw new Error(`Failed to fetch payment stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const pending = data?.filter(p => p.status === 'pending').length || 0
      const completed = data?.filter(p => p.status === 'completed').length || 0
      const failed = data?.filter(p => p.status === 'failed').length || 0
      const cancelled = data?.filter(p => p.status === 'cancelled').length || 0
      
      const totalAmount = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      const totalCompleted = data?.filter(p => p.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0) || 0
      const totalPending = data?.filter(p => p.status === 'pending').reduce((sum, payment) => sum + payment.amount, 0) || 0
      
      return {
        total,
        pending,
        completed,
        failed,
        cancelled,
        totalAmount,
        totalCompleted,
        totalPending
      }
    },
    {
      operation: 'getPaymentStats',
      table: 'payments'
    }
  )
}

/**
 * Crear pago
 */
export async function createPayment(organizationId: string, payment: CreatePayment): Promise<Payment> {
  // Validar que organizationId no sea vacío
  if (!organizationId || organizationId.trim() === '') {
    throw new Error('organizationId es requerido para crear un pago')
  }

  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Preparar datos para insertar (solo campos que existen en la tabla)
      const insertData = {
        organization_id: organizationId,
        supplier_id: payment.supplier_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method || payment.method || 'transfer',
        reference: payment.reference || payment.reference_number,
        status: payment.status || 'pending',
        notes: payment.notes
      }
      
      const { data, error } = await client
        .from('payments')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create payment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createPayment',
      table: 'payments'
    }
  )
}

/**
 * Actualizar pago
 */
export async function updatePayment(id: string, payment: UpdatePayment): Promise<Payment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('payments')
        .update(payment)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update payment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updatePayment',
      table: 'payments'
    }
  )
}

/**
 * Obtener pago por ID
 */
export async function getPaymentById(id: string): Promise<Payment | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('payments')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new Error(`Failed to fetch payment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getPaymentById',
      table: 'payments'
    }
  )
}

/**
 * Marcar pago como completado
 */
export async function markPaymentAsCompleted(id: string): Promise<Payment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to mark payment as completed: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'markPaymentAsCompleted',
      table: 'payments'
    }
  )
}

/**
 * Buscar pagos
 */
export async function searchPayments(searchTerm: string): Promise<Payment[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('payments')
        .select('*')
        .or(`payment_number.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
        .order('payment_date', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to search payments: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchPayments',
      table: 'payments'
    }
  )
}

/**
 * Eliminar pago
 */
export async function deletePayment(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('payments')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete payment: ${error.message}`)
      }
    },
    {
      operation: 'deletePayment',
      table: 'payments'
    }
  )
}



