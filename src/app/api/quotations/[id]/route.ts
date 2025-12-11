/**
 * API Route para Cotizaciones por ID
 * Maneja operaciones GET, PUT, DELETE para cotizaciones específicas
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
  updateQuotationDiscount,
  recalculateQuotationTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// =====================================================
// GET - Obtener cotización por ID
// =====================================================
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

    const organizationId = tenantContext.organizationId;
    const context = createLogContext(
      organizationId,
      undefined,
      'quotations-api',
      'GET',
      { quotationId: params.id }
    );
    logger.info('Obteniendo cotización por ID', context);

    // Obtener cotización usando Supabase directamente
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: quotation, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (*),
        vehicles (*),
        quotation_items (*)
      `)
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !quotation) {
      logger.warn('Cotización no encontrada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    logger.info(`Cotización obtenida exitosamente: ${quotation.id}`, context);

    return NextResponse.json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    logger.error('Error al obtener cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar cotización
// =====================================================
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

    const organizationId = tenantContext.organizationId;
    const context = createLogContext(
      organizationId,
      undefined,
      'quotations-api',
      'PUT',
      { quotationId: params.id }
    );
    
    const body = await request.json();
    logger.info('Actualizando cotización', context, { updateData: body });

    // Validar datos de entrada
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de actualización inválidos',
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización existe y pertenece a la organización
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: existingQuotation, error: checkError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !existingQuotation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada o no autorizada',
        },
        { status: 404 }
      );
    }

    // Solo permitir editar borradores
    if (existingQuotation.status !== 'draft' && body.status !== existingQuotation.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo se pueden editar cotizaciones en estado borrador',
        },
        { status: 400 }
      );
    }

    // Actualizar cotización
    const updateData: any = {
      updated_by: tenantContext.userId,
      updated_at: new Date().toISOString(),
    };

    if (body.customer_id) updateData.customer_id = body.customer_id;
    if (body.vehicle_id) updateData.vehicle_id = body.vehicle_id;
    if (body.valid_until) updateData.valid_until = body.valid_until;
    if (body.terms_and_conditions !== undefined) updateData.terms_and_conditions = body.terms_and_conditions;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) updateData.status = body.status;
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
    if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
    if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
    if (body.total_amount !== undefined) updateData.total_amount = body.total_amount;

    const { data: quotation, error: updateError } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .select(`
        *,
        customers (*),
        vehicles (*),
        quotation_items (*)
      `)
      .single();

    if (updateError) {
      logger.error('Error actualizando cotización', context, updateError as Error);
      throw updateError;
    }

    // Actualizar items si se proporcionaron
    if (body.items && Array.isArray(body.items)) {
      // Eliminar items existentes
      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', params.id)
        .eq('organization_id', organizationId);

      // Insertar nuevos items
      if (body.items.length > 0) {
        const items = body.items.map((item: any) => ({
          quotation_id: params.id,
          organization_id: organizationId,
          item_type: item.item_type || 'service',
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount || 0,
          tax_percent: item.tax_percent || 16,
          subtotal: item.subtotal,
          tax_amount: item.tax_amount,
          total: item.total,
          service_id: item.service_id || null,
          inventory_id: item.inventory_id || null,
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(items);

        if (itemsError) {
          logger.error('Error actualizando items', context, itemsError as Error);
          throw itemsError;
        }
      }

      // Obtener cotización actualizada con items
      const { data: updatedQuotation, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (*),
          vehicles (*),
          quotation_items (*)
        `)
        .eq('id', params.id)
        .eq('organization_id', organizationId)
        .single();

      if (!fetchError && updatedQuotation) {
        logger.businessEvent('quotation_updated', 'quotation', params.id, context);
        return NextResponse.json({
          success: true,
          data: updatedQuotation,
        });
      }
    }

    logger.businessEvent('quotation_updated', 'quotation', params.id, context);

    return NextResponse.json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    logger.error('Error al actualizar cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Eliminar cotización
// =====================================================
export async function DELETE(
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

    const organizationId = tenantContext.organizationId;
    const context = createLogContext(
      organizationId,
      undefined,
      'quotations-api',
      'DELETE',
      { quotationId: params.id }
    );
    logger.info('Eliminando cotización', context);

    // Verificar que la cotización existe y pertenece a la organización
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: existingQuotation, error: checkError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !existingQuotation) {
      logger.warn('Intento de eliminar cotización inexistente o no autorizada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada o no autorizada',
        },
        { status: 404 }
      );
    }

    // Verificar si la cotización puede ser eliminada
    if (existingQuotation.status === 'converted') {
      logger.warn('Intento de eliminar cotización convertida', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar una cotización que ya ha sido convertida',
        },
        { status: 400 }
      );
    }

    // Solo permitir eliminar borradores
    if (existingQuotation.status !== 'draft') {
      logger.warn('Intento de eliminar cotización que no es borrador', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Solo se pueden eliminar cotizaciones en estado borrador',
        },
        { status: 400 }
      );
    }

    // Eliminar items primero
    await supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', params.id)
      .eq('organization_id', organizationId);

    // Eliminar cotización
    const { error: deleteError } = await supabase
      .from('quotations')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', organizationId);

    if (deleteError) {
      logger.error('Error eliminando cotización', context, deleteError as Error);
      throw deleteError;
    }

    logger.businessEvent('quotation_deleted', 'quotation', params.id, context);
    logger.info('Cotización eliminada exitosamente', context);

    return NextResponse.json({
      success: true,
      message: 'Cotización eliminada correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Actualizaciones específicas
// =====================================================
export async function PATCH(
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

    const organizationId = tenantContext.organizationId;
    const context = createLogContext(
      organizationId,
      undefined,
      'quotations-api',
      'PATCH',
      { quotationId: params.id }
    );
    
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Procesando actualización específica de cotización', context, { action, data });

    let result;

    switch (action) {
      case 'update_status':
        if (!data.status) {
          return NextResponse.json(
            {
              success: false,
              error: 'Estado requerido para actualizar',
            },
            { status: 400 }
          );
        }
        result = await updateQuotationStatus(params.id, data.status);
        logger.businessEvent('quotation_status_updated', 'quotation', params.id, context);
        break;

      case 'update_discount':
        if (typeof data.discount !== 'number') {
          return NextResponse.json(
            {
              success: false,
              error: 'Descuento debe ser un número válido',
            },
            { status: 400 }
          );
        }
        result = await updateQuotationDiscount(params.id, data.discount);
        await recalculateQuotationTotals(organizationId, params.id);
        logger.businessEvent('quotation_discount_updated', 'quotation', params.id, context);
        break;

      case 'recalculate_totals':
        await recalculateQuotationTotals(organizationId, params.id);
        result = await getQuotationById(params.id);
        logger.info('Totales de cotización recalculados', context);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Acción no válida: ${action}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error en actualización específica de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en actualización específica',
      },
      { status: 500 }
    );
  }
}