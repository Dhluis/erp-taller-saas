import { NextRequest, NextResponse } from 'next/server';
import {
  getAllWorkOrders,
  createWorkOrder,
  searchWorkOrders,
  getWorkOrderStats,
} from '@/lib/database/queries/work-orders';
import { getOrganizationId } from '@/lib/auth/organization-server';

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
    const { searchParams } = new URL(request.url);
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

    // ✅ Obtener organizationId del request para asegurar multi-tenant
    const organizationId = await getOrganizationId(request);
    
    let orders;

    if (search) {
      orders = await searchWorkOrders(search);
    } else if (status) {
      orders = await getAllWorkOrders(organizationId, { status: status as any });
    } else {
      orders = await getAllWorkOrders(organizationId);
    }

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
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
    // ✅ Obtener organizationId del usuario autenticado (SIEMPRE requerido)
    const organizationId = await getOrganizationId(request);
    
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

    // ✅ VALIDACIÓN DE SEGURIDAD: Si el body incluye workshop_id, validar que pertenece a la organización
    if (body.workshop_id) {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      const { data: workshop, error: workshopError } = await supabase
        .from('workshops')
        .select('id')
        .eq('id', body.workshop_id)
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
      // workshop_id se mantiene del body si existe y es válido, o se omite
    };

    console.log('[POST /api/work-orders] 📦 Creando orden:', {
      hasWorkshop: !!orderData.workshop_id,
      workshopId: orderData.workshop_id || 'sin asignar',
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
