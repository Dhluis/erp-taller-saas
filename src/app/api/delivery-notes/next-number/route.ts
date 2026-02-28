/**
 * GET /api/delivery-notes/next-number
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getNextDeliveryNumber } from '@/lib/database/queries/delivery-notes'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    const admin = getSupabaseServiceClient()
    const { data: profile } = await admin.from('users').select('organization_id').eq('auth_user_id', user.id).single()
    if (!profile?.organization_id) return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 403 })
    const nextNumber = await getNextDeliveryNumber(profile.organization_id)
    return NextResponse.json({ success: true, data: { delivery_number: nextNumber } })
  } catch (e) {
    console.error('GET /api/delivery-notes/next-number:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
