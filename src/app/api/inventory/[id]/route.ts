import { NextRequest, NextResponse } from 'next/server';
import {
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} from '@/lib/database/queries/inventory';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Obtener un artículo de inventario por ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del artículo de inventario
 *     responses:
 *       200:
 *         description: Detalles del artículo de inventario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryItem'
 *       404:
 *         description: Artículo no encontrado
 *       500:
 *         description: Error del servidor
 *   put:
 *     summary: Actualizar un artículo de inventario por ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del artículo de inventario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInventoryItemData'
 *     responses:
 *       200:
 *         description: Artículo actualizado exitosamente
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
 *       404:
 *         description: Artículo no encontrado
 *       500:
 *         description: Error del servidor
 *   delete:
 *     summary: Eliminar un artículo de inventario por ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del artículo de inventario
 *     responses:
 *       200:
 *         description: Artículo eliminado exitosamente
 *       404:
 *         description: Artículo no encontrado
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener un artículo por ID
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
    const item = await getInventoryItemById(tenantContext.organizationId, id);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el artículo de inventario',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un artículo
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

    // ✅ FIX: Mapear minimum_stock a min_quantity si viene en el body
    if (body.minimum_stock !== undefined && body.min_quantity === undefined) {
      body.min_quantity = body.minimum_stock;
      delete body.minimum_stock; // Eliminar para evitar confusión
    }

    // Validaciones básicas
    if (body.name !== undefined && body.name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del artículo no puede estar vacío',
        },
        { status: 400 }
      );
    }

    if (body.sku !== undefined && body.sku.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'El SKU no puede estar vacío',
        },
        { status: 400 }
      );
    }

    if (body.unit_price !== undefined && (isNaN(body.unit_price) || body.unit_price < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El precio debe ser un número válido mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    if (body.quantity !== undefined && (isNaN(body.quantity) || body.quantity < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'La cantidad debe ser un número válido mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    const item = await updateInventoryItem(tenantContext.organizationId, id, body);

    return NextResponse.json({
      success: true,
      data: item,
      message: 'Artículo actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar el artículo de inventario',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un artículo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🔄 [DELETE /api/inventory/[id]] Iniciando eliminación:', id);
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const { createClientFromRequest, getSupabaseServiceClient } = await import('@/lib/supabase/server');
    
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [DELETE] Error de autenticación:', authError);
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [DELETE] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    const organizationId = userProfile.organization_id;
    console.log('✅ [DELETE] Usuario:', user.email, 'Org:', organizationId);

    await deleteInventoryItem(organizationId, id);

    console.log('✅ [DELETE] Producto eliminado exitosamente');
    return NextResponse.json({
      success: true,
      message: 'Artículo eliminado exitosamente',
    });
  } catch (error) {
    console.error('❌ [DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el artículo de inventario',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}