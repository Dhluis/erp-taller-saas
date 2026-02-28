/**
 * GET /api/expenses/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getExpenseById } from '@/lib/database/queries/expenses'

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
    const expense = await getExpenseById(org.organizationId, id)
    if (!expense) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: expense })
  } catch (e) {
    console.error('GET /api/expenses/[id]:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
