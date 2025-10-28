/**
 * API Route para Descuento de Nota de Venta
 * Maneja la actualización del descuento de una nota de venta específica
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceById,
  updateInvoiceDiscount,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// PUT - Actualizar descuento de nota de venta
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-discount-api',
    'PUT',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando descuento de nota de venta', context, { 
      invoiceId: params.id,
      discount: body.discount
    });

    // Validar campos requeridos
    if (body.discount === undefined || body.discount === null) {
      logger.warn('Campo discount requerido faltante', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El campo discount es requerido',
        },
        { status: 400 }
      );
    }

    // Validar que el descuento sea un número válido
    const discount = parseFloat(body.discount);
    if (isNaN(discount)) {
      logger.warn('Descuento inválido proporcionado', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento debe ser un número válido',
        },
        { status: 400 }
      );
    }

    // Validar que el descuento no sea negativo
    if (discount < 0) {
      logger.warn('Intento de aplicar descuento negativo', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento no puede ser negativo',
        },
        { status: 400 }
      );
    }

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de actualizar descuento de nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la nota de venta puede ser modificada
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      logger.warn('Intento de modificar descuento de nota de venta pagada o cancelada', context, {
        currentStatus: invoice.status
      });
      return NextResponse.json(
        {
          success: false,
          error: `No se puede modificar el descuento de una nota de venta con estado '${invoice.status}'`,
        },
        { status: 400 }
      );
    }

    // Actualizar el descuento
    const updatedInvoice = await updateInvoiceDiscount(params.id, discount);

    logger.businessEvent('invoice_discount_updated', 'invoice', params.id, context);
    logger.info(`Descuento de nota de venta actualizado exitosamente: ${params.id}`, context);

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
      message: 'Descuento actualizado exitosamente',
    });
  } catch (error) {
    logger.error('Error al actualizar descuento de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar descuento',
      },
      { status: 500 }
    );
  }
}
















