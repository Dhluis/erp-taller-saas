import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/service-packages
 * Lista todos los paquetes activos de la organización con sus items.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización' },
        { status: 403 }
      )
    }

    const organizationId = profile.organization_id

    const { data: packages, error } = await supabaseAdmin
      .from('service_packages')
      .select(`
        id,
        organization_id,
        name,
        description,
        category,
        price,
        estimated_minutes,
        is_active,
        created_at,
        updated_at,
        service_package_items (
          id,
          quantity,
          inventory_item_id,
          inventory:inventory (
            id,
            name,
            unit,
            current_stock
          )
        )
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[GET /api/service-packages]', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: packages || [],
    })
  } catch (e) {
    console.error('[GET /api/service-packages]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/service-packages
 * Crea un nuevo paquete con sus items.
 * Body: { name, description?, category?, price, estimated_minutes?, items: [{ inventory_id, quantity }] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización' },
        { status: 403 }
      )
    }

    const organizationId = profile.organization_id
    const body = await request.json()

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'El nombre del paquete es requerido' },
        { status: 400 }
      )
    }

    const price = parseFloat(body.price)
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { success: false, error: 'El precio debe ser un número mayor o igual a 0' },
        { status: 400 }
      )
    }

    const estimated_minutes = body.estimated_minutes != null ? parseInt(body.estimated_minutes, 10) : null
    const items: { inventory_id: string; quantity: number }[] = Array.isArray(body.items)
      ? body.items
          .filter((i: any) => i?.inventory_id && Number(i?.quantity) > 0)
          .map((i: any) => ({
            inventory_id: i.inventory_id,
            quantity: Math.max(0, Number(i.quantity)),
          }))
      : []

    const { data: pkg, error: insertPkgError } = await supabaseAdmin
      .from('service_packages')
      .insert({
        organization_id: organizationId,
        name,
        description: body.description?.trim() || null,
        category: body.category?.trim() || null,
        price,
        estimated_minutes: isNaN(estimated_minutes as number) ? null : estimated_minutes,
        is_active: true,
      } as any)
      .select('id')
      .single()

    if (insertPkgError || !pkg) {
      console.error('[POST /api/service-packages] insert package', insertPkgError)
      return NextResponse.json(
        { success: false, error: insertPkgError?.message || 'Error al crear el paquete' },
        { status: 500 }
      )
    }

    const packageId = (pkg as any).id

    if (items.length > 0) {
      const rows = items.map((i) => ({
        organization_id: organizationId,
        service_package_id: packageId,
        inventory_item_id: i.inventory_id,
        quantity: i.quantity,
      }))
      const { error: insertItemsError } = await supabaseAdmin
        .from('service_package_items')
        .insert(rows as any)

      if (insertItemsError) {
        console.error('[POST /api/service-packages] insert items', insertItemsError)
        await supabaseAdmin.from('service_packages').delete().eq('id', packageId)
        return NextResponse.json(
          { success: false, error: insertItemsError.message },
          { status: 500 }
        )
      }
    }

    const { data: full } = await supabaseAdmin
      .from('service_packages')
      .select(`
        *,
        service_package_items (
          id,
          quantity,
          inventory_item_id,
          inventory:inventory (id, name, unit, current_stock)
        )
      `)
      .eq('id', packageId)
      .single()

    return NextResponse.json({
      success: true,
      data: full,
    }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/service-packages]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
