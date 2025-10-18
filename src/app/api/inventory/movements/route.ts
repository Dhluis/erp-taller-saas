import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InventoryMovementInsert, InventoryMovement } from '@/types/supabase-simple'
import { z } from 'zod'

// Schema de validación para crear movimiento
const createMovementSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum(['entry', 'exit', 'adjustment', 'transfer']),
  quantity: z.number().int().positive(),
  reference_type: z.enum(['purchase_order', 'work_order', 'adjustment', 'transfer', 'initial']).optional(),
  reference_id: z.string().uuid().optional(),
  unit_cost: z.number().positive().optional(),
  notes: z.string().optional()
})

// GET - Obtener movimientos de inventario
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de consulta
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const product_id = searchParams.get('product_id')
    const movement_type = searchParams.get('movement_type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })
    }

    // Construir consulta
    let query = supabase
      .from('inventory_movements')
      .select(`
        *,
        products!inventory_movements_product_id_fkey (
          id,
          name
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    
    if (movement_type) {
      query = query.eq('movement_type', movement_type)
    }
    
    if (start_date) {
      query = query.gte('created_at', start_date)
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    // Paginación
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: movements, error } = await query

    if (error) {
      console.error('Error fetching inventory movements:', error)
      return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
    }

    // Obtener total para paginación
    const { count } = await supabase
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)

    return NextResponse.json({
      data: movements,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/inventory/movements:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo movimiento de inventario
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })
    }

    // Validar datos del request
    const body = await request.json()
    const validatedData = createMovementSchema.parse(body)

    // Verificar que el producto existe y pertenece a la organización
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('id', validatedData.product_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Usar la función de PostgreSQL para crear el movimiento
    const { data: movementId, error: movementError } = await supabase
      .rpc('create_inventory_movement', {
        p_product_id: validatedData.product_id,
        p_movement_type: validatedData.movement_type,
        p_quantity: validatedData.quantity,
        p_reference_type: validatedData.reference_type || null,
        p_reference_id: validatedData.reference_id || null,
        p_unit_cost: validatedData.unit_cost || null,
        p_notes: validatedData.notes || null
      })

    if (movementError) {
      console.error('Error creating inventory movement:', movementError)
      return NextResponse.json({ 
        error: 'Error al crear movimiento de inventario',
        details: movementError.message 
      }, { status: 400 })
    }

    // Obtener el movimiento creado con datos relacionados
    const { data: newMovement, error: fetchError } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          stock
        )
      `)
      .eq('id', movementId)
      .single()

    if (fetchError) {
      console.error('Error fetching created movement:', fetchError)
      return NextResponse.json({ error: 'Movimiento creado pero error al obtener datos' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: newMovement,
      message: 'Movimiento de inventario creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/inventory/movements:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}