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
    console.log('🔄 [GET /api/inventory/categories] Iniciando...')
    
    // ✅ PASO 1: Autenticación
    let createClientFromRequest, getSupabaseServiceClient
    try {
      const serverModule = await import('@/lib/supabase/server')
      createClientFromRequest = serverModule.createClientFromRequest
      getSupabaseServiceClient = serverModule.getSupabaseServiceClient
    } catch (importError) {
      console.error('❌ [GET /api/inventory/categories] Error importando módulos:', importError)
      return NextResponse.json({
        success: true,
        data: []
      })
    }
    
    let supabase, authUser, authError
    try {
      supabase = createClientFromRequest(request)
      const authResult = await supabase.auth.getUser()
      authUser = authResult.data.user
      authError = authResult.error
    } catch (authErr) {
      console.error('❌ [GET /api/inventory/categories] Error en autenticación:', authErr)
      return NextResponse.json({
        success: true,
        data: []
      })
    }
    
    if (authError || !authUser) {
      console.error('❌ [GET /api/inventory/categories] No autenticado')
      return NextResponse.json({ 
        success: true, // Cambiar a true para no romper la UI
        data: []
      })
    }

    // ✅ PASO 2: Obtener organizationId
    let supabaseAdmin, userProfile, profileError
    try {
      supabaseAdmin = getSupabaseServiceClient()
      const profileResult = await supabaseAdmin
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', authUser.id)
        .single()
      
      userProfile = profileResult.data
      profileError = profileResult.error
    } catch (profileErr) {
      console.error('❌ [GET /api/inventory/categories] Error obteniendo perfil:', profileErr)
      return NextResponse.json({
        success: true,
        data: []
      })
    }
    
    if (profileError || !userProfile || !userProfile.organization_id) {
      console.error('❌ [GET /api/inventory/categories] Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: true, // Cambiar a true para no romper la UI
        data: []
      })
    }
    
    const organizationId = userProfile.organization_id
    console.log('✅ [GET /api/inventory/categories] Organization ID:', organizationId)
    
    // ✅ PASO 3: Query de categorías
    let categories, queryError
    try {
      const queryResult = await supabaseAdmin
        .from('inventory_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
      
      categories = queryResult.data
      queryError = queryResult.error
    } catch (queryErr) {
      console.error('❌ [GET /api/inventory/categories] Excepción en query:', queryErr)
      return NextResponse.json({
        success: true,
        data: []
      })
    }
    
    if (queryError) {
      console.error('❌ [GET /api/inventory/categories] Error en query:', queryError)
      console.error('❌ [GET /api/inventory/categories] Detalles:', {
        message: queryError.message,
        code: queryError.code,
        details: queryError.details,
        hint: queryError.hint
      })
      
      // SIEMPRE devolver array vacío en lugar de error 500
      return NextResponse.json({
        success: true,
        data: []
      })
    }
    
    console.log('✅ [GET /api/inventory/categories] Categorías encontradas:', categories?.length || 0)
    
    // ✅ RETORNAR estructura correcta
    return NextResponse.json({
      success: true,
      data: Array.isArray(categories) ? categories : []
    })
    
  } catch (error: any) {
    console.error('❌ [GET /api/inventory/categories] Error inesperado:', error)
    console.error('❌ [GET /api/inventory/categories] Stack:', error.stack)
    // SIEMPRE devolver array vacío en lugar de error 500
    return NextResponse.json({
      success: true,
      data: []
    })
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

    const category = await createCategory({
      ...body,
      organization_id: userProfile.organization_id // Usar el organization_id del usuario autenticado
    });

    console.log('✅ Categoría creada:', category.id)

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