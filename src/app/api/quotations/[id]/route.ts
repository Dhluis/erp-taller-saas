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
  { params }: { params: Promise<{ id: string }> }
) {
  let context;
  try {
    const { id: quotationId } = await params;
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: No se pudo obtener la organización' },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    context = createLogContext(organizationId, undefined, 'quotations-api', 'GET', { quotationId });
    logger.info('Obteniendo cotización por ID', context);

    // Obtener cotización usando Supabase directamente
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: quotation, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        vehicle:vehicles(*),
        items:quotation_items(*)
      `)
      .eq('id', quotationId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !quotation) {
      logger.warn('Cotización no encontrada', context);
      return NextResponse.json(
        { success: false, error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Mapear campos para compatibilidad con el modal
    const responseData = {
      ...quotation,
      quotation_items: quotation.items || []
    };

    logger.info(`Cotización obtenida exitosamente: ${quotationId}`, context);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    const error = err as Error;
    console.error('❌ [GET /api/quotations/[id]] Error:', error);
    if (context) logger.error('Error al obtener cotización', context, error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener cotización' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar cotización
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let context;
  try {
    const { id: quotationId } = await params;
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: No se pudo obtener la organización' },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    context = createLogContext(organizationId, undefined, 'quotations-api', 'PUT', { quotationId });
    
    const body = await request.json();
    logger.info('Actualizando cotización', context, { updateData: body });

    // Validar datos de entrada
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Datos de actualización inválidos' },
        { status: 400 }
      );
    }

    // Verificar que la cotización existe y pertenece a la organización
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: existingQuotation, error: checkError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', quotationId)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !existingQuotation) {
      return NextResponse.json(
        { success: false, error: 'Cotización no encontrada o no autorizada' },
        { status: 404 }
      );
    }

    // Solo permitir editar borradores o enviadas (no convertidas)
    if (existingQuotation.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'No se pueden editar cotizaciones que ya han sido convertidas' },
        { status: 400 }
      );
    }

    // Actualizar cotización
    const updateData: any = {
      updated_by: tenantContext.userId,
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      'customer_id', 'vehicle_id', 'valid_until', 'terms_and_conditions',
      'notes', 'status', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const { data: quotation, error: updateError } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', quotationId)
      .eq('organization_id', organizationId)
      .select()
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
        .eq('quotation_id', quotationId)
        .eq('organization_id', organizationId);

      // Insertar nuevos items
      if (body.items.length > 0) {
        const items = body.items.map((item: any) => ({
          quotation_id: quotationId,
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
          customer:customers(*),
          vehicle:vehicles(*),
          quotation_items (*)
        `)
        .eq('id', quotationId)
        .eq('organization_id', organizationId)
        .single();

      if (!fetchError && updatedQuotation) {
        logger.businessEvent('quotation_updated', 'quotation', quotationId, context);
        return NextResponse.json({
          success: true,
          data: updatedQuotation,
        });
      }
    }

    logger.businessEvent('quotation_updated', 'quotation', quotationId, context);

    return NextResponse.json({
      success: true,
      data: quotation,
    });
  } catch (err) {
    const error = err as Error;
    console.error('❌ [PUT /api/quotations/[id]] Error:', error);
    if (context) logger.error('Error al actualizar cotización', context, error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar cotización' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Eliminar cotización
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let context;
  try {
    const { id: quotationId } = await params;
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: No se pudo obtener la organización' },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    context = createLogContext(organizationId, undefined, 'quotations-api', 'DELETE', { quotationId });
    logger.info('Eliminando cotización', context);

    // Verificar que la cotización existe y pertenece a la organización
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: existingQuotation, error: checkError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', quotationId)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !existingQuotation) {
      logger.warn('Intento de eliminar cotización inexistente o no autorizada', context);
      return NextResponse.json(
        { success: false, error: 'Cotización no encontrada o no autorizada' },
        { status: 404 }
      );
    }

    // Verificar si la cotización puede ser eliminada
    if (existingQuotation.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar una cotización que ya ha sido convertida' },
        { status: 400 }
      );
    }

    // Eliminar items primero
    await supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', quotationId)
      .eq('organization_id', organizationId);

    // Eliminar cotización
    const { error: deleteError } = await supabase
      .from('quotations')
      .delete()
      .eq('id', quotationId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      logger.error('Error eliminando cotización', context, deleteError as Error);
      throw deleteError;
    }

    logger.businessEvent('quotation_deleted', 'quotation', quotationId, context);
    logger.info('Cotización eliminada exitosamente', context);

    return NextResponse.json({
      success: true,
      message: 'Cotización eliminada correctamente',
    });
  } catch (err) {
    const error = err as Error;
    console.error('❌ [DELETE /api/quotations/[id]] Error:', error);
    if (context) logger.error('Error al eliminar cotización', context, error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar cotización' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Actualizaciones específicas
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let context;
  try {
    const { id: quotationId } = await params;
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: No se pudo obtener la organización' },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    context = createLogContext(organizationId, undefined, 'quotations-api', 'PATCH', { quotationId });
    
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Procesando actualización específica de cotización', context, { action, data });

    let result;

    switch (action) {
      case 'update_status':
        if (!data.status) {
          return NextResponse.json(
            { success: false, error: 'Estado requerido para actualizar' },
            { status: 400 }
          );
        }
        result = await updateQuotationStatus(quotationId, data.status);
        logger.businessEvent('quotation_status_updated', 'quotation', quotationId, context);
        break;

      case 'update_discount':
        if (typeof data.discount !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Descuento debe ser un número válido' },
            { status: 400 }
          );
        }
        result = await updateQuotationDiscount(quotationId, data.discount);
        await recalculateQuotationTotals(organizationId, quotationId);
        logger.businessEvent('quotation_discount_updated', 'quotation', quotationId, context);
        break;

      case 'recalculate_totals':
        await recalculateQuotationTotals(organizationId, quotationId);
        result = await getQuotationById(quotationId);
        logger.info('Totales de cotización recalculados', context);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Acción no válida: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const error = err as Error;
    console.error('❌ [PATCH /api/quotations/[id]] Error:', error);
    if (context) logger.error('Error en actualización específica de cotización', context, error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error en actualización específica' },
      { status: 500 }
    );
  }
}