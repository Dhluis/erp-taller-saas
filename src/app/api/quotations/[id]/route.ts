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
// ⚠️ Hook eliminado - no se puede usar en server-side
// import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';
function getOrganizationId(): string { return '00000000-0000-0000-0000-000000000001'; }
function validateOrganization(organizationId: string): void { if (!organizationId) throw new Error('Organization ID required'); }

// =====================================================
// GET - Obtener cotización por ID
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'GET',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo cotización por ID', context);

    const quotation = await getQuotationById(params.id);

    if (!quotation) {
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
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'PUT',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
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

    const quotation = await updateQuotation(params.id, body);

    // Si se actualizaron items, recalcular totales
    if (body.items || body.subtotal || body.tax || body.discount) {
      await recalculateQuotationTotals(params.id);
      logger.info('Totales recalculados después de actualización', context);
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
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'DELETE',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando cotización', context);

    // Verificar que la cotización existe antes de eliminar
    const existingQuotation = await getQuotationById(params.id);
    if (!existingQuotation) {
      logger.warn('Intento de eliminar cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
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

    await deleteQuotation(params.id);

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
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'PATCH',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
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
        await recalculateQuotationTotals(params.id);
        logger.businessEvent('quotation_discount_updated', 'quotation', params.id, context);
        break;

      case 'recalculate_totals':
        await recalculateQuotationTotals(params.id);
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