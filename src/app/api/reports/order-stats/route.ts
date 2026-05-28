import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single() as { data: { organization_id: string } | null; error: any }

    if (!profile?.organization_id) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 403 })
    }

    const { data: orders, error } = await supabaseAdmin
      .from('work_orders')
      .select('status, total_amount')
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const list = orders || []
    const stats = {
      total: list.length,
      pending: list.filter(o => o.status === 'pending').length,
      in_progress: list.filter(o => o.status === 'in_progress').length,
      diagnosed: list.filter(o => o.status === 'diagnosed').length,
      approved: list.filter(o => o.status === 'approved').length,
      in_repair: list.filter(o => o.status === 'in_repair').length,
      waiting_parts: list.filter(o => o.status === 'waiting_parts').length,
      completed: list.filter(o => o.status === 'completed' || o.status === 'archived').length,
      delivered: list.filter(o => o.status === 'delivered').length,
      total_revenue: list.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error' }, { status: 500 })
  }
}
