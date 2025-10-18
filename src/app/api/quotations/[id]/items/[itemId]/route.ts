/**
 * API Route para Item Específico de Cotización
 * Maneja operaciones GET, PUT, DELETE para un item específico
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotationItems,
  updateQuotationItem,
  deleteQuotationItem,
  getQuotationById,
  recalculateQuotationTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// GET - Obtener item específico
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-items-api',
    'GET',
    { quotationId: params.id, itemId: params.itemId }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo item específico de cotización', context);

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Intento de obtener item de cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Obtener todos los items y buscar el específico
    const items = await getQuotationItems(params.id);
    const item = items.find(i => i.id === params.itemId);

    if (!item) {
      logger.warn('Item no encontrado en cotización', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Item no encontrado',
        },
        { status: 404 }
      );
    }

    logger.info(`Item obtenido exitosamente: ${item.id}`, context);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    logger.error('Error al obtener item de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener item de cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar item específico
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-items-api',
    'PUT',
    { quotationId: params.id, itemId: params.itemId }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando item específico de cotización', context, { updateData: body });

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Intento de actualizar item de cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser editada
    if (quotation.status === 'converted') {
      logger.warn('Intento de actualizar item de cotización convertida', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede editar items de una cotización que ya ha sido convertida',
        },
        { status: 400 }
      );
    }

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

    // Validar tipos de datos si se proporcionan
    if (body.item_type && !['service', 'part'].includes(body.item_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'item_type debe ser "service" o "part"',
        },
        { status: 400 }
      );
    }

    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity <= 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'quantity debe ser un número mayor a 0',
        },
        { status: 400 }
      );
    }

    if (body.unit_price !== undefined && (typeof body.unit_price !== 'number' || body.unit_price < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'unit_price debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    // Actualizar item
    const updatedItem = await updateQuotationItem(params.itemId, body);

    // Recalcular totales de la cotización
    await recalculateQuotationTotals(params.id);

    logger.businessEvent('quotation_item_updated', 'quotation_item', params.itemId, context);
    logger.info(`Item actualizado exitosamente: ${params.itemId}`, context);

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    logger.error('Error al actualizar item de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar item de cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Eliminar item específico
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-items-api',
    'DELETE',
    { quotationId: params.id, itemId: params.itemId }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando item específico de cotización', context);

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Intento de eliminar item de cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser editada
    if (quotation.status === 'converted') {
      logger.warn('Intento de eliminar item de cotización convertida', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar items de una cotización que ya ha sido convertida',
        },
        { status: 400 }
      );
    }

    // Verificar que el item existe
    const items = await getQuotationItems(params.id);
    const item = items.find(i => i.id === params.itemId);

    if (!item) {
      logger.warn('Item no encontrado para eliminar', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Item no encontrado',
        },
        { status: 404 }
      );
    }

    // Eliminar item
    await deleteQuotationItem(params.itemId);

    // Recalcular totales de la cotización
    await recalculateQuotationTotals(params.id);

    logger.businessEvent('quotation_item_deleted', 'quotation_item', params.itemId, context);
    logger.info(`Item eliminado exitosamente: ${params.itemId}`, context);

    return NextResponse.json({
      success: true,
      message: 'Item eliminado correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar item de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar item de cotización',
      },
      { status: 500 }
    );
  }
}