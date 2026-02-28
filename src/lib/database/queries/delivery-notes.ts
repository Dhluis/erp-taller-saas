/**
 * Queries: Entregas (comprobantes de entrega / remisiones)
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export type DeliveryNoteStatus = 'pending' | 'delivered' | 'cancelled'

export interface DeliveryNoteItem {
  id: string
  delivery_note_id: string
  item_name: string
  quantity: number
  unit: string
  notes: string | null
  created_at: string
}

export interface DeliveryNote {
  id: string
  organization_id: string
  work_order_id: string | null
  sales_invoice_id: string | null
  customer_id: string
  delivery_number: string
  status: DeliveryNoteStatus
  delivered_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer?: { id: string; name: string; phone: string | null } | null
  work_order?: { id: string; description: string | null } | null
  items?: DeliveryNoteItem[]
}

export interface CreateDeliveryNoteData {
  work_order_id?: string | null
  sales_invoice_id?: string | null
  customer_id: string
  delivery_number: string
  notes?: string | null
  items: Array<{ item_name: string; quantity: number; unit?: string; notes?: string }>
}

export async function getDeliveryNotes(
  organizationId: string,
  filters?: { status?: DeliveryNoteStatus; customer_id?: string }
): Promise<DeliveryNote[]> {
  const supabase = getSupabaseServiceClient()
  let q = supabase
    .from('delivery_notes')
    .select('*, customer:customers(id, name, phone), work_order:work_orders(id, description)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.customer_id) q = q.eq('customer_id', filters.customer_id)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export async function getDeliveryNoteById(organizationId: string, id: string): Promise<DeliveryNote | null> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('delivery_notes')
    .select('*, customer:customers(id, name, phone), work_order:work_orders(id, description), items:delivery_note_items(*)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data
}

export async function getNextDeliveryNumber(organizationId: string): Promise<string> {
  const supabase = getSupabaseServiceClient()
  const year = new Date().getFullYear()
  const prefix = `ENT-${year}-`
  const { data } = await supabase
    .from('delivery_notes')
    .select('delivery_number')
    .eq('organization_id', organizationId)
    .like('delivery_number', `${prefix}%`)
    .order('delivery_number', { ascending: false })
    .limit(1)
  const last = data?.[0]?.delivery_number
  const num = last ? parseInt(last.replace(prefix, ''), 10) + 1 : 1
  return `${prefix}${String(num).padStart(4, '0')}`
}

export async function createDeliveryNote(organizationId: string, input: CreateDeliveryNoteData, createdBy?: string): Promise<DeliveryNote> {
  const supabase = getSupabaseServiceClient()
  const { data: note, error: errNote } = await supabase
    .from('delivery_notes')
    .insert({
      organization_id: organizationId,
      work_order_id: input.work_order_id || null,
      sales_invoice_id: input.sales_invoice_id || null,
      customer_id: input.customer_id,
      delivery_number: input.delivery_number,
      status: 'pending',
      notes: input.notes || null,
      created_by: createdBy || null
    })
    .select()
    .single()
  if (errNote) throw new Error(errNote.message)
  const items = input.items.map((i) => ({
    delivery_note_id: note.id,
    item_name: i.item_name,
    quantity: i.quantity,
    unit: i.unit || 'un',
    notes: i.notes || null
  }))
  if (items.length) {
    const { error: errItems } = await supabase.from('delivery_note_items').insert(items)
    if (errItems) throw new Error(errItems.message)
  }
  return getDeliveryNoteById(organizationId, note.id) as Promise<DeliveryNote>
}

export async function markDeliveryNoteDelivered(organizationId: string, id: string): Promise<void> {
  const supabase = getSupabaseServiceClient()
  const { error } = await supabase
    .from('delivery_notes')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
}
