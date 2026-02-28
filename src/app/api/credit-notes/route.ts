/**
 * API: Notas de crédito (Ajustes y devoluciones)
 * GET /api/credit-notes - Listar
 * POST /api/credit-notes - Crear
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import {
  getCreditNotes,
  getCreditNotesStats,
  createCreditNote,
  type CreateCreditNoteData
} from '@/lib/database/queries/credit-notes'
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
  sales_invoice_id: z.string().uuid().optional().nullable(),
  credit_note_number: z.string().min(1),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    item_type: z.enum(['service', 'part']),
    item_name: z.string().min(1),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unit_price: z.number().min(0)
  })).min(1)
})

export async function GET(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const status = request.nextUrl.searchParams.get('status') as 'draft' | 'issued' | 'applied' | 'cancelled' | undefined
    const sales_invoice_id = request.nextUrl.searchParams.get('sales_invoice_id') || undefined
    const list = await getCreditNotes(org.organizationId, { status, sales_invoice_id })
    const stats = await getCreditNotesStats(org.organizationId)
    return NextResponse.json({ success: true, data: list, stats })
  } catch (e) {
    console.error('GET /api/credit-notes:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    )
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
    const data: CreateCreditNoteData = {
      sales_invoice_id: parsed.data.sales_invoice_id ?? undefined,
      credit_note_number: parsed.data.credit_note_number,
      reason: parsed.data.reason ?? undefined,
      notes: parsed.data.notes ?? undefined,
      items: parsed.data.items
    }
    const note = await createCreditNote(org.organizationId, data, org.userId)
    return NextResponse.json({ success: true, data: note })
  } catch (e) {
    console.error('POST /api/credit-notes:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    )
  }
}
