import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCategories,
  createCategory,
} from '@/lib/database/queries/inventory';
import { handleAPIError, createErrorResponse } from '@/lib/errors/APIError';
import { ValidationUtils } from '@/lib/validations/utils';
import { PaginationSchema, CreateInventoryCategorySchema } from '@/lib/validations/schemas';

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
    console.log('🔄 GET /api/inventory/categories - Iniciando...')
    
    // Crear cliente de Supabase
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Obtener sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('❌ Error de sesión:', sessionError)
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', session.user.email)
      .single()

    if (profileError || !profile) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ Usuario autenticado:', session.user.email)
    console.log('✅ Organization ID:', profile.organization_id)
    
    // Obtener categorías con timeout extendido
    const categories = await getAllCategories(profile.organization_id)
    
    console.log('✅ Categorías obtenidas:', categories.length)

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('❌ Error en GET /api/inventory/categories:', error)
    const apiError = handleAPIError(error, 'GET /api/inventory/categories');
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}

// POST: Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/inventory/categories - Iniciando...')
    
    const body = await request.json();

    // Crear cliente de Supabase
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Obtener sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('❌ Error de sesión:', sessionError)
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', session.user.email)
      .single()

    if (profileError || !profile) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ Usuario autenticado:', session.user.email)
    console.log('✅ Organization ID:', profile.organization_id)

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
      organization_id: profile.organization_id // Usar el organization_id del usuario autenticado
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