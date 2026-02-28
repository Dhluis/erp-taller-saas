/**
 * GET /api/cash-closures/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getCashClosureById } from '@/lib/database/queries/cash-closures'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    const admin = getSupabaseServiceClient()
    const { data: profile } = await admin.from('users').select('organization_id').eq('auth_user_id', user.id).single()
    if (!profile?.organization_id) return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 403 })
    const { id } = await params
    const closure = await getCashClosureById(profile.organization_id, id)
    if (!closure) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: closure })
  } catch (e) {
    console.error('GET /api/cash-closures/[id]:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
