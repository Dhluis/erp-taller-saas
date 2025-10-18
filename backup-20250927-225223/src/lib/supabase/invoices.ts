import { getBrowserClient } from '@/lib/supabase/client-robust'
import { browserOperations } from '@/lib/supabase/operations'
import { handleError, SupabaseError } from '@/lib/errors'

export interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_rfc: string
  vehicle_info: string
  service_description: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  total: number
  subtotal: number
  tax_amount: number
  due_date: string
  paid_date?: string
  payment_method?: string
  created_at: string
  updated_at: string
  notes?: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface CreateInvoiceData {
  invoice_number: string
  customer_name: string
  customer_rfc: string
  vehicle_info: string
  service_description: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  subtotal: number
  tax_amount: number
  total: number
  due_date: string
  paid_date?: string
  payment_method?: string
  notes?: string
}

export interface InvoiceStats {
  totalInvoices: number
  pendingInvoices: number
  paidInvoices: number
  overdueInvoices: number
  totalAmount: number
  totalPaid: number
  totalPending: number
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const { data, error, success } = await browserOperations.select<Invoice>('invoices')

    if (!success || error) {
      throw new SupabaseError('Error fetching invoices', error)
    }

    return data || []
  } catch (error) {
    const appError = handleError(error)
    console.error('Error fetching invoices:', appError.message)
    return []
  }
}

export async function createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceData.invoice_number,
        customer_name: invoiceData.customer_name,
        customer_rfc: invoiceData.customer_rfc,
        vehicle_info: invoiceData.vehicle_info,
        service_description: invoiceData.service_description,
        status: invoiceData.status,
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax_amount,
        total: invoiceData.total,
        due_date: invoiceData.due_date,
        paid_date: invoiceData.paid_date,
        payment_method: invoiceData.payment_method,
        notes: invoiceData.notes
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating invoice:', error)
    return null
  }
}

export async function updateInvoice(id: string, invoiceData: Partial<CreateInvoiceData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Solo incluir campos que existen en la tabla
    if (invoiceData.invoice_number) updateData.invoice_number = invoiceData.invoice_number
    if (invoiceData.customer_name) updateData.customer_name = invoiceData.customer_name
    if (invoiceData.customer_rfc) updateData.customer_rfc = invoiceData.customer_rfc
    if (invoiceData.vehicle_info) updateData.vehicle_info = invoiceData.vehicle_info
    if (invoiceData.service_description) updateData.service_description = invoiceData.service_description
    if (invoiceData.status) updateData.status = invoiceData.status
    if (invoiceData.subtotal !== undefined) updateData.subtotal = invoiceData.subtotal
    if (invoiceData.tax_amount !== undefined) updateData.tax = invoiceData.tax_amount
    if (invoiceData.total !== undefined) updateData.total = invoiceData.total
    if (invoiceData.due_date) updateData.due_date = invoiceData.due_date
    if (invoiceData.paid_date) updateData.paid_date = invoiceData.paid_date
    if (invoiceData.payment_method) updateData.payment_method = invoiceData.payment_method
    if (invoiceData.notes !== undefined) updateData.notes = invoiceData.notes

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating invoice:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating invoice:', error)
    return false
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting invoice:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return false
  }
}

export async function getInvoiceStats(): Promise<InvoiceStats> {
  try {
    const { data: invoices, error, success } = await browserOperations.select<{
      status: string
      total: number
    }>('invoices', 'status, total')

    if (!success || error) {
      throw new SupabaseError('Error fetching invoice stats', error)
    }

    if (!invoices || invoices.length === 0) {
      console.log('No invoices found for stats calculation')
      return {
        totalInvoices: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0
      }
    }

    const totalInvoices = invoices.length
    const pendingInvoices = invoices.filter(i => i.status === 'sent').length
    const paidInvoices = invoices.filter(i => i.status === 'paid').length
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length
    const totalAmount = invoices.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0)
    const totalPaid = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0)
    const totalPending = invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0)

    return {
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      totalAmount,
      totalPaid,
      totalPending
    }
  } catch (error) {
    const appError = handleError(error)
    console.error('Error fetching invoice stats:', appError.message)
    return {
      totalInvoices: 0,
      pendingInvoices: 0,
      paidInvoices: 0,
      overdueInvoices: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0
    }
  }
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    if (error) {
      console.error('Error fetching invoice items:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching invoice items:', error)
    return []
  }
}