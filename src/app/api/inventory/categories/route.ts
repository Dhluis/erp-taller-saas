import { NextRequest, NextResponse } from 'next/server';
import { createCategory } from '@/lib/database/queries/inventory';
import { handleAPIError, createErrorResponse } from '@/lib/errors/APIError';

/**
 * @swagger
 * /api/inventory/categories:
 *   get:
 *     summary: Obtener todas las categorías de inventario
 *     tags: [Inventory Categories]
 *     responses:
 *       200:
 *         description: Lista de categorías de inventario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryCategory'
 *                 count:
 *                   type: number
 *   post:
 *     summary: Crear una nueva categoría de inventario
 *     tags: [Inventory Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryCategoryData'
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryCategory'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener todas las categorías
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [GET /api/inventory/categories] V2 - Iniciando...')
    
    const { createClientFromRequest, getSupabaseServiceClient } = await import('@/lib/supabase/server')
    
    // Autenticación
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ [GET] No autenticado:', authError)
      return NextResponse.json({ success: true, data: [] })
    }

    // Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [GET] Error perfil:', profileError)
      return NextResponse.json({ success: true, data: [] })
    }

    const organizationId = userProfile.organization_id
    console.log('✅ [GET] Org:', organizationId)

    // Query DIRECTO sin filtros complicados
    const { data: categories, error: queryError } = await supabaseAdmin
      .from('inventory_categories')
      .select('id, name, description, status, organization_id, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('name')

    if (queryError) {
      console.error('❌ [GET] Error query:', queryError)
      return NextResponse.json({ success: true, data: [] })
    }

    console.log('✅ [GET] Categorías encontradas:', categories?.length || 0)
    
    return NextResponse.json({
      success: true,
      data: categories || []
    })
    
  } catch (error) {
    console.error('❌ [GET] Error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}

// POST: Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/inventory/categories - Iniciando...')
    
    const body = await request.json();

    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const { createClientFromRequest } = await import('@/lib/supabase/server')
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
    
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ Usuario autenticado:', user.email)
    console.log('✅ Organization ID:', userProfile.organization_id)

    // Validaciones
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la categoría es requerido',
        },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la categoría no puede exceder 100 caracteres',
        },
        { status: 400 }
      );
    }

    const categoryData = {
      ...body,
      organization_id: userProfile.organization_id // Usar el organization_id del usuario autenticado
    };
    
    console.log('📦 [POST] Datos para crear categoría:', categoryData)
    console.log('📦 [POST] Organization ID que se usará:', userProfile.organization_id)

    const category = await createCategory(categoryData);

    console.log('✅ [POST] Categoría creada exitosamente:', category.id)
    console.log('✅ [POST] Datos completos de la categoría creada:', JSON.stringify(category, null, 2))

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Categoría creada exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error creating category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear categoría',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}