/**
 * Queries: Notas de crédito (Ajustes y devoluciones)
 * Vinculadas a sales_invoices
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'cancelled'

export interface CreditNoteItem {
  id: string
  credit_note_id: string
  item_type: 'service' | 'part'
  item_name: string
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface CreditNote {
  id: string
  organization_id: string
  sales_invoice_id: string | null
  credit_note_number: string
  status: CreditNoteStatus
  total_amount: number
  reason: string | null
  notes: string | null
  issued_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  sales_invoice?: { id: string; invoice_number: string; total_amount: number } | null
  items?: CreditNoteItem[]
}

export interface CreateCreditNoteData {
  sales_invoice_id?: string | null
  credit_note_number: string
  reason?: string | null
  notes?: string | null
  items: Array<{ item_type: 'service' | 'part'; item_name: string; description?: string; quantity: number; unit_price: number }>
}

export async function getCreditNotes(
  organizationId: string,
  filters?: { status?: CreditNoteStatus; sales_invoice_id?: string }
): Promise<CreditNote[]> {
  const supabase = getSupabaseServiceClient()
  let q = supabase
    .from('credit_notes')
    .select('*, sales_invoice:sales_invoices(id, invoice_number, total_amount)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.sales_invoice_id) q = q.eq('sales_invoice_id', filters.sales_invoice_id)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export async function getCreditNoteById(organizationId: string, id: string): Promise<CreditNote | null> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('credit_notes')
    .select('*, sales_invoice:sales_invoices(id, invoice_number, total_amount), items:credit_note_items(*)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data
}

export async function getNextCreditNoteNumber(organizationId: string): Promise<string> {
  const supabase = getSupabaseServiceClient()
  const year = new Date().getFullYear()
  const prefix = `NC-${year}-`
  const { data } = await supabase
    .from('credit_notes')
    .select('credit_note_number')
    .eq('organization_id', organizationId)
    .like('credit_note_number', `${prefix}%`)
    .order('credit_note_number', { ascending: false })
    .limit(1)
  const last = data?.[0]?.credit_note_number
  const num = last ? parseInt(last.replace(prefix, ''), 10) + 1 : 1
  return `${prefix}${String(num).padStart(4, '0')}`
}

export async function createCreditNote(organizationId: string, input: CreateCreditNoteData, createdBy?: string): Promise<CreditNote> {
  const supabase = getSupabaseServiceClient()
  const total = input.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const { data: note, error: errNote } = await supabase
    .from('credit_notes')
    .insert({
      organization_id: organizationId,
      sales_invoice_id: input.sales_invoice_id || null,
      credit_note_number: input.credit_note_number,
      status: 'draft',
      total_amount: total,
      reason: input.reason || null,
      notes: input.notes || null,
      created_by: createdBy || null
    })
    .select()
    .single()
  if (errNote) throw new Error(errNote.message)
  const items = input.items.map((i) => ({
    credit_note_id: note.id,
    item_type: i.item_type,
    item_name: i.item_name,
    description: i.description || null,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: i.quantity * i.unit_price
  }))
  if (items.length) {
    const { error: errItems } = await supabase.from('credit_note_items').insert(items)
    if (errItems) throw new Error(errItems.message)
  }
  return getCreditNoteById(organizationId, note.id) as Promise<CreditNote>
}

export async function updateCreditNoteStatus(
  organizationId: string,
  id: string,
  status: CreditNoteStatus
): Promise<void> {
  const supabase = getSupabaseServiceClient()
  const { error } = await supabase
    .from('credit_notes')
    .update({
      status,
      ...(status === 'issued' ? { issued_at: new Date().toISOString() } : {})
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
}

export async function getCreditNotesStats(organizationId: string): Promise<{
  total: number
  draft: number
  issued: number
  applied: number
  total_amount: number
}> {
  const list = await getCreditNotes(organizationId)
  const total = list.length
  const draft = list.filter((n) => n.status === 'draft').length
  const issued = list.filter((n) => n.status === 'issued').length
  const applied = list.filter((n) => n.status === 'applied').length
  const total_amount = list.filter((n) => n.status !== 'cancelled').reduce((s, n) => s + Number(n.total_amount || 0), 0)
  return { total, draft, issued, applied, total_amount }
}
