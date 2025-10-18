import { createClient } from '@/lib/supabase/client'

export interface Quotation {
  id: string
  quotation_number: string
  client_id: string
  vehicle_id: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  converted_to_order: boolean
  order_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relaciones
  customers?: {
    name: string
    email: string
  }
  vehicles?: {
    brand: string
    model: string
    year: number
    license_plate: string
  }
}

export interface CreateQuotationData {
  quotation_number: string
  client_id: string
  vehicle_id: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  notes?: string
}

export interface QuotationStats {
  totalQuotations: number
  draftQuotations: number
  sentQuotations: number
  acceptedQuotations: number
  rejectedQuotations: number
  expiredQuotations: number
  totalValue: number
  conversionRate: number
}

export async function getQuotations(): Promise<Quotation[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers:client_id(name, email),
        vehicles:vehicle_id(brand, model, year, license_plate)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quotations:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No quotations found in database')
      return []
    }

    return data.map(quotation => ({
      id: quotation.id,
      quotation_number: quotation.quotation_number || 'N/A',
      client_id: quotation.client_id || '',
      vehicle_id: quotation.vehicle_id || '',
      status: quotation.status || 'draft',
      valid_until: quotation.valid_until || new Date().toISOString(),
      subtotal: Number(quotation.subtotal) || 0,
      discount_amount: Number(quotation.discount_amount) || 0,
      tax_amount: Number(quotation.tax_amount) || 0,
      total: Number(quotation.total) || 0,
      converted_to_order: quotation.converted_to_order || false,
      order_id: quotation.order_id || undefined,
      notes: quotation.notes || undefined,
      created_at: quotation.created_at || new Date().toISOString(),
      updated_at: quotation.updated_at || new Date().toISOString(),
      customers: quotation.customers ? {
        name: quotation.customers.name || 'Cliente desconocido',
        email: quotation.customers.email || ''
      } : undefined,
      vehicles: quotation.vehicles ? {
        brand: quotation.vehicles.brand || 'Marca desconocida',
        model: quotation.vehicles.model || 'Modelo desconocido',
        year: quotation.vehicles.year || 0,
        license_plate: quotation.vehicles.license_plate || 'Sin placas'
      } : undefined
    }))
  } catch (error) {
    console.error('Unexpected error fetching quotations:', error)
    return []
  }
}

export async function createQuotation(quotationData: CreateQuotationData): Promise<Quotation | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('quotations')
      .insert([{
        quotation_number: quotationData.quotation_number,
        client_id: quotationData.client_id,
        vehicle_id: quotationData.vehicle_id,
        status: quotationData.status,
        valid_until: quotationData.valid_until,
        subtotal: quotationData.subtotal,
        discount_amount: quotationData.discount_amount,
        tax_amount: quotationData.tax_amount,
        total: quotationData.total,
        notes: quotationData.notes
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating quotation:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating quotation:', error)
    return null
  }
}

export async function updateQuotation(id: string, quotationData: Partial<CreateQuotationData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (quotationData.quotation_number) updateData.quotation_number = quotationData.quotation_number
    if (quotationData.client_id) updateData.client_id = quotationData.client_id
    if (quotationData.vehicle_id) updateData.vehicle_id = quotationData.vehicle_id
    if (quotationData.status) updateData.status = quotationData.status
    if (quotationData.valid_until) updateData.valid_until = quotationData.valid_until
    if (quotationData.subtotal !== undefined) updateData.subtotal = quotationData.subtotal
    if (quotationData.discount_amount !== undefined) updateData.discount_amount = quotationData.discount_amount
    if (quotationData.tax_amount !== undefined) updateData.tax_amount = quotationData.tax_amount
    if (quotationData.total !== undefined) updateData.total = quotationData.total
    if (quotationData.notes !== undefined) updateData.notes = quotationData.notes

    const { error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating quotation:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating quotation:', error)
    return false
  }
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting quotation:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return false
  }
}

export async function getQuotationStats(): Promise<QuotationStats> {
  const supabase = createClient()
  
  try {
    const { data: quotations, error } = await supabase
      .from('quotations')
      .select('status, total, converted_to_order')

    if (error) {
      console.error('Error fetching quotation stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        totalQuotations: 0,
        draftQuotations: 0,
        sentQuotations: 0,
        acceptedQuotations: 0,
        rejectedQuotations: 0,
        expiredQuotations: 0,
        totalValue: 0,
        conversionRate: 0
      }
    }

    if (!quotations || quotations.length === 0) {
      console.log('No quotations found for stats calculation')
      return {
        totalQuotations: 0,
        draftQuotations: 0,
        sentQuotations: 0,
        acceptedQuotations: 0,
        rejectedQuotations: 0,
        expiredQuotations: 0,
        totalValue: 0,
        conversionRate: 0
      }
    }

    const totalQuotations = quotations.length
    const draftQuotations = quotations.filter(q => q.status === 'draft').length
    const sentQuotations = quotations.filter(q => q.status === 'sent').length
    const acceptedQuotations = quotations.filter(q => q.status === 'accepted').length
    const rejectedQuotations = quotations.filter(q => q.status === 'rejected').length
    const expiredQuotations = quotations.filter(q => q.status === 'expired').length
    const totalValue = quotations.reduce((sum, quotation) => sum + (Number(quotation.total) || 0), 0)
    const convertedQuotations = quotations.filter(q => q.converted_to_order).length
    const conversionRate = totalQuotations > 0 ? (convertedQuotations / totalQuotations) * 100 : 0

    return {
      totalQuotations,
      draftQuotations,
      sentQuotations,
      acceptedQuotations,
      rejectedQuotations,
      expiredQuotations,
      totalValue,
      conversionRate
    }
  } catch (error) {
    console.error('Unexpected error fetching quotation stats:', error)
    return {
      totalQuotations: 0,
      draftQuotations: 0,
      sentQuotations: 0,
      acceptedQuotations: 0,
      rejectedQuotations: 0,
      expiredQuotations: 0,
      totalValue: 0,
      conversionRate: 0
    }
  }
}
