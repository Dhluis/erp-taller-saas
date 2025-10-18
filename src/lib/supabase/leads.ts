/**
 * Servicio de Leads
 * Funciones para manejar leads de clientes potenciales
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Lead, LeadInsert, LeadUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Lead

export interface CreateLeadData {
  organization_id: string
  name: string
  email?: string
  phone?: string
  source?: string
  interest?: string
  estimated_value: number
  notes?: string
  campaign_id?: string
}

export interface UpdateLeadData {
  name?: string
  email?: string
  phone?: string
  source?: string
  status?: string
  interest?: string
  estimated_value?: number
  notes?: string
  campaign_id?: string
}

/**
 * Obtener leads
 */
export async function getLeads(filters?: {
  status?: string
  source?: string
  campaign_id?: string
  date_from?: string
  date_to?: string
}): Promise<Lead[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('leads').select('*')
      
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.source) {
          query = query.eq('source', filters.source)
        }
        if (filters.campaign_id) {
          query = query.eq('campaign_id', filters.campaign_id)
        }
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getLeads',
      table: 'leads'
    }
  )
}

/**
 * Obtener estadísticas de leads
 */
export async function getLeadStats(): Promise<{
  total: number
  new: number
  contacted: number
  qualified: number
  proposal: number
  negotiation: number
  closed_won: number
  closed_lost: number
  totalValue: number
  conversionRate: number
}> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('leads')
        .select('status, estimated_value')
      
      if (error) {
        throw new Error(`Failed to fetch lead stats: ${error.message}`)
      }
      
      const leads = data || []
      const total = leads.length
      const newLeads = leads.filter(lead => lead.status === 'new').length
      const contacted = leads.filter(lead => lead.status === 'contacted').length
      const qualified = leads.filter(lead => lead.status === 'qualified').length
      const proposal = leads.filter(lead => lead.status === 'proposal').length
      const negotiation = leads.filter(lead => lead.status === 'negotiation').length
      const closed_won = leads.filter(lead => lead.status === 'closed_won').length
      const closed_lost = leads.filter(lead => lead.status === 'closed_lost').length
      
      const totalValue = leads.reduce((sum, lead) => sum + lead.estimated_value, 0)
      const conversionRate = total > 0 ? (closed_won / total) * 100 : 0
      
      return {
        total,
        new: newLeads,
        contacted,
        qualified,
        proposal,
        negotiation,
        closed_won,
        closed_lost,
        totalValue,
        conversionRate
      }
    },
    {
      operation: 'getLeadStats',
      table: 'leads'
    }
  )
}

/**
 * Obtener lead por ID
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch lead: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getLeadById',
      table: 'leads'
    }
  )
}

/**
 * Crear lead
 */
export async function createLead(lead: CreateLeadData): Promise<Lead> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('leads')
        .insert({
          ...lead,
          status: 'new'
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create lead: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createLead',
      table: 'leads'
    }
  )
}

/**
 * Actualizar lead
 */
export async function updateLead(id: string, lead: UpdateLeadData): Promise<Lead> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('leads')
        .update({
          ...lead,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update lead: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateLead',
      table: 'leads'
    }
  )
}

/**
 * Convertir lead en cliente
 */
export async function convertLeadToCustomer(leadId: string): Promise<Lead> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('leads')
        .update({
          status: 'closed_won',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to convert lead: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'convertLeadToCustomer',
      table: 'leads'
    }
  )
}

/**
 * Buscar leads por nombre, email o teléfono
 */
export async function searchLeads(searchTerm: string): Promise<Lead[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('leads')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to search leads: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchLeads',
      table: 'leads'
    }
  )
}

/**
 * Eliminar lead
 */
export async function deleteLead(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('leads')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete lead: ${error.message}`)
      }
    },
    {
      operation: 'deleteLead',
      table: 'leads'
    }
  )
}






