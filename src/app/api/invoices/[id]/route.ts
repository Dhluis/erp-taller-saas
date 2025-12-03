/**
 * API Route para Notas de Venta por ID
 * Maneja operaciones GET, PUT, DELETE para notas de venta específicas
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  updateInvoiceDiscount,
  updateInvoicePaidAmount,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
// ⚠️ Hook eliminado - no se puede usar en server-side
// import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// ✅ Helper temporal
function getOrganizationId(): string {
  return '00000000-0000-0000-0000-000000000001';
}
function validateOrganization(organizationId: string): void {
  if (!organizationId) throw new Error('Organization ID required');
}

// =====================================================
// GET - Obtener nota de venta por ID
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-api',
    'GET',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo nota de venta por ID', context);

    const invoice = await getInvoiceById(params.id);

    if (!invoice) {
      logger.warn('Nota de venta no encontrada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    logger.info(`Nota de venta obtenida exitosamente: ${invoice.id}`, context);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error al obtener nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar nota de venta
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-api',
    'PUT',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando nota de venta', context, { updateData: body });

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

    const invoice = await updateInvoice(params.id, body);

    // Si se actualizaron items, recalcular totales
    if (body.items || body.subtotal || body.tax || body.discount) {
      await recalculateInvoiceTotals(params.id);
      logger.info('Totales recalculados después de actualización', context);
    }

    logger.businessEvent('invoice_updated', 'invoice', params.id, context);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error al actualizar nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Eliminar nota de venta
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-api',
    'DELETE',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando nota de venta', context);

    // Verificar que la nota de venta existe antes de eliminar
    const existingInvoice = await getInvoiceById(params.id);
    if (!existingInvoice) {
      logger.warn('Intento de eliminar nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar si la nota de venta puede ser eliminada
    if (existingInvoice.status === 'paid' && existingInvoice.paid_amount > 0) {
      logger.warn('Intento de eliminar nota de venta con pagos', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar una nota de venta que tiene pagos registrados',
        },
        { status: 400 }
      );
    }

    await deleteInvoice(params.id);

    logger.businessEvent('invoice_deleted', 'invoice', params.id, context);
    logger.info('Nota de venta eliminada exitosamente', context);

    return NextResponse.json({
      success: true,
      message: 'Nota de venta eliminada correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar nota de venta',
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
    'invoices-api',
    'PATCH',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Procesando actualización específica de nota de venta', context, { action, data });

    let result;

    switch (action) {
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
        result = await updateInvoiceDiscount(params.id, data.discount);
        await recalculateInvoiceTotals(params.id);
        logger.businessEvent('invoice_discount_updated', 'invoice', params.id, context);
        break;

      case 'update_paid_amount':
        if (typeof data.paid_amount !== 'number') {
          return NextResponse.json(
            {
              success: false,
              error: 'Monto pagado debe ser un número válido',
            },
            { status: 400 }
          );
        }
        result = await updateInvoicePaidAmount(params.id, data.paid_amount);
        logger.businessEvent('invoice_payment_updated', 'invoice', params.id, context);
        break;

      case 'recalculate_totals':
        await recalculateInvoiceTotals(params.id);
        result = await getInvoiceById(params.id);
        logger.info('Totales de nota de venta recalculados', context);
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
    logger.error('Error en actualización específica de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en actualización específica',
      },
      { status: 500 }
    );
  }
}