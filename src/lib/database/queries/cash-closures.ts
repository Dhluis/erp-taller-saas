/**
 * Queries: Arqueo de caja (cierres por cuenta de efectivo)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export interface CashClosure {
  id: string
  cash_account_id: string
  organization_id: string
  closed_at: string
  opening_balance: number
  closing_balance: number
  counted_amount: number
  difference: number
  notes: string | null
  created_by: string | null
  created_at: string
  cash_account?: { id: string; name: string; account_number: string } | null
}

export interface CreateCashClosureData {
  cash_account_id: string
  closing_balance: number
  counted_amount: number
  notes?: string | null
}

export async function getCashClosures(
  organizationId: string,
  filters?: { cash_account_id?: string; from?: string; to?: string }
): Promise<CashClosure[]> {
  const supabase = getSupabaseServiceClient()
  let q = supabase
    .from('cash_closures')
    .select('*, cash_account:cash_accounts(id, name, account_number)')
    .eq('organization_id', organizationId)
    .order('closed_at', { ascending: false })
  if (filters?.cash_account_id) q = q.eq('cash_account_id', filters.cash_account_id)
  if (filters?.from) q = q.gte('closed_at', filters.from)
  if (filters?.to) q = q.lte('closed_at', filters.to)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export async function getCashClosureById(organizationId: string, id: string): Promise<CashClosure | null> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('cash_closures')
    .select('*, cash_account:cash_accounts(id, name, account_number)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data
}

export async function createCashClosure(
  organizationId: string,
  input: CreateCashClosureData,
  openingBalance: number,
  createdBy?: string
): Promise<CashClosure> {
  const supabase = getSupabaseServiceClient()
  const difference = Number(input.counted_amount) - Number(input.closing_balance)
  const { data, error } = await supabase
    .from('cash_closures')
    .insert({
      cash_account_id: input.cash_account_id,
      organization_id: organizationId,
      opening_balance: openingBalance,
      closing_balance: input.closing_balance,
      counted_amount: input.counted_amount,
      difference,
      notes: input.notes || null,
      created_by: createdBy || null
    })
    .select('*, cash_account:cash_accounts(id, name, account_number)')
    .single()
  if (error) throw new Error(error.message)
  return data
}
