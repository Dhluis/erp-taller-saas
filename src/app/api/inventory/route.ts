import { NextRequest, NextResponse } from 'next/server';
import {
  getAllInventoryItems,
  createInventoryItem,
  searchInventoryItems,
  getLowStockItems,
} from '@/lib/database/queries/inventory';
import { handleAPIError, createErrorResponse } from '@/lib/errors/APIError';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

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
    // ✅ Obtener organizationId del usuario autenticado
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const lowStock = searchParams.get('low_stock');
    const organizationId = tenantContext.organizationId;

    let items;
    
    if (lowStock === 'true') {
      items = await getLowStockItems(organizationId);
    } else if (search) {
      items = await searchInventoryItems(search, organizationId);
    } else {
      items = await getAllInventoryItems(organizationId);
    }

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
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
    // ✅ Obtener organizationId del usuario autenticado
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const organizationId = tenantContext.organizationId;

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