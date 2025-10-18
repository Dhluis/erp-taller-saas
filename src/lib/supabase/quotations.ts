/**
 * Servicio de Cotizaciones
 * Funciones para manejar cotizaciones del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Quotation, QuotationInsert, QuotationUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Quotation

export interface QuotationStats {
  total: number
  draft: number
  sent: number
  accepted: number
  rejected: number
  expired: number
  totalAmount: number
  totalAccepted: number
  totalPending: number
}

export interface CreateQuotationData {
  customer_id: string
  vehicle_id?: string
  issue_date: string
  valid_until: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  terms_conditions?: string
  created_by?: string
}

export interface UpdateQuotation {
  status?: string
  notes?: string
  terms_conditions?: string
  updated_by?: string
}

/**
 * Obtener cotizaciones
 */
export async function getQuotations(filters?: {
  status?: string
  customer_id?: string
  vehicle_id?: string
  date_from?: string
  date_to?: string
}): Promise<Quotation[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('quotations').select('*')
      
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id)
        }
        if (filters.vehicle_id) {
          query = query.eq('vehicle_id', filters.vehicle_id)
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
        throw new Error(`Failed to fetch quotations: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getQuotations',
      table: 'quotations'
    }
  )
}

/**
 * Obtener estadísticas de cotizaciones
 */
export async function getQuotationStats(): Promise<QuotationStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .select('status, total_amount')
      
      if (error) {
        throw new Error(`Failed to fetch quotation stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const draft = data?.filter(q => q.status === 'draft').length || 0
      const sent = data?.filter(q => q.status === 'sent').length || 0
      const accepted = data?.filter(q => q.status === 'accepted').length || 0
      const rejected = data?.filter(q => q.status === 'rejected').length || 0
      const expired = data?.filter(q => q.status === 'expired').length || 0
      
      const totalAmount = data?.reduce((sum, quotation) => sum + quotation.total_amount, 0) || 0
      const totalAccepted = data?.filter(q => q.status === 'accepted').reduce((sum, quotation) => sum + quotation.total_amount, 0) || 0
      const totalPending = data?.filter(q => ['draft', 'sent'].includes(q.status)).reduce((sum, quotation) => sum + quotation.total_amount, 0) || 0
      
      return {
        total,
        draft,
        sent,
        accepted,
        rejected,
        expired,
        totalAmount,
        totalAccepted,
        totalPending
      }
    },
    {
      operation: 'getQuotationStats',
      table: 'quotations'
    }
  )
}

/**
 * Crear cotización
 */
export async function createQuotation(quotation: CreateQuotationData): Promise<Quotation> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Generar número de cotización automático
      const { data: lastQuotation } = await client
        .from('quotations')
        .select('quotation_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      const lastNumber = lastQuotation?.quotation_number ? parseInt(lastQuotation.quotation_number.replace('QUO-', '')) : 0
      const quotationNumber = `QUO-${String(lastNumber + 1).padStart(6, '0')}`
      
      const { data, error } = await client
        .from('quotations')
        .insert({
          ...quotation,
          quotation_number: quotationNumber,
          status: 'draft'
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create quotation: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createQuotation',
      table: 'quotations'
    }
  )
}

/**
 * Actualizar cotización
 */
export async function updateQuotation(id: string, quotation: UpdateQuotation): Promise<Quotation> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .update(quotation)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update quotation: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateQuotation',
      table: 'quotations'
    }
  )
}

/**
 * Obtener cotización por ID
 */
export async function getQuotationById(id: string): Promise<Quotation | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new Error(`Failed to fetch quotation: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getQuotationById',
      table: 'quotations'
    }
  )
}

/**
 * Enviar cotización
 */
export async function sendQuotation(id: string): Promise<Quotation> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to send quotation: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'sendQuotation',
      table: 'quotations'
    }
  )
}

/**
 * Aceptar cotización
 */
export async function acceptQuotation(id: string): Promise<Quotation> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to accept quotation: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'acceptQuotation',
      table: 'quotations'
    }
  )
}

/**
 * Rechazar cotización
 */
export async function rejectQuotation(id: string, reason?: string): Promise<Quotation> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .update({
          status: 'rejected',
          notes: reason ? `${reason}` : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to reject quotation: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'rejectQuotation',
      table: 'quotations'
    }
  )
}

/**
 * Buscar cotizaciones
 */
export async function searchQuotations(searchTerm: string): Promise<Quotation[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('quotations')
        .select('*')
        .or(`quotation_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to search quotations: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchQuotations',
      table: 'quotations'
    }
  )
}

/**
 * Eliminar cotización
 */
export async function deleteQuotation(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('quotations')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete quotation: ${error.message}`)
      }
    },
    {
      operation: 'deleteQuotation',
      table: 'quotations'
    }
  )
}






