import { NextRequest, NextResponse } from 'next/server';
import { createInventoryItem } from '@/lib/database/queries/inventory';
import { handleAPIError, createErrorResponse } from '@/lib/errors/APIError';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { 
  extractPaginationFromURL, 
  calculateOffset, 
  generatePaginationMeta 
} from '@/lib/utils/pagination';
import type { PaginatedResponse } from '@/types/pagination';

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Obtener todos los artículos de inventario, buscar o filtrar por stock bajo
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: string
 *         description: Filtrar por artículos con stock bajo (true/false)
 *     responses:
 *       200:
 *         description: Lista de artículos de inventario
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
 *                     $ref: '#/components/schemas/InventoryItem'
 *                 count:
 *                   type: number
 *   post:
 *     summary: Crear un nuevo artículo de inventario
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryItemData'
 *     responses:
 *       201:
 *         description: Artículo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryItem'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener todos los items o buscar
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/inventory] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: []
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[GET /api/inventory] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: []
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    const url = new URL(request.url);
    const { searchParams } = url;
    const search = searchParams.get('search');
    const lowStock = searchParams.get('low_stock');
    // ✅ Leer category_id de filter_category_id (del hook) o category_id (directo)
    const categoryId = searchParams.get('filter_category_id') || searchParams.get('category_id');

    // ✅ Extraer parámetros de paginación
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url);
    
    console.log('📄 [GET /api/inventory] Parámetros:', {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      lowStock,
      categoryId
    });

    // ✅ Usar Service Role Client directamente para queries (bypass RLS)
    let query = supabaseAdmin
      .from('inventory')
      .select(`
        *,
        category:inventory_categories(
          id,
          name,
          description
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId);

    // Aplicar filtros
    if (lowStock === 'true') {
      // Filtrar por stock bajo: quantity <= minimum_stock
      // Nota: Esto requiere filtrar en memoria o usar una función SQL
      // Por ahora, obtenemos todos y filtramos después
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Ordenar
    const orderBy = sortBy || 'name';
    const ascending = sortOrder !== 'desc';
    query = query.order(orderBy, { ascending });

    // Paginación
    const offset = calculateOffset(page, pageSize);
    query = query.range(offset, offset + pageSize - 1);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) {
      console.error('[GET /api/inventory] Error en query:', itemsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener artículos de inventario',
          data: []
        },
        { status: 500 }
      );
    }

    // Filtrar stock bajo si es necesario (después de obtener datos paginados)
    let filteredItems = items || [];
    if (lowStock === 'true') {
      filteredItems = filteredItems.filter((item: any) => 
        item.quantity <= item.minimum_stock
      );
      // Recalcular count para stock bajo
      const { count: lowStockCount } = await supabaseAdmin
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      // Filtrar en memoria para obtener el count real
      const { data: allItems } = await supabaseAdmin
        .from('inventory')
        .select('quantity, minimum_stock')
        .eq('organization_id', organizationId);
      
      const actualLowStockCount = (allItems || []).filter((item: any) => 
        item.quantity <= item.minimum_stock
      ).length;
      
      const pagination = generatePaginationMeta(page, pageSize, actualLowStockCount);
      
      return NextResponse.json({
        success: true,
        data: {
          items: filteredItems,
          pagination
        }
      } as PaginatedResponse);
    }

    // ✅ Generar metadata de paginación
    const pagination = generatePaginationMeta(page, pageSize, count || 0);
    
    console.log('✅ [GET /api/inventory] Respuesta preparada:', {
      itemsCount: filteredItems.length,
      pagination
    });

    // ✅ Retornar respuesta paginada
    const response: PaginatedResponse<any> = {
      success: true,
      data: {
        items: filteredItems,
        pagination
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    const apiError = handleAPIError(error, 'GET /api/inventory');
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}

// POST: Crear nuevo item de inventario
export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[POST /api/inventory] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[POST /api/inventory] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;
    const body = await request.json();

    // ✅ VALIDACIÓN CRÍTICA: Si viene organization_id en el body, debe coincidir con el del usuario
    if (body.organization_id && body.organization_id !== organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede crear item en otra organización. El organization_id será asignado automáticamente.',
        },
        { status: 403 }
      );
    }

    // ✅ FORZAR organization_id del usuario (ignorar el del body por seguridad)
    body.organization_id = organizationId;

    // Validaciones
    if (!body.name || !body.sku || !body.category_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: name, sku, category_id',
        },
        { status: 400 }
      );
    }

    if (body.quantity < 0 || body.minimum_stock < 0 || body.unit_price < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Los valores numéricos no pueden ser negativos',
        },
        { status: 400 }
      );
    }

    const item = await createInventoryItem(organizationId, body);

    return NextResponse.json(
      {
        success: true,
        data: item,
        message: 'Item de inventario creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear item de inventario',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}