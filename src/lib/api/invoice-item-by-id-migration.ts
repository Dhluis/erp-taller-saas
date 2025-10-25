/**
 * Migración de API Routes para Item Individual de Nota de Venta
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateInvoiceItem,
  deleteInvoiceItem,
  getInvoiceById,
  getInvoiceItems,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para PUT que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function updateInvoiceItemWithLogging(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-item-by-id-migration',
    'PUT',
    { invoiceId: params.id, itemId: params.itemId }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando item de nota de venta (migración)', context, { updateData: body });

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de actualizar item de nota de venta inexistente', context);
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
      logger.warn('Intento de actualizar item de nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede editar items de una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    // Verificar que el item existe
    const items = await getInvoiceItems(params.id);
    const item = items.find(i => i.id === params.itemId);

    if (!item) {
      logger.warn('Item no encontrado en nota de venta', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Item no encontrado',
        },
        { status: 404 }
      );
    }

    // Validaciones adicionales del sistema centralizado
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

    // Usar la función original pero con logging
    const updatedItem = await updateInvoiceItem(params.itemId, body);

    // Recálculo automático de totales
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_item_updated', 'invoice_item', params.itemId, context);
    logger.info(`Item actualizado exitosamente: ${params.itemId}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    logger.error('Error al actualizar item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar item',
      },
      { status: 500 }
    );
  }
}

/**
 * Wrapper para DELETE que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function deleteInvoiceItemWithLogging(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-item-by-id-migration',
    'DELETE',
    { invoiceId: params.id, itemId: params.itemId }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Eliminando item de nota de venta (migración)', context);

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de eliminar item de nota de venta inexistente', context);
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
      logger.warn('Intento de eliminar item de nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar items de una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    // Verificar que el item existe
    const items = await getInvoiceItems(params.id);
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

    // Usar la función original pero con logging
    await deleteInvoiceItem(params.itemId);

    // Recálculo automático de totales
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_item_deleted', 'invoice_item', params.itemId, context);
    logger.info(`Item eliminado exitosamente: ${params.itemId}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json({
      success: true,
      message: 'Item eliminado correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar item',
      },
      { status: 500 }
    );
  }
}

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const invoiceItemByIdMigrationHelpers = {
  updateInvoiceItemWithLogging,
  deleteInvoiceItemWithLogging,
};


















