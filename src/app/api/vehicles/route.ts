import { NextRequest, NextResponse } from 'next/server';
import { createVehicle } from '@/lib/database/queries/vehicles';
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
 * /api/vehicles:
 *   get:
 *     summary: Obtener todos los vehículos o buscar
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Lista de vehículos
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
 *                     $ref: '#/components/schemas/Vehicle'
 *                 count:
 *                   type: number
 *   post:
 *     summary: Crear un nuevo vehículo
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVehicleData'
 *     responses:
 *       201:
 *         description: Vehículo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
// GET: Obtener todos los vehículos o buscar
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/vehicles] Error de autenticación:', authError);
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
      console.error('[GET /api/vehicles] Error obteniendo perfil:', profileError);
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

    // ✅ Extraer parámetros de paginación
    const url = new URL(request.url);
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url);
    const search = url.searchParams.get('search') || undefined;
    // ✅ Leer customer_id de filter_customer_id (del hook) o customer_id (directo)
    const customerId = url.searchParams.get('filter_customer_id') || url.searchParams.get('customer_id') || undefined;

    console.log('📄 [GET /api/vehicles] Parámetros:', {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      customerId
    });

    // ✅ Usar Service Role Client directamente para queries
    let query = supabaseAdmin
      .from('vehicles')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email,
          phone
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId);

    // Búsqueda en múltiples campos
    if (search) {
      query = query.or(`brand.ilike.%${search}%,model.ilike.%${search}%,license_plate.ilike.%${search}%,vin.ilike.%${search}%`);
    }

    // Filtrar por cliente específico
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Ordenamiento
    query = query.order(sortBy || 'created_at', { ascending: sortOrder === 'asc' });

    // Paginación
    const offset = calculateOffset(page, pageSize);
    query = query.range(offset, offset + pageSize - 1);

    const { data: vehicles, count, error: vehiclesError } = await query;

    if (vehiclesError) {
      console.error('[GET /api/vehicles] Error en query:', vehiclesError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener vehículos',
          data: []
        },
        { status: 500 }
      );
    }

    // ✅ Generar metadata de paginación
    const pagination = generatePaginationMeta(page, pageSize, count || 0);
    
    console.log('✅ [GET /api/vehicles] Respuesta preparada:', {
      itemsCount: vehicles?.length || 0,
      pagination
    });

    // ✅ Retornar respuesta paginada
    const response: PaginatedResponse<any> = {
      success: true,
      data: {
        items: vehicles || [],
        pagination
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener vehículos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo vehículo
export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[POST /api/vehicles] Error de autenticación:', authError);
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
      console.error('[POST /api/vehicles] Error obteniendo perfil:', profileError);
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

    // Validaciones básicas
    if (!body.customer_id || !body.brand || !body.model) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: customer_id, brand, model',
        },
        { status: 400 }
      );
    }

    // Validar año si está presente
    if (body.year) {
      const currentYear = new Date().getFullYear();
      if (body.year < 1900 || body.year > currentYear + 1) {
        return NextResponse.json(
          {
            success: false,
            error: `El año debe estar entre 1900 y ${currentYear + 1}`,
          },
          { status: 400 }
        );
      }
    }

    // ✅ Asegurar que el vehículo se cree con el organization_id del usuario autenticado
    const vehicleData = {
      ...body,
      organization_id: organizationId,
    };

    // ✅ USAR CLIENTE AUTENTICADO para que RLS funcione correctamente
    // El cliente autenticado tiene auth.uid() disponible para las políticas RLS
    const vehicle = await createVehicle(vehicleData, supabase);

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        message: 'Vehículo creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear vehículo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
