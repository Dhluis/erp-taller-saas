import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

function getOrgId(supabaseAdmin: ReturnType<typeof getSupabaseServiceClient>, authUserId: string) {
  return supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', authUserId)
    .single()
}

async function verifyServiceOrg(
  supabaseAdmin: ReturnType<typeof getSupabaseServiceClient>,
  orderId: string,
  serviceId: string,
  organizationId: string
) {
  const { data, error } = await supabaseAdmin
    .from('work_order_services')
    .select('id, work_order_id, organization_id')
    .eq('id', serviceId)
    .eq('work_order_id', orderId)
    .eq('organization_id', organizationId)
    .single()
  if (error || !data) return null
  return data
}

/**
 * PUT /api/work-orders/[id]/services/[serviceId]
 * Editar un servicio (nombre, precio, cantidad, descripción).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const orderId = params.id
    const serviceId = params.serviceId
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: profile, error: profileError } = await getOrgId(supabaseAdmin, user.id)
    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'No se pudo obtener la organización' }, { status: 403 })
    }

    const organizationId = profile.organization_id
    const existing = await verifyServiceOrg(supabaseAdmin, orderId, serviceId, organizationId)
    if (!existing) {
      return NextResponse.json({ error: 'Servicio no encontrado o no autorizado' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null
    if (body.unit_price !== undefined) {
      const v = parseFloat(body.unit_price)
      if (isNaN(v) || v < 0) {
        return NextResponse.json({ error: 'unit_price debe ser un número >= 0' }, { status: 400 })
      }
      updates.unit_price = v
    }
    if (body.quantity !== undefined) {
      const v = parseFloat(body.quantity)
      if (isNaN(v) || v <= 0) {
        return NextResponse.json({ error: 'quantity debe ser un número > 0' }, { status: 400 })
      }
      updates.quantity = v
    }
    if (body.inventory_item_id !== undefined) updates.inventory_item_id = body.inventory_item_id || null

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('work_order_services')
      .update(updates)
      .eq('id', serviceId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (updateError) {
      console.error('[PUT /api/work-orders/[id]/services/[serviceId]]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error('[PUT /api/work-orders/[id]/services/[serviceId]]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/work-orders/[id]/services/[serviceId]
 * Eliminar un servicio de la orden.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const orderId = params.id
    const serviceId = params.serviceId
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: profile, error: profileError } = await getOrgId(supabaseAdmin, user.id)
    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'No se pudo obtener la organización' }, { status: 403 })
    }

    const organizationId = profile.organization_id
    const existing = await verifyServiceOrg(supabaseAdmin, orderId, serviceId, organizationId)
    if (!existing) {
      return NextResponse.json({ error: 'Servicio no encontrado o no autorizado' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('work_order_services')
      .delete()
      .eq('id', serviceId)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('[DELETE /api/work-orders/[id]/services/[serviceId]]', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/work-orders/[id]/services/[serviceId]]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
