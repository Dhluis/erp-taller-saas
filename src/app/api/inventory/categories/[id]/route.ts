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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const category = await getInventoryCategoryById(tenantContext.organizationId, id);

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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
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

    const category = await updateInventoryCategory(tenantContext.organizationId, id, body);

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🔄 [DELETE /api/inventory/categories/[id]] Iniciando eliminación:', id);
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto (igual que POST)
    const { createClientFromRequest } = await import('@/lib/supabase/server')
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server')
    
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [DELETE] Error de autenticación:', authError)
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
      console.error('❌ [DELETE] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = userProfile.organization_id;
    console.log('✅ [DELETE] Usuario autenticado:', user.email)
    console.log('✅ [DELETE] Organization ID:', organizationId)
    console.log('✅ [DELETE] Category ID:', id)

    await deleteInventoryCategory(organizationId, id);

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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Error específico si la categoría tiene items asociados (409 Conflict)
    if (errorMessage.includes('producto(s) asociado(s)') || 
        errorMessage.includes('items asociados') ||
        errorMessage.includes('foreign key')) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 409 } // Conflict - La categoría tiene dependencias
      );
    }

    // Error si la categoría no pertenece a la organización (403 Forbidden)
    if (errorMessage.includes('no pertenece') || 
        errorMessage.includes('permisos')) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 403 } // Forbidden
      );
    }

    // Error si la categoría no existe (404 Not Found)
    if (errorMessage.includes('no encontrada') || 
        errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 404 } // Not Found
      );
    }

    // Otros errores (500 Internal Server Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar categoría',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}