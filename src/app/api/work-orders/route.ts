import { NextRequest, NextResponse } from 'next/server';
import { createWorkOrder, getWorkOrderStats } from '@/lib/database/queries/work-orders';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { 
  extractPaginationFromURL, 
  calculateOffset, 
  generatePaginationMeta 
} from '@/lib/utils/pagination';
import type { PaginatedResponse } from '@/types/pagination';

// ✅ Función helper para retry logic
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 500
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        console.warn(`⚠️ [Retry] Intento ${i + 1} falló, reintentando en ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

/**
 * @swagger
 * /api/work-orders:
 *   get:
 *     summary: Obtener todas las órdenes de trabajo, buscar o estadísticas
 *     tags: [Work Orders]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por estado
 *       - in: query
 *         name: stats
 *         schema:
 *           type: string
 *         description: Obtener estadísticas (true/false)
 *     responses:
 *       200:
 *         description: Lista de órdenes de trabajo o estadísticas
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
 *                     $ref: '#/components/schemas/WorkOrder'
 *                 count:
 *                   type: number
 *   post:
 *     summary: Crear una nueva orden de trabajo
 *     tags: [Work Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWorkOrderData'
 *     responses:
 *       201:
 *         description: Orden de trabajo creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WorkOrder'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener todas las órdenes o buscar
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const search = searchParams.get('search');
    // ✅ FIX: Leer status desde filter_status (enviado por buildPaginationQueryString) o status directo
    const status = searchParams.get('filter_status') || searchParams.get('status') || null;
    const stats = searchParams.get('stats');

    // Si se solicitan estadísticas
    if (stats === 'true') {
      const statistics = await getWorkOrderStats();
      return NextResponse.json({
        success: true,
        data: statistics,
      });
    }

    // ✅ Extraer parámetros de paginación
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url);
    
    console.log('📄 [GET /api/work-orders] Parámetros de paginación:', {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      status
    });

    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/work-orders] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: []
        },
        { status: 401 }
      );
    }

    // Obtener organization_id, rol e id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[GET /api/work-orders] Error obteniendo perfil:', profileError);
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
    const userRole = userProfile.role;
    
    // ✅ Si es mecánico, usar directamente users.id para filtrar órdenes asignadas
    // work_orders.assigned_to ahora referencia users.id (no employees.id)
    let assignedUserId: string | null = null;
    if (userRole === 'MECANICO') {
      // Ya tenemos el users.id en userProfile (lo agregamos al select)
      assignedUserId = userProfile.id;
      console.log(`[GET /api/work-orders] ✅ Mecánico users.id: ${assignedUserId}`);
    }
    
    // ✅ Helper para crear timeout promise
    const createTimeoutPromise = () => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout después de 10 segundos')), 10000);
    });
    
    // ✅ Construir y ejecutar query con paginación
    let orders, count, ordersError;
    
    try {
      const queryPromise = retryQuery(async () => {
        console.log('🔍 [GET /api/work-orders] Construyendo query paginada...');
        
        // Base query
        let query = supabaseAdmin
          .from('work_orders')
          .select(`
            *,
            customer:customers(
              id,
              name,
              email,
              phone
            ),
            vehicle:vehicles(
              id,
              brand,
              model,
              year,
              license_plate
            ),
            assigned_user:users!work_orders_assigned_to_fkey(
              id,
              full_name,
              role,
              email
            )
          `, { count: 'exact' }) // ✅ IMPORTANTE: count para paginación
          .eq('organization_id', organizationId)
          .is('deleted_at', null); // ✅ SOFT DELETE: Solo mostrar órdenes activas
        
        // ✅ Si es mecánico, filtrar solo órdenes asignadas a él (usando users.id)
        if (userRole === 'MECANICO' && assignedUserId) {
          console.log(`[GET /api/work-orders] 🔍 Filtrando órdenes por assigned_to (users.id): ${assignedUserId}`);
          query = query.eq('assigned_to', assignedUserId);
        } else if (userRole === 'MECANICO' && !assignedUserId) {
          console.warn(`[GET /api/work-orders] ⚠️ Mecánico sin users.id - no se pueden filtrar órdenes`);
          // Si no se puede obtener users.id, no mostrar órdenes (más seguro)
          query = query.eq('assigned_to', '00000000-0000-0000-0000-000000000000'); // ID imposible = 0 resultados
        }

        // ✅ Filtros
        if (search) {
          query = query.or(`id.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`);
        }

        if (status) {
          query = query.eq('status', status);
        }
        
        // ✅ Ordenamiento
        const orderColumn = sortBy || 'created_at';
        const orderDirection = sortOrder === 'asc';
        query = query.order(orderColumn, { ascending: orderDirection });
        
        // ✅ Paginación - CLAVE PARA PERFORMANCE
        const offset = calculateOffset(page, pageSize);
        query = query.range(offset, offset + pageSize - 1);
        
        console.log('🔍 [GET /api/work-orders] Query configurada:', {
          offset,
          limit: pageSize,
          orderBy: `${orderColumn} ${orderDirection ? 'ASC' : 'DESC'}`
        });
        
        // Ejecutar query
        const result = await query;
        
        console.log('✅ [GET /api/work-orders] Query ejecutada:', {
          itemsReturned: result.data?.length || 0,
          totalCount: result.count,
          hasError: !!result.error
        });
        
        return result;
      }, 2, 500);
      
      // Race entre query y timeout
      const result = await Promise.race([queryPromise, createTimeoutPromise()]) as any;
      
      if (result && typeof result === 'object' && 'data' in result) {
        orders = result.data;
        count = result.count;
        ordersError = result.error;
      } else {
        throw new Error('Resultado inesperado de la query');
      }
      
    } catch (retryError: any) {
      console.error('❌ [GET /api/work-orders] Falló después de reintentos:', retryError);
      
      // Si es timeout, retornar error específico
      if (retryError?.message?.includes('timeout')) {
        return NextResponse.json({ 
          success: false, 
          error: 'La consulta tardó demasiado. Por favor, intenta de nuevo.' 
        }, { status: 504 });
      }
      
      ordersError = retryError;
      orders = null;
      count = null;
    }

    // ✅ Manejar errores
    if (ordersError) {
      console.error('❌ [GET /api/work-orders] Error en query:', ordersError);
      return NextResponse.json({ 
        success: false, 
        error: 'Error al obtener órdenes de trabajo' 
      }, { status: 500 });
    }

    if (!orders) {
      console.warn('⚠️ [GET /api/work-orders] No se obtuvieron órdenes');
      orders = [];
    }
    
    // ✅ Generar metadata de paginación
    const pagination = generatePaginationMeta(page, pageSize, count || 0);
    
    console.log('✅ [GET /api/work-orders] Respuesta preparada:', {
      itemsCount: orders.length,
      pagination
    });
    
    // ✅ DEBUG: Log para mecánicos
    if (userRole === 'MECANICO') {
      console.log(`[GET /api/work-orders] 📊 Órdenes encontradas para mecánico: ${orders?.length || 0}`);
      console.log(`[GET /api/work-orders] 🔍 Filtro aplicado: ${assignedUserId ? `assigned_to = ${assignedUserId} (users.id)` : 'NINGUNO (error obteniendo users.id)'}`);
      if (orders && orders.length > 0) {
        console.log(`[GET /api/work-orders] 📋 Primeras órdenes:`, orders.slice(0, 3).map((o: any) => ({
          id: o.id,
          assigned_to: o.assigned_to,
          status: o.status,
          customer: o.customer?.name
        })));
      }
    }

    // ✅ Retornar respuesta paginada
    const response: PaginatedResponse<any> = {
      success: true,
      data: {
        items: orders,
        pagination
      }
    };

    // ✅ DEBUG: Incluir información de debug en la respuesta para mecánicos (solo en desarrollo)
    if (userRole === 'MECANICO' && process.env.NODE_ENV === 'development') {
      (response as any).debug = {
        userRole,
        userEmail: user.email,
        assignedUserId,
        organizationId,
        ordersFound: orders?.length || 0,
        hasAssignedUserId: !!assignedUserId
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener órdenes de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Crear nueva orden de trabajo
export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[POST /api/work-orders] Error de autenticación:', authError);
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
      console.error('[POST /api/work-orders] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;
    
    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado - No se pudo obtener la organización del usuario',
        },
        { status: 403 }
      );
    }

    // ✅ VERIFICAR LÍMITES ANTES DE CREAR
    const { checkResourceLimit } = await import('@/lib/billing/check-limits');
    const limitCheck = await checkResourceLimit(user.id, 'work_order');
    
    if (!limitCheck.canCreate) {
      console.log('[POST /api/work-orders] Límite alcanzado:', limitCheck.error?.message);
      return NextResponse.json(
        {
          success: false,
          error: limitCheck.error?.message || 'Límite de órdenes alcanzado',
          limit_reached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgrade_url: limitCheck.error?.upgrade_url || '/dashboard/billing',
          feature: limitCheck.error?.feature || 'max_orders_per_month'
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validaciones básicas
    if (!body.customer_id || !body.vehicle_id || !body.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: customer_id, vehicle_id, description',
        },
        { status: 400 }
      );
    }

    if (body.description.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'La descripción debe tener al menos 10 caracteres',
        },
        { status: 400 }
      );
    }

    // Validar fecha estimada si existe
    if (body.estimated_completion) {
      const estimatedDate = new Date(body.estimated_completion);
      const now = new Date();
      
      if (estimatedDate < now) {
        return NextResponse.json(
          {
            success: false,
            error: 'La fecha estimada no puede ser en el pasado',
          },
          { status: 400 }
        );
      }
    }

    // ✅ NORMALIZAR workshop_id: convertir 'sin asignar', strings vacíos o inválidos a null
    let workshopId: string | null = null;
    if (body.workshop_id && 
        body.workshop_id !== 'sin asignar' && 
        body.workshop_id !== '' && 
        body.workshop_id !== 'none' &&
        typeof body.workshop_id === 'string' &&
        body.workshop_id.length > 0) {
      // Validar que es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(body.workshop_id)) {
        workshopId = body.workshop_id;
      }
    }

    // ✅ VALIDACIÓN DE SEGURIDAD: Si workshop_id es válido, validar que pertenece a la organización
    if (workshopId) {
      const { data: workshop, error: workshopError } = await supabaseAdmin
        .from('workshops')
        .select('id')
        .eq('id', workshopId)
        .eq('organization_id', organizationId)
        .single();

      if (workshopError || !workshop) {
        return NextResponse.json(
          {
            success: false,
            error: 'Workshop no válido para esta organización',
          },
          { status: 403 }
        );
      }
    }

    // ✅ Crear orden con organization_id del usuario autenticado (forzar seguridad)
    // ✅ workshop_id es opcional - puede ser null si la org tiene múltiples workshops
    const orderData = {
      ...body,
      organization_id: organizationId, // ✅ Forzar del usuario autenticado
      workshop_id: workshopId, // ✅ Siempre null o UUID válido, nunca 'sin asignar'
    };

    // ✅ LOGGING DETALLADO: Mostrar TODOS los campos que se van a insertar
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[POST /api/work-orders] 📦 DATOS PARA INSERTAR:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('organization_id:', orderData.organization_id);
    console.log('workshop_id:', orderData.workshop_id || 'NULL');
    console.log('customer_id:', orderData.customer_id);
    console.log('vehicle_id:', orderData.vehicle_id);
    console.log('description:', orderData.description?.substring(0, 50) + '...');
    console.log('status:', orderData.status || 'pending (default)');
    console.log('assigned_to:', orderData.assigned_to || 'NULL');
    console.log('estimated_completion:', orderData.estimated_completion || 'NULL');
    console.log('total_amount:', orderData.total_amount || 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[POST /api/work-orders] 📋 TODOS LOS CAMPOS (JSON):', JSON.stringify(orderData, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ USAR CLIENTE AUTENTICADO para que RLS funcione correctamente
    // El cliente autenticado tiene auth.uid() disponible para las políticas RLS
    const authenticatedSupabase = createClientFromRequest(request);
    const order = await createWorkOrder(orderData, authenticatedSupabase);

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: 'Orden de trabajo creada exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
