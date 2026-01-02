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
    const status = searchParams.get('status');
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

    // Obtener organization_id y rol del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
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
    
    // ✅ Si es mecánico, obtener su employee_id para filtrar órdenes asignadas
    // Nota: La relación entre users y employees puede ser por email
    // La tabla employees NO tiene user_id, se relaciona por email
    let assignedEmployeeId: string | null = null;
    if (userRole === 'MECANICO' && user.email) {
      try {
        console.log(`[GET /api/work-orders] 🔍 Buscando employee para mecánico: ${user.email} (org: ${organizationId})`);
        
        // Buscar employee por email (relación más común)
        let { data: employee, error: employeeError } = await supabaseAdmin
          .from('employees')
          .select('id, email, name')
          .eq('email', user.email)
          .eq('organization_id', organizationId)
          .maybeSingle();
        
        // ✅ Si no se encuentra por email, buscar employees sin email y actualizar el primero
        if (!employee && !employeeError) {
          console.log(`[GET /api/work-orders] ⚠️ No se encontró employee con email ${user.email}, buscando employees sin email...`);
          
          // Buscar employees sin email en la organización
          const { data: employeesWithoutEmail, error: employeesError } = await supabaseAdmin
            .from('employees')
            .select('id, email, name')
            .eq('organization_id', organizationId)
            .is('email', null)
            .limit(1);
          
          if (!employeesError && employeesWithoutEmail && employeesWithoutEmail.length > 0) {
            const employeeToUpdate = employeesWithoutEmail[0];
            console.log(`[GET /api/work-orders] 🔧 Actualizando employee ${employeeToUpdate.id} (${employeeToUpdate.name}) con email ${user.email}`);
            
            // Actualizar el employee con el email del usuario
            const { data: updatedEmployee, error: updateError } = await supabaseAdmin
              .from('employees')
              .update({ email: user.email })
              .eq('id', employeeToUpdate.id)
              .select('id, email, name')
              .single();
            
            if (!updateError && updatedEmployee) {
              employee = updatedEmployee;
              console.log(`[GET /api/work-orders] ✅ Employee actualizado exitosamente: ${updatedEmployee.id}`);
            } else {
              console.error(`[GET /api/work-orders] ❌ Error actualizando employee:`, updateError);
            }
          }
        }
        
        if (employee) {
          assignedEmployeeId = employee.id;
          console.log(`[GET /api/work-orders] ✅ Employee encontrado: ${employee.id} (${employee.name || employee.email})`);
        } else {
          console.warn(`[GET /api/work-orders] ⚠️ Mecánico ${user.id} (${user.email}) no tiene employee_id asociado`);
          console.warn(`[GET /api/work-orders] ⚠️ Error:`, employeeError);
          
          // ✅ DEBUG: Buscar todos los employees de la organización para ver qué hay
          const { data: allEmployees, error: allEmployeesError } = await supabaseAdmin
            .from('employees')
            .select('id, email, name, organization_id')
            .eq('organization_id', organizationId)
            .limit(10);
          
          console.log(`[GET /api/work-orders] 🔍 Employees en la organización:`, allEmployees);
          console.log(`[GET /api/work-orders] 🔍 Error al buscar todos:`, allEmployeesError);
          
          // Si no tiene employee_id, retornar array vacío (no puede ver órdenes)
          return NextResponse.json({
            success: true,
            data: [],
            count: 0,
            message: 'No se encontró empleado asociado a este usuario',
            debug: {
              userEmail: user.email,
              organizationId,
              employeeError: employeeError?.message,
              availableEmployees: allEmployees?.length || 0
            }
          });
        }
      } catch (error) {
        console.error('[GET /api/work-orders] ❌ Error buscando employee:', error);
        // En caso de error, retornar array vacío para no romper la aplicación
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
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
            )
          `, { count: 'exact' }) // ✅ IMPORTANTE: count para paginación
          .eq('organization_id', organizationId);
        
        // ✅ Si es mecánico, filtrar solo órdenes asignadas a él
        if (userRole === 'MECANICO' && assignedEmployeeId) {
          console.log(`[GET /api/work-orders] 🔍 Filtrando órdenes por assigned_to: ${assignedEmployeeId}`);
          query = query.eq('assigned_to', assignedEmployeeId);
        } else if (userRole === 'MECANICO' && !assignedEmployeeId) {
          console.log(`[GET /api/work-orders] ⚠️ Mecánico sin assignedEmployeeId, no se pueden mostrar órdenes`);
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
        assignedEmployeeId,
        organizationId,
        ordersFound: orders?.length || 0,
        hasAssignedEmployeeId: !!assignedEmployeeId
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

    console.log('[POST /api/work-orders] 📦 Creando orden:', {
      hasWorkshop: !!orderData.workshop_id,
      workshopId: orderData.workshop_id || null, // ✅ null en lugar de 'sin asignar'
      organizationId: orderData.organization_id
    });

    const order = await createWorkOrder(orderData);

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
