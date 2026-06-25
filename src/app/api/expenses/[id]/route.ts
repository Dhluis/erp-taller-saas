import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'

async function getOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: 'No autorizado', status: 401 as const }
  const admin = getSupabaseServiceClient()
  const { data: profile } = await admin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.organization_id) return { error: 'Sin organización', status: 403 as const }
  return { organizationId: profile.organization_id, admin }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const { data: existing } = await org.admin
      .from('expenses')
      .select('id')
      .eq('id', id)
      .eq('organization_id', org.organizationId)
      .single()

    if (!existing) return NextResponse.json({ success: false, error: 'Gasto no encontrado' }, { status: 404 })

    const { error } = await org.admin
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('organization_id', org.organizationId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Error al eliminar' }, { status: 500 })
  }
}
