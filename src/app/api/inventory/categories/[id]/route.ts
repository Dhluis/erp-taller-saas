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
    console.log('🔄 [DELETE CAT] V2 - ID:', id);
    
    const { createClientFromRequest, getSupabaseServiceClient } = await import('@/lib/supabase/server')
    
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [DELETE CAT] No autenticado');
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 404 });
    }

    const organizationId = userProfile.organization_id;
    console.log('✅ [DELETE CAT] Org:', organizationId);

    // Verificar que la categoría existe y pertenece a la organización
    const { data: category } = await supabaseAdmin
      .from('inventory_categories')
      .select('id, name')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!category) {
      console.error('❌ [DELETE CAT] No encontrada');
      return NextResponse.json({ success: false, error: 'Categoría no encontrada' }, { status: 404 });
    }

    // Verificar si tiene productos
    const { data: products } = await supabaseAdmin
      .from('inventory')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (products && products.length > 0) {
      console.error('❌ [DELETE CAT] Tiene productos');
      return NextResponse.json({ 
        success: false, 
        error: 'No se puede eliminar: tiene productos asociados' 
      }, { status: 409 });
    }

    // ELIMINAR DIRECTAMENTE
    const { error: deleteError } = await supabaseAdmin
      .from('inventory_categories')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('❌ [DELETE CAT] Error:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    console.log('✅ [DELETE CAT] Eliminada:', category.name);
    return NextResponse.json({ success: true, message: 'Categoría eliminada' });
    
  } catch (error) {
    console.error('❌ [DELETE CAT] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}