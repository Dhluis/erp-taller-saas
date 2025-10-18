/**
 * Servicio de Campañas
 * Funciones para manejar campañas de marketing
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Campaign, CampaignInsert, CampaignUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Campaign

export interface CreateCampaignData {
  organization_id: string
  name: string
  description?: string
  start_date?: string
  end_date?: string
  budget: number
}

export interface UpdateCampaignData {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
  budget?: number
  status?: string
}

/**
 * Obtener campañas
 */
export async function getCampaigns(filters?: {
  status?: string
  date_from?: string
  date_to?: string
}): Promise<Campaign[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('campaigns').select('*')
      
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.date_from) {
          query = query.gte('start_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('end_date', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch campaigns: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getCampaigns',
      table: 'campaigns'
    }
  )
}

/**
 * Obtener campaña por ID
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch campaign: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getCampaignById',
      table: 'campaigns'
    }
  )
}

/**
 * Crear campaña
 */
export async function createCampaign(campaign: CreateCampaignData): Promise<Campaign> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .insert({
          ...campaign,
          status: 'active'
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create campaign: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createCampaign',
      table: 'campaigns'
    }
  )
}

/**
 * Actualizar campaña
 */
export async function updateCampaign(id: string, campaign: UpdateCampaignData): Promise<Campaign> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .update({
          ...campaign,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update campaign: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateCampaign',
      table: 'campaigns'
    }
  )
}

/**
 * Pausar campaña
 */
export async function pauseCampaign(id: string): Promise<Campaign> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to pause campaign: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'pauseCampaign',
      table: 'campaigns'
    }
  )
}

/**
 * Activar campaña
 */
export async function activateCampaign(id: string): Promise<Campaign> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to activate campaign: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'activateCampaign',
      table: 'campaigns'
    }
  )
}

/**
 * Completar campaña
 */
export async function completeCampaign(id: string): Promise<Campaign> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to complete campaign: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'completeCampaign',
      table: 'campaigns'
    }
  )
}

/**
 * Buscar campañas por nombre
 */
export async function searchCampaigns(searchTerm: string): Promise<Campaign[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to search campaigns: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchCampaigns',
      table: 'campaigns'
    }
  )
}

/**
 * Eliminar campaña
 */
export async function deleteCampaign(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('campaigns')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete campaign: ${error.message}`)
      }
    },
    {
      operation: 'deleteCampaign',
      table: 'campaigns'
    }
  )
}







