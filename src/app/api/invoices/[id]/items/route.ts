/**
 * API Route para Items de Notas de Venta
 * Maneja operaciones GET, POST para items de una nota de venta específica
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceItems,
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  getInvoiceById,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// GET - Obtener items de nota de venta
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-items-api',
    'GET',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo items de nota de venta', context);

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de obtener items de nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    const items = await getInvoiceItems(params.id);

    logger.info(`Items obtenidos para nota de venta ${params.id}: ${items.length} items`, context);

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    logger.error('Error al obtener items de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener items de nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Crear item de nota de venta
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-items-api',
    'POST',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando item de nota de venta', context, { itemData: body });

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de crear item en nota de venta inexistente', context);
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
      logger.warn('Intento de agregar item a nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede agregar items a una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    // Validar datos requeridos
    const requiredFields = ['item_type', 'item_name', 'quantity', 'unit_price'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes para crear item', context, { missingFields });
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validar tipos de datos
    if (!['service', 'part'].includes(body.item_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'item_type debe ser "service" o "part"',
        },
        { status: 400 }
      );
    }

    if (typeof body.quantity !== 'number' || body.quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'quantity debe ser un número mayor a 0',
        },
        { status: 400 }
      );
    }

    if (typeof body.unit_price !== 'number' || body.unit_price < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'unit_price debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    // Crear item
    const itemData = {
      invoice_id: params.id,
      item_type: body.item_type,
      item_name: body.item_name,
      description: body.description || null,
      quantity: body.quantity,
      unit_price: body.unit_price,
    };

    const item = await createInvoiceItem(itemData);

    // Recalcular totales de la nota de venta
    await recalculateInvoiceTotals(params.id);

    logger.businessEvent('invoice_item_created', 'invoice_item', item.id, context);
    logger.info(`Item creado exitosamente para nota de venta ${params.id}: ${item.id}`, context);

    return NextResponse.json({
      success: true,
      data: item,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear item de nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar múltiples items (operación en lote)
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-items-api',
    'PUT',
    { invoiceId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando items de nota de venta en lote', context, { 
      itemsCount: body.items?.length || 0 
    });

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      logger.warn('Intento de actualizar items de nota de venta inexistente', context);
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
      logger.warn('Intento de actualizar items de nota de venta pagada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede editar items de una nota de venta que ya ha sido pagada',
        },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        {
          success: false,
          error: 'items debe ser un array',
        },
        { status: 400 }
      );
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: body.items.length,
    };

    // Procesar cada item
    for (const itemData of body.items) {
      try {
        const { id, ...updateData } = itemData;
        
        if (!id) {
          results.failed.push({
            item: itemData,
            error: 'ID de item requerido para actualización',
          });
          continue;
        }

        const updatedItem = await updateInvoiceItem(id, updateData);
        results.successful.push(updatedItem);

        logger.info(`Item ${id} actualizado exitosamente`, context);
      } catch (error) {
        logger.error(`Error al actualizar item ${itemData.id}`, context, error as Error);
        results.failed.push({
          item: itemData,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Recalcular totales si hubo actualizaciones exitosas
    if (results.successful.length > 0) {
      await recalculateInvoiceTotals(params.id);
      logger.info('Totales recalculados después de actualización en lote', context);
    }

    logger.businessEvent('invoice_items_bulk_updated', 'invoice_item', 'batch', context);
    logger.info(`Actualización en lote completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas`, context);

    return NextResponse.json({
      success: true,
      data: results,
      message: `Actualización en lote completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas`,
    });
  } catch (error) {
    logger.error('Error en actualización en lote de items', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en actualización en lote de items',
      },
      { status: 500 }
    );
  }
}