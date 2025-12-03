/**
 * API Route para Item Específico de Nota de Venta
 * Maneja operaciones GET, PUT, DELETE para un item específico
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceItems,
  updateInvoiceItem,
  deleteInvoiceItem,
  getInvoiceById,
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
    'invoices-items-api',
    'GET',
    { invoiceId: params.id, itemId: params.itemId }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo item específico de nota de venta', context);

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de obtener item de nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    // Obtener todos los items y buscar el específico
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

    logger.info(`Item obtenido exitosamente: ${item.id}`, context);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    logger.error('Error al obtener item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener item de nota de venta',
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
    'invoices-items-api',
    'PUT',
    { invoiceId: params.id, itemId: params.itemId }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando item específico de nota de venta', context, { updateData: body });

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
    const updatedItem = await updateInvoiceItem(params.itemId, body);

    // Recalcular totales de la nota de venta
    await recalculateInvoiceTotals(params.id);

    logger.businessEvent('invoice_item_updated', 'invoice_item', params.itemId, context);
    logger.info(`Item actualizado exitosamente: ${params.itemId}`, context);

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    logger.error('Error al actualizar item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar item de nota de venta',
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
    'invoices-items-api',
    'DELETE',
    { invoiceId: params.id, itemId: params.itemId }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando item específico de nota de venta', context);

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

    // Eliminar item
    await deleteInvoiceItem(params.itemId);

    // Recalcular totales de la nota de venta
    await recalculateInvoiceTotals(params.id);

    logger.businessEvent('invoice_item_deleted', 'invoice_item', params.itemId, context);
    logger.info(`Item eliminado exitosamente: ${params.itemId}`, context);

    return NextResponse.json({
      success: true,
      message: 'Item eliminado correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar item de nota de venta',
      },
      { status: 500 }
    );
  }
}