/**
 * Migración de API Routes para Descuento de Nota de Venta
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateInvoiceDiscount,
  getInvoiceById,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para PUT que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function updateInvoiceDiscountWithLogging(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-discount-migration',
    'PUT',
    { invoiceId: params.id }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando descuento de nota de venta (migración)', context, { discountData: body });

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

    // Verificar que la nota de venta puede ser editada
    if (invoice.status === 'paid' && invoice.paid_amount > 0) {
      logger.warn('Intento de actualizar descuento de nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede editar el descuento de una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    // Mantener las mismas validaciones que tu código original
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

    const discount = parseFloat(body.discount);

    if (discount < 0) {
      logger.warn('Intento de establecer descuento negativo', context, { discount });
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento no puede ser negativo',
        },
        { status: 400 }
      );
    }

    // Validaciones adicionales del sistema centralizado
    if (isNaN(discount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento debe ser un número válido',
        },
        { status: 400 }
      );
    }

    // Verificar que el descuento no exceda el total de la nota de venta
    if (discount > invoice.total_amount) {
      logger.warn('Intento de establecer descuento mayor al total', context, { 
        discount, 
        totalAmount: invoice.total_amount 
      });
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento no puede ser mayor al total de la nota de venta',
        },
        { status: 400 }
      );
    }

    // Usar la función original pero con logging
    const updatedInvoice = await updateInvoiceDiscount(params.id, discount);

    // Recálculo automático de totales
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_discount_updated', 'invoice', params.id, context);
    logger.info(`Descuento actualizado exitosamente para nota de venta ${params.id}: ${discount}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json({
      success: true,
      data: updatedInvoice,
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

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const invoiceDiscountMigrationHelpers = {
  updateInvoiceDiscountWithLogging,
};


















