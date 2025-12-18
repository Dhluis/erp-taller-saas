import { NextRequest, NextResponse } from 'next/server';
import {
  getInventoryCategoryById,
  updateInventoryCategory,
  deleteInventoryCategory,
} from '@/lib/database/queries/inventory';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

/**
 * @swagger
 * /api/inventory/categories/{id}:
 *   get:
 *     summary: Obtener una categoría de inventario por ID
 *     tags: [Inventory Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Detalles de la categoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryCategory'
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error del servidor
 *   put:
 *     summary: Actualizar una categoría de inventario por ID
 *     tags: [Inventory Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la categoría
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInventoryCategoryData'
 *     responses:
 *       200:
 *         description: Categoría actualizada exitosamente
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
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error del servidor
 *   delete:
 *     summary: Eliminar una categoría de inventario por ID
 *     tags: [Inventory Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Categoría eliminada exitosamente
 *       409:
 *         description: No se puede eliminar porque tiene items asociados
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener una categoría por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const category = await getInventoryCategoryById(tenantContext.organizationId, params.id);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Categoría no encontrada',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener categoría',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar una categoría
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Validaciones
    if (body.name !== undefined) {
      if (body.name.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'El nombre de la categoría no puede estar vacío',
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
    }

    const category = await updateInventoryCategory(tenantContext.organizationId, params.id, body);

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Categoría actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar categoría',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una categoría
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 [DELETE /api/inventory/categories/[id]] Iniciando eliminación:', params.id);
    
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      console.error('❌ [DELETE] No se pudo obtener tenant context');
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }

    console.log('✅ [DELETE] Organization ID:', tenantContext.organizationId);
    console.log('✅ [DELETE] Category ID:', params.id);

    await deleteInventoryCategory(tenantContext.organizationId, params.id);

    console.log('✅ [DELETE] Categoría eliminada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
    });
  } catch (error) {
    console.error('❌ [DELETE] Error deleting category:', error);
    console.error('❌ [DELETE] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Error específico si la categoría tiene items asociados
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar la categoría porque tiene items asociados',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar categoría',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}