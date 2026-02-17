import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'

// GET - Listar movimientos de inventario con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ success: false, error: 'Perfil no encontrado' }, { status: 404 })
    }

    const organizationId = (userProfile as { organization_id?: string }).organization_id
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 404 })
    }

    const url = new URL(request.url, 'https://localhost')
    const { searchParams } = url

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const offset = (page - 1) * pageSize

    const movement_type = searchParams.get('movement_type')
    const product_id = searchParams.get('product_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // ✅ JOIN con tabla 'inventory' via 'inventory_id' (no 'products' ni 'product_id')
    let query = supabaseAdmin
      .from('inventory_movements')
      .select(
        `
        id,
        inventory_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reference_type,
        reference_id,
        unit_cost,
        total_cost,
        notes,
        created_at,
        updated_at,
        inventory (
          id,
          name,
          unit_price,
          current_stock
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', organizationId)

    if (movement_type && movement_type !== 'all') {
      query = query.eq('movement_type', movement_type)
    }
    if (product_id) {
      query = query.eq('inventory_id', product_id)
    }
    if (start_date) {
      query = query.gte('created_at', `${start_date}T00:00:00.000Z`)
    }
    if (end_date) {
      query = query.lte('created_at', `${end_date}T23:59:59.999Z`)
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1)

    const { data: movements, error, count } = await query

    if (error) {
      console.error('[GET /api/inventory/movements] Error:', error)
      return NextResponse.json({ success: false, error: 'Error al obtener movimientos' }, { status: 500 })
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: {
        items: movements ?? [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      }
    })
  } catch (err) {
    console.error('[GET /api/inventory/movements] Error interno:', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo movimiento manual (ajuste)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ success: false, error: 'Perfil no encontrado' }, { status: 404 })
    }

    const organizationId = (userProfile as { organization_id?: string }).organization_id
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { product_id, movement_type, quantity, notes, unit_cost } = body

    if (!product_id || !movement_type || quantity == null) {
      return NextResponse.json(
        { success: false, error: 'product_id, movement_type y quantity son requeridos' },
        { status: 400 }
      )
    }

    // ✅ Leer de tabla 'inventory' (no 'products')
    const { data: item, error: itemError } = await supabaseAdmin
      .from('inventory')
      .select('id, current_stock, unit_price')
      .eq('id', product_id)
      .eq('organization_id', organizationId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
    }

    const inv = item as { id: string; current_stock?: number | null; unit_price?: number | null }
    const previous_stock = Number(inv.current_stock) || 0
    const quantityNum = parseInt(String(quantity), 10)
    const new_stock = movement_type === 'entry'
      ? previous_stock + quantityNum
      : previous_stock - quantityNum

    if (new_stock < 0) {
      return NextResponse.json(
        { success: false, error: `Stock insuficiente. Stock actual: ${previous_stock}` },
        { status: 400 }
      )
    }

    const costPerUnit = unit_cost ?? inv.unit_price ?? 0
    const total_cost = Number(costPerUnit) * quantityNum

    // ✅ Insertar con inventory_id (no product_id)
    const { data: movement, error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert({
        organization_id: organizationId,
        inventory_id: product_id,
        movement_type,
        quantity: quantityNum,
        previous_stock,
        new_stock,
        unit_cost: Number(costPerUnit),
        total_cost,
        notes: notes ?? null,
        reference_type: 'adjustment'
      } as any)
      .select(`*, inventory (id, name)`)
      .single()

    if (movementError) {
      console.error('[POST /api/inventory/movements] Error:', movementError)
      return NextResponse.json({ success: false, error: 'Error al crear movimiento' }, { status: 500 })
    }

    // ✅ Actualizar stock en tabla 'inventory' con columna 'current_stock'
    await supabaseAdmin
      .from('inventory')
      .update({ current_stock: new_stock, updated_at: new Date().toISOString() } as never)
      .eq('id', product_id)

    return NextResponse.json(
      { success: true, data: movement, message: 'Movimiento creado exitosamente' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/inventory/movements] Error interno:', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
