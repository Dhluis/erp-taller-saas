/**
 * GET /api/credit-notes/[id] - Obtener una nota
 * PATCH /api/credit-notes/[id] - Actualizar estado
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getCreditNoteById, updateCreditNoteStatus, type CreditNoteStatus } from '@/lib/database/queries/credit-notes'
import { isSupabaseTableMissingError, MIGRATION_045_MESSAGE } from '@/lib/supabase/table-missing'

async function getOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const admin = getSupabaseServiceClient()
  const { data: profile } = await admin.from('users').select('organization_id').eq('auth_user_id', user.id).single()
  if (!profile?.organization_id) return { error: 'Organización no encontrada', status: 403 as const }
  return { organizationId: profile.organization_id }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id } = await params
    const note = await getCreditNoteById(org.organizationId, id)
    if (!note) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: note })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        { success: false, error: MIGRATION_045_MESSAGE, code: 'MIGRATION_REQUIRED', migration: '045' },
        { status: 503 }
      )
    }
    console.error('GET /api/credit-notes/[id]:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

const patchSchema = { status: ['draft', 'issued', 'applied', 'cancelled'] as const }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const { id } = await params
    const note = await getCreditNoteById(org.organizationId, id)
    if (!note) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    const body = await request.json()
    const status = body?.status as CreditNoteStatus | undefined
    if (!status || !patchSchema.status.includes(status)) {
      return NextResponse.json({ success: false, error: 'status inválido (draft|issued|applied|cancelled)' }, { status: 400 })
    }
    await updateCreditNoteStatus(org.organizationId, id, status)
    const updated = await getCreditNoteById(org.organizationId, id)
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        { success: false, error: MIGRATION_045_MESSAGE, code: 'MIGRATION_REQUIRED', migration: '045' },
        { status: 503 }
      )
    }
    console.error('PATCH /api/credit-notes/[id]:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
