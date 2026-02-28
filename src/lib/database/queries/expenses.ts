/**
 * Queries: Gastos (egresos operativos)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export interface Expense {
  id: string
  organization_id: string
  amount: number
  category: string
  expense_date: string
  description: string | null
  reference_type: string | null
  reference_id: string | null
  cash_account_id: string | null
  payment_method: string
  created_by: string | null
  created_at: string
  updated_at: string
  cash_account?: { id: string; name: string } | null
}

export interface CreateExpenseData {
  amount: number
  category: string
  expense_date?: string
  description?: string | null
  reference_type?: string | null
  reference_id?: string | null
  cash_account_id?: string | null
  payment_method?: string
}

export async function getExpenses(
  organizationId: string,
  filters?: { category?: string; from?: string; to?: string; cash_account_id?: string }
): Promise<Expense[]> {
  const supabase = getSupabaseServiceClient()
  let q = supabase
    .from('expenses')
    .select('*, cash_account:cash_accounts(id, name)')
    .eq('organization_id', organizationId)
    .order('expense_date', { ascending: false })
  if (filters?.category) q = q.eq('category', filters.category)
  if (filters?.from) q = q.gte('expense_date', filters.from)
  if (filters?.to) q = q.lte('expense_date', filters.to)
  if (filters?.cash_account_id) q = q.eq('cash_account_id', filters.cash_account_id)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export async function getExpenseById(organizationId: string, id: string): Promise<Expense | null> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*, cash_account:cash_accounts(id, name)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data
}

export async function createExpense(organizationId: string, input: CreateExpenseData, createdBy?: string): Promise<Expense> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      organization_id: organizationId,
      amount: input.amount,
      category: input.category,
      expense_date: input.expense_date || new Date().toISOString().split('T')[0],
      description: input.description || null,
      reference_type: input.reference_type || null,
      reference_id: input.reference_id || null,
      cash_account_id: input.cash_account_id || null,
      payment_method: input.payment_method || 'cash',
      created_by: createdBy || null
    })
    .select('*, cash_account:cash_accounts(id, name)')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getExpensesStats(
  organizationId: string,
  from?: string,
  to?: string
): Promise<{ total: number; by_category: Record<string, number>; count: number }> {
  const list = await getExpenses(organizationId, { from, to })
  const total = list.reduce((s, e) => s + Number(e.amount || 0), 0)
  const by_category: Record<string, number> = {}
  for (const e of list) {
    const cat = e.category || 'Otros'
    by_category[cat] = (by_category[cat] || 0) + Number(e.amount || 0)
  }
  return { total, by_category, count: list.length }
}
