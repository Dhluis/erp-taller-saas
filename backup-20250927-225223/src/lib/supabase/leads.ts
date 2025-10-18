import { createClient } from './client'

const supabase = createClient()

export interface Lead {
  id: string
  organization_id: string
  name: string
  company?: string
  phone: string
  email: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  value: number
  notes?: string
  last_contact?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  organization_id: string
  name: string
  type: 'email' | 'phone' | 'social' | 'event'
  status: 'active' | 'paused' | 'completed'
  leads_generated: number
  conversion_rate: number
  budget: number
  spent: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

export type CreateLeadData = Omit<Lead, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
export type UpdateLeadData = Partial<CreateLeadData>
export type CreateCampaignData = Omit<Campaign, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
export type UpdateCampaignData = Partial<CreateCampaignData>

// =====================================================
// LEADS FUNCTIONS
// =====================================================

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }
  return data as Lead[]
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching lead:', error)
    return null
  }
  return data as Lead
}

export async function createLead(leadData: CreateLeadData): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    return null
  }
  return data as Lead
}

export async function updateLead(id: string, leadData: UpdateLeadData): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .update(leadData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating lead:', error)
    return null
  }
  return data as Lead
}

export async function deleteLead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting lead:', error)
    return false
  }
  return true
}

export async function searchLeads(query: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching leads:', error)
    return []
  }
  return data as Lead[]
}

// =====================================================
// CAMPAIGNS FUNCTIONS
// =====================================================

export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }
  return data as Campaign[]
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching campaign:', error)
    return null
  }
  return data as Campaign
}

export async function createCampaign(campaignData: CreateCampaignData): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert([campaignData])
    .select()
    .single()

  if (error) {
    console.error('Error creating campaign:', error)
    return null
  }
  return data as Campaign
}

export async function updateCampaign(id: string, campaignData: UpdateCampaignData): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .update(campaignData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating campaign:', error)
    return null
  }
  return data as Campaign
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting campaign:', error)
    return false
  }
  return true
}

// =====================================================
// ANALYTICS FUNCTIONS
// =====================================================

export async function getLeadsStats() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')

  if (error) {
    console.error('Error fetching leads stats:', error)
    return {
      total: 0,
      totalValue: 0,
      conversionRate: 0,
      activeCampaigns: 0,
      leadsBySource: {},
      leadsByStatus: {}
    }
  }

  const total = leads?.length || 0
  const totalValue = leads?.reduce((sum, lead) => sum + lead.value, 0) || 0
  const wonLeads = leads?.filter(lead => lead.status === 'won').length || 0
  const conversionRate = total > 0 ? ((wonLeads / total) * 100) : 0

  // Agrupar por fuente
  const leadsBySource = leads?.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Agrupar por estado
  const leadsByStatus = leads?.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return {
    total,
    totalValue,
    conversionRate,
    activeCampaigns: 0, // Se calculará por separado
    leadsBySource,
    leadsByStatus
  }
}

export async function getCampaignsStats() {
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')

  if (error) {
    console.error('Error fetching campaigns stats:', error)
    return {
      active: 0,
      totalBudget: 0,
      totalSpent: 0,
      totalLeadsGenerated: 0,
      averageConversionRate: 0
    }
  }

  const active = campaigns?.filter(campaign => campaign.status === 'active').length || 0
  const totalBudget = campaigns?.reduce((sum, campaign) => sum + campaign.budget, 0) || 0
  const totalSpent = campaigns?.reduce((sum, campaign) => sum + campaign.spent, 0) || 0
  const totalLeadsGenerated = campaigns?.reduce((sum, campaign) => sum + campaign.leads_generated, 0) || 0
  const averageConversionRate = campaigns?.length > 0 
    ? campaigns.reduce((sum, campaign) => sum + campaign.conversion_rate, 0) / campaigns.length 
    : 0

  return {
    active,
    totalBudget,
    totalSpent,
    totalLeadsGenerated,
    averageConversionRate
  }
}

// =====================================================
// SUBSCRIPTIONS
// =====================================================

export function subscribeToLeads(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('leads_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      callback
    )
    .subscribe()

  return subscription
}

export function subscribeToCampaigns(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('campaigns_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'campaigns' },
      callback
    )
    .subscribe()

  return subscription
}

