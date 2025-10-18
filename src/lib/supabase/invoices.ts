/**
 * Servicio de Facturas
 * Funciones para manejar facturas del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Invoice, InvoiceInsert, InvoiceUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Invoice

export interface InvoiceStats {
  total: number
  draft: number
  sent: number
  paid: number
  overdue: number
  cancelled: number
  pending: number
  partial: number
  totalAmount: number
  totalPaid: number
  totalPending: number
}

export interface CreateInvoice {
  customer_id: string
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  created_by?: string
}

export interface UpdateInvoice {
  status?: string
  notes?: string
  updated_by?: string
}

/**
 * Obtener facturas
 */
export async function getInvoices(filters?: {
  status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
}): Promise<Invoice[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('invoices').select('*')
      
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id)
        }
        if (filters.date_from) {
          query = query.gte('issue_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('issue_date', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch invoices: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getInvoices',
      table: 'invoices'
    }
  )
}

/**
 * Obtener estadísticas de facturas
 */
export async function getInvoiceStats(): Promise<InvoiceStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('sales_invoices')
        .select('status, total_amount, paid_amount')
      
      if (error) {
        throw new Error(`Failed to fetch invoice stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const draft = data?.filter(i => i.status === 'draft').length || 0
      const sent = data?.filter(i => i.status === 'sent').length || 0
      const paid = data?.filter(i => i.status === 'paid').length || 0
      const overdue = data?.filter(i => i.status === 'overdue').length || 0
      const cancelled = data?.filter(i => i.status === 'cancelled').length || 0
      const pending = data?.filter(i => i.status === 'pending').length || 0
      const partial = data?.filter(i => i.status === 'partial').length || 0
      
      const totalAmount = data?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0
      const totalPaid = data?.filter(i => i.status === 'paid').reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0
      const totalPending = data?.filter(i => ['draft', 'sent', 'overdue', 'pending', 'partial'].includes(i.status)).reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0
      
      return {
        total,
        draft,
        sent,
        paid,
        overdue,
        cancelled,
        pending,
        partial,
        totalAmount,
        totalPaid,
        totalPending
      }
    },
    {
      operation: 'getInvoiceStats',
      table: 'sales_invoices'
    }
  )
}

/**
 * Crear factura
 */
export async function createInvoice(invoice: CreateInvoice): Promise<Invoice> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Generar número de factura automático
      const { data: lastInvoice } = await client
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      const lastNumber = lastInvoice?.invoice_number ? parseInt(lastInvoice.invoice_number.replace('INV-', '')) : 0
      const invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`
      
      const { data, error } = await client
        .from('invoices')
        .insert({
          ...invoice,
          invoice_number: invoiceNumber,
          status: 'draft'
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create invoice: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createInvoice',
      table: 'invoices'
    }
  )
}

/**
 * Actualizar factura
 */
export async function updateInvoice(id: string, invoice: UpdateInvoice): Promise<Invoice> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('invoices')
        .update(invoice)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update invoice: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateInvoice',
      table: 'invoices'
    }
  )
}

/**
 * Obtener factura por ID
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new Error(`Failed to fetch invoice: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getInvoiceById',
      table: 'invoices'
    }
  )
}

/**
 * Marcar factura como pagada
 */
export async function markInvoiceAsPaid(id: string, paymentDate?: string): Promise<Invoice> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('invoices')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to mark invoice as paid: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'markInvoiceAsPaid',
      table: 'invoices'
    }
  )
}

/**
 * Eliminar factura
 */
export async function deleteInvoice(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('invoices')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete invoice: ${error.message}`)
      }
    },
    {
      operation: 'deleteInvoice',
      table: 'invoices'
    }
  )
}