import { createClient } from '@/lib/supabase/client'

export interface Payment {
  id: string
  supplier_id: string
  invoice_number: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'transfer' | 'check' | 'card'
  reference?: string
  status: 'pending' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreatePaymentData {
  supplier_id: string
  invoice_number: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'transfer' | 'check' | 'card'
  reference?: string
  status: 'pending' | 'completed' | 'cancelled'
  notes?: string
}

export interface PaymentStats {
  totalPayments: number
  pendingPayments: number
  completedPayments: number
  cancelledPayments: number
  totalAmount: number
  pendingAmount: number
}

export async function getPayments(): Promise<Payment[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No payments found in database')
      return []
    }

    return data.map(payment => ({
      id: payment.id,
      supplier_id: payment.supplier_id || '',
      invoice_number: payment.invoice_number || 'N/A',
      amount: Number(payment.amount) || 0,
      payment_date: payment.payment_date || new Date().toISOString(),
      payment_method: payment.payment_method || 'transfer',
      reference: payment.reference || undefined,
      status: payment.status || 'pending',
      notes: payment.notes || undefined,
      created_at: payment.created_at || new Date().toISOString(),
      updated_at: payment.updated_at || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Unexpected error fetching payments:', error)
    return []
  }
}

export async function createPayment(paymentData: CreatePaymentData): Promise<Payment | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        supplier_id: paymentData.supplier_id,
        invoice_number: paymentData.invoice_number,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        reference: paymentData.reference,
        status: paymentData.status,
        notes: paymentData.notes
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating payment:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating payment:', error)
    return null
  }
}

export async function updatePayment(id: string, paymentData: Partial<CreatePaymentData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (paymentData.supplier_id) updateData.supplier_id = paymentData.supplier_id
    if (paymentData.invoice_number) updateData.invoice_number = paymentData.invoice_number
    if (paymentData.amount !== undefined) updateData.amount = paymentData.amount
    if (paymentData.payment_date) updateData.payment_date = paymentData.payment_date
    if (paymentData.payment_method) updateData.payment_method = paymentData.payment_method
    if (paymentData.reference !== undefined) updateData.reference = paymentData.reference
    if (paymentData.status) updateData.status = paymentData.status
    if (paymentData.notes !== undefined) updateData.notes = paymentData.notes

    const { error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating payment:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating payment:', error)
    return false
  }
}

export async function deletePayment(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting payment:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting payment:', error)
    return false
  }
}

export async function getPaymentStats(): Promise<PaymentStats> {
  const supabase = createClient()
  
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('status, amount')

    if (error) {
      console.error('Error fetching payment stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        totalPayments: 0,
        pendingPayments: 0,
        completedPayments: 0,
        cancelledPayments: 0,
        totalAmount: 0,
        pendingAmount: 0
      }
    }

    if (!payments || payments.length === 0) {
      console.log('No payments found for stats calculation')
      return {
        totalPayments: 0,
        pendingPayments: 0,
        completedPayments: 0,
        cancelledPayments: 0,
        totalAmount: 0,
        pendingAmount: 0
      }
    }

    const totalPayments = payments.length
    const pendingPayments = payments.filter(p => p.status === 'pending').length
    const completedPayments = payments.filter(p => p.status === 'completed').length
    const cancelledPayments = payments.filter(p => p.status === 'cancelled').length
    const totalAmount = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)

    return {
      totalPayments,
      pendingPayments,
      completedPayments,
      cancelledPayments,
      totalAmount,
      pendingAmount
    }
  } catch (error) {
    console.error('Unexpected error fetching payment stats:', error)
    return {
      totalPayments: 0,
      pendingPayments: 0,
      completedPayments: 0,
      cancelledPayments: 0,
      totalAmount: 0,
      pendingAmount: 0
    }
  }
}