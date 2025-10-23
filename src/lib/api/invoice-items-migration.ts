/**
 * Migración de API Routes para Items de Notas de Venta
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceItems,
  createInvoiceItem,
  getInvoiceById,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para GET que mantiene compatibilidad con tu código original
 * pero agrega logging y validaciones del sistema centralizado
 */
export async function getInvoiceItemsWithLogging(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-items-migration',
    'GET',
    { invoiceId: params.id }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo items de nota de venta (migración)', context);

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

    // Usar la función original pero con logging
    const items = await getInvoiceItems(params.id);
    logger.info(`Items obtenidos para nota de venta ${params.id}: ${items.length} items`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    logger.error('Error al obtener items de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener items',
      },
      { status: 500 }
    );
  }
}

/**
 * Wrapper para POST que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function createInvoiceItemWithLogging(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-items-migration',
    'POST',
    { invoiceId: params.id }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando item de nota de venta (migración)', context, { itemData: body });

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

    // Mantener las mismas validaciones que tu código original
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

    // Validaciones adicionales del sistema centralizado
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

    // Mantener la misma estructura de datos que tu código original
    const itemData = {
      invoice_id: params.id,
      ...body,
    };

    // Usar la función original pero con logging
    const item = await createInvoiceItem(itemData);

    // Recálculo automático de totales
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_item_created', 'invoice_item', item.id, context);
    logger.info(`Item creado exitosamente para nota de venta ${params.id}: ${item.id}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear item de nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear item',
      },
      { status: 500 }
    );
  }
}

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const invoiceItemsMigrationHelpers = {
  getInvoiceItemsWithLogging,
  createInvoiceItemWithLogging,
};















