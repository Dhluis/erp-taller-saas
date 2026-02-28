/**
 * API: Entregas (comprobantes de entrega)
 * GET /api/delivery-notes - Listar
 * POST /api/delivery-notes - Crear
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import {
  getDeliveryNotes,
  createDeliveryNote,
  type CreateDeliveryNoteData
} from '@/lib/database/queries/delivery-notes'
import { z } from 'zod'

async function getOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const admin = getSupabaseServiceClient()
  const { data: profile } = await admin.from('users').select('id, organization_id').eq('auth_user_id', user.id).single()
  if (!profile?.organization_id) return { error: 'Organización no encontrada', status: 403 as const }
  return { organizationId: profile.organization_id, userId: profile.id }
}

const createSchema = z.object({
  work_order_id: z.string().uuid().optional().nullable(),
  sales_invoice_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid(),
  delivery_number: z.string().min(1),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    item_name: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    notes: z.string().optional()
  })).min(1)
})

export async function GET(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const status = request.nextUrl.searchParams.get('status') as 'pending' | 'delivered' | 'cancelled' | undefined
    const customer_id = request.nextUrl.searchParams.get('customer_id') || undefined
    const list = await getDeliveryNotes(org.organizationId, { status, customer_id })
    return NextResponse.json({ success: true, data: list })
  } catch (e) {
    console.error('GET /api/delivery-notes:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    const data: CreateDeliveryNoteData = {
      work_order_id: parsed.data.work_order_id ?? undefined,
      sales_invoice_id: parsed.data.sales_invoice_id ?? undefined,
      customer_id: parsed.data.customer_id,
      delivery_number: parsed.data.delivery_number,
      notes: parsed.data.notes ?? undefined,
      items: parsed.data.items
    }
    const note = await createDeliveryNote(org.organizationId, data, org.userId)
    return NextResponse.json({ success: true, data: note })
  } catch (e) {
    console.error('POST /api/delivery-notes:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
