import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { InventoryMovementInsert, InventoryMovement } from '@/types/supabase-simple'
import { z } from 'zod'
import { 
  extractPaginationFromURL, 
  calculateOffset, 
  generatePaginationMeta 
} from '@/lib/utils/pagination'
import type { PaginatedResponse } from '@/types/pagination'

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
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/inventory/movements] Error de autenticación:', authError);
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado',
        data: []
      }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[GET /api/inventory/movements] Error obteniendo perfil:', profileError);
      return NextResponse.json({ 
        success: false,
        error: 'Perfil de usuario no encontrado',
        data: []
      }, { status: 404 })
    }

    const organizationId = userProfile.organization_id;
    const { searchParams } = new URL(request.url)
    
    // ✅ Extraer parámetros de paginación usando utilidad estándar
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(request.url)
    const offset = calculateOffset(page, pageSize)
    
    // Obtener parámetros de filtro
    const product_id = searchParams.get('product_id')
    const movement_type = searchParams.get('movement_type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    console.log('🔄 [GET /api/inventory/movements] Parámetros:', {
      organizationId,
      page,
      pageSize,
      product_id,
      movement_type,
      start_date,
      end_date
    })

    // ✅ Construir consulta base con count para paginación
    let countQuery = supabaseAdmin
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    let dataQuery = supabaseAdmin
      .from('inventory_movements')
      .select(`
        *,
        products!inventory_movements_product_id_fkey (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    // Aplicar filtros a ambas queries
    if (product_id) {
      countQuery = countQuery.eq('product_id', product_id)
      dataQuery = dataQuery.eq('product_id', product_id)
    }
    
    if (movement_type && movement_type !== 'all') {
      countQuery = countQuery.eq('movement_type', movement_type)
      dataQuery = dataQuery.eq('movement_type', movement_type)
    }
    
    if (start_date) {
      countQuery = countQuery.gte('created_at', start_date)
      dataQuery = dataQuery.gte('created_at', start_date)
    }
    
    if (end_date) {
      countQuery = countQuery.lte('created_at', end_date)
      dataQuery = dataQuery.lte('created_at', end_date)
    }

    // Aplicar ordenamiento
    const sortColumn = sortBy || 'created_at'
    const sortDirection = sortOrder || 'desc'
    dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === 'asc' })

    // Aplicar paginación
    dataQuery = dataQuery.range(offset, offset + pageSize - 1)

    // Ejecutar queries en paralelo
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ])

    if (countResult.error) {
      console.error('❌ [GET /api/inventory/movements] Error en count:', countResult.error)
      return NextResponse.json({ 
        success: false,
        error: 'Error al obtener total de movimientos',
        data: { items: [], pagination: generatePaginationMeta(page, pageSize, 0) }
      }, { status: 500 })
    }

    if (dataResult.error) {
      console.error('❌ [GET /api/inventory/movements] Error en data:', dataResult.error)
      return NextResponse.json({ 
        success: false,
        error: 'Error al obtener movimientos',
        data: { items: [], pagination: generatePaginationMeta(page, pageSize, 0) }
      }, { status: 500 })
    }

    const count = countResult.count || 0
    const movements = dataResult.data || []

    console.log('✅ [GET /api/inventory/movements] Movimientos obtenidos:', {
      count: movements.length,
      total: count,
      page,
      pageSize
    })

    // ✅ Retornar formato paginado consistente
    return NextResponse.json({
      success: true,
      data: {
        items: movements,
        pagination: generatePaginationMeta(page, pageSize, count)
      }
    } as PaginatedResponse<InventoryMovement>)

  } catch (error) {
    console.error('Error in GET /api/inventory/movements:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo movimiento de inventario
export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[POST /api/inventory/movements] Error de autenticación:', authError);
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[POST /api/inventory/movements] Error obteniendo perfil:', profileError);
      return NextResponse.json({ 
        success: false,
        error: 'Perfil de usuario no encontrado'
      }, { status: 404 })
    }

    const organizationId = userProfile.organization_id;

    // Validar datos del request
    const body = await request.json()
    const validatedData = createMovementSchema.parse(body)

    // Verificar que el producto existe y pertenece a la organización
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, stock')
      .eq('id', validatedData.product_id)
      .eq('organization_id', organizationId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Usar la función de PostgreSQL para crear el movimiento
    const { data: movementId, error: movementError } = await supabaseAdmin
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
    const { data: newMovement, error: fetchError } = await supabaseAdmin
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