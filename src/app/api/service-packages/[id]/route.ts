import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/service-packages/[id]
 * Obtiene un paquete con todos sus items e inventario.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de paquete requerido' },
        { status: 400 }
      )
    }

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

    const { data: pkg, error } = await supabaseAdmin
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
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null)
      .single()

    if (error || !pkg) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Paquete no encontrado' },
          { status: 404 }
        )
      }
      console.error('[GET /api/service-packages/[id]]', error)
      return NextResponse.json(
        { success: false, error: error?.message || 'Error al obtener el paquete' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: pkg })
  } catch (e) {
    console.error('[GET /api/service-packages/[id]]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/service-packages/[id]
 * Actualiza el paquete y reemplaza sus items (DELETE todos + INSERT nuevos).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de paquete requerido' },
        { status: 400 }
      )
    }

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

    const existing = await supabaseAdmin
      .from('service_packages')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null)
      .single()

    if (existing.error || !existing.data) {
      return NextResponse.json(
        { success: false, error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

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

    const { error: updateError } = await supabaseAdmin
      .from('service_packages')
      .update({
        name,
        description: body.description?.trim() || null,
        category: body.category?.trim() || null,
        price,
        estimated_minutes: isNaN(estimated_minutes as number) ? null : estimated_minutes,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (updateError) {
      console.error('[PUT /api/service-packages/[id]] update', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    const { error: deleteItemsError } = await supabaseAdmin
      .from('service_package_items')
      .delete()
      .eq('service_package_id', id)
      .eq('organization_id', profile.organization_id)

    if (deleteItemsError) {
      console.error('[PUT /api/service-packages/[id]] delete items', deleteItemsError)
      return NextResponse.json(
        { success: false, error: deleteItemsError.message },
        { status: 500 }
      )
    }

    if (items.length > 0) {
      const rows = items.map((i) => ({
        organization_id: profile.organization_id,
        service_package_id: id,
        inventory_item_id: i.inventory_id,
        quantity: i.quantity,
      }))
      const { error: insertItemsError } = await supabaseAdmin
        .from('service_package_items')
        .insert(rows as any)

      if (insertItemsError) {
        console.error('[PUT /api/service-packages/[id]] insert items', insertItemsError)
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
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, data: full })
  } catch (e) {
    console.error('[PUT /api/service-packages/[id]]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/service-packages/[id]
 * Soft delete: set deleted_at y updated_at = NOW().
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de paquete requerido' },
        { status: 400 }
      )
    }

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

    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .update({ deleted_at: now, updated_at: now } as any)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select('id')
      .single()

    if (error) {
      console.error('[DELETE /api/service-packages/[id]]', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch (e) {
    console.error('[DELETE /api/service-packages/[id]]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
