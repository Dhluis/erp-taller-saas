import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

const VALID_LINE_TYPES = ['package', 'free_service', 'loose_product'] as const

function getOrgId(supabaseAdmin: ReturnType<typeof getSupabaseServiceClient>, authUserId: string) {
  return supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', authUserId)
    .single()
}

async function verifyOrderOrg(supabaseAdmin: ReturnType<typeof getSupabaseServiceClient>, orderId: string, organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from('work_orders')
    .select('id, organization_id')
    .eq('id', orderId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()
  if (error || !data) return null
  return data
}

/**
 * GET /api/work-orders/[id]/services
 * Lista todos los servicios de la orden ordenados por sort_order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
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
    const order = await verifyOrderOrg(supabaseAdmin, orderId, organizationId)
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada o no autorizada' }, { status: 404 })
    }

    const { data: services, error } = await supabaseAdmin
      .from('work_order_services')
      .select('*')
      .eq('work_order_id', orderId)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/work-orders/[id]/services]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = services || []
    const total = list.reduce((acc, s) => acc + Number(s.total_price || 0), 0)

    return NextResponse.json({
      success: true,
      data: list,
      total: Math.round(total * 100) / 100
    })
  } catch (e) {
    console.error('[GET /api/work-orders/[id]/services]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/work-orders/[id]/services
 * Agrega un servicio/concepto a la orden.
 * Body según line_type: package | free_service | loose_product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
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
    const order = await verifyOrderOrg(supabaseAdmin, orderId, organizationId)
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada o no autorizada' }, { status: 404 })
    }

    const body = await request.json()
    const lineType = body.line_type
    if (!lineType || !VALID_LINE_TYPES.includes(lineType)) {
      return NextResponse.json({ error: 'line_type debe ser package, free_service o loose_product' }, { status: 400 })
    }

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const unitPrice = parseFloat(body.unit_price)
    if (isNaN(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: 'unit_price debe ser un número >= 0' }, { status: 400 })
    }

    const quantity = parseFloat(body.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity debe ser un número > 0' }, { status: 400 })
    }

    const maxSort = await supabaseAdmin
      .from('work_order_services')
      .select('sort_order')
      .eq('work_order_id', orderId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSort = (maxSort?.data?.sort_order ?? -1) + 1

    let warnings: Array<{ name: string; required: number; available: number }> = []

    if (lineType === 'package') {
      const servicePackageId = body.service_package_id
      if (!servicePackageId) {
        return NextResponse.json({ error: 'service_package_id es requerido para line_type package' }, { status: 400 })
      }
      const { data: pkgItems } = await supabaseAdmin
        .from('service_package_items')
        .select('quantity, inventory_item_id')
        .eq('service_package_id', servicePackageId)
        .eq('organization_id', organizationId)

      if (pkgItems && pkgItems.length > 0) {
        const invIds = [...new Set(pkgItems.map((i: any) => i.inventory_item_id).filter(Boolean))]
        const { data: invRows } = await supabaseAdmin
          .from('inventory')
          .select('id, name, current_stock')
          .in('id', invIds)
          .eq('organization_id', organizationId)
        const invMap = new Map((invRows || []).map((r: any) => [r.id, r]))
        for (const item of pkgItems) {
          const inv = invMap.get(item.inventory_item_id)
          const req = Number(item.quantity || 0) * quantity
          const avail = Number(inv?.current_stock ?? 0)
          if (avail < req) {
            warnings.push({ name: inv?.name || 'Producto', required: req, available: avail })
          }
        }
      }
    }

    const insertRow: Record<string, unknown> = {
      organization_id: organizationId,
      work_order_id: orderId,
      line_type: lineType,
      name,
      description: body.description?.trim() || null,
      unit_price: unitPrice,
      quantity,
      sort_order: nextSort
    }

    if (lineType === 'package') {
      insertRow.service_package_id = body.service_package_id
    }
    if (lineType === 'loose_product' && body.inventory_item_id) {
      insertRow.inventory_item_id = body.inventory_item_id
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from('work_order_services')
      .insert(insertRow)
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/work-orders/[id]/services]', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: created,
      warnings: warnings.length > 0 ? warnings : undefined
    }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/work-orders/[id]/services]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
