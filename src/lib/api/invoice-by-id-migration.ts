/**
 * Migración de API Routes para Nota de Venta Individual
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para GET que mantiene compatibilidad con tu código original
 * pero agrega logging y validaciones del sistema centralizado
 */
export async function getInvoiceByIdWithLogging(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-by-id-migration',
    'GET',
    { invoiceId: params.id }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo nota de venta por ID (migración)', context);

    // Usar la función original pero con logging
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

    // Mantener la misma respuesta que tu código original
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

/**
 * Wrapper para PUT que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function updateInvoiceWithLogging(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-by-id-migration',
    'PUT',
    { invoiceId: params.id }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando nota de venta (migración)', context, { updateData: body });

    // Verificar que la nota de venta existe
    const existingInvoice = await getInvoiceById(params.id);
    if (!existingInvoice) {
      logger.warn('Intento de actualizar nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la nota de venta puede ser editada
    if (existingInvoice.status === 'paid' && existingInvoice.paid_amount > 0) {
      logger.warn('Intento de actualizar nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede editar una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    // Validaciones adicionales del sistema centralizado
    if (body.customer_id && typeof body.customer_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'customer_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    if (body.vehicle_id && typeof body.vehicle_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'vehicle_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    if (body.description && typeof body.description !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'description debe ser un string válido',
        },
        { status: 400 }
      );
    }

    if (body.total_amount !== undefined && (typeof body.total_amount !== 'number' || body.total_amount < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'total_amount debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    if (body.discount !== undefined && (typeof body.discount !== 'number' || body.discount < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'discount debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    if (body.paid_amount !== undefined && (typeof body.paid_amount !== 'number' || body.paid_amount < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'paid_amount debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    // Usar la función original pero con logging
    const invoice = await updateInvoice(params.id, body);

    // Recálculo automático de totales si se actualizaron campos relevantes
    if (body.total_amount !== undefined || body.discount !== undefined || body.paid_amount !== undefined) {
      await recalculateInvoiceTotals(params.id);
      logger.info('Totales recalculados después de actualización', context);
    }

    // Logging de evento de negocio
    logger.businessEvent('invoice_updated', 'invoice', params.id, context);
    logger.info(`Nota de venta actualizada exitosamente: ${params.id}`, context);

    // Mantener la misma respuesta que tu código original
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

/**
 * Wrapper para DELETE que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function deleteInvoiceWithLogging(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-by-id-migration',
    'DELETE',
    { invoiceId: params.id }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Eliminando nota de venta (migración)', context);

    // Verificar que la nota de venta existe
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

    // Verificar que la nota de venta puede ser eliminada
    if (existingInvoice.status === 'paid' && existingInvoice.paid_amount > 0) {
      logger.warn('Intento de eliminar nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    // Usar la función original pero con logging
    await deleteInvoice(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_deleted', 'invoice', params.id, context);
    logger.info(`Nota de venta eliminada exitosamente: ${params.id}`, context);

    // Mantener la misma respuesta que tu código original
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

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const invoiceByIdMigrationHelpers = {
  getInvoiceByIdWithLogging,
  updateInvoiceWithLogging,
  deleteInvoiceWithLogging,
};

