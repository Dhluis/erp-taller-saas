/**
 * GET /api/credit-notes/next-number
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getNextCreditNoteNumber } from '@/lib/database/queries/credit-notes'
import { isSupabaseTableMissingError, MIGRATION_045_MESSAGE } from '@/lib/supabase/table-missing'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    const admin = getSupabaseServiceClient()
    const { data: profile } = await admin.from('users').select('organization_id').eq('auth_user_id', user.id).single()
    if (!profile?.organization_id) return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 403 })
    const nextNumber = await getNextCreditNoteNumber(profile.organization_id)
    return NextResponse.json({ success: true, data: { credit_note_number: nextNumber } })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        { success: false, error: MIGRATION_045_MESSAGE, code: 'MIGRATION_REQUIRED', migration: '045' },
        { status: 503 }
      )
    }
    console.error('GET /api/credit-notes/next-number:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
