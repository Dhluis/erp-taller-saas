/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - ITEM INDIVIDUAL DE NOTA DE VENTA
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import {
  updateInvoiceItem,
  deleteInvoiceItem,
} from '@/lib/database/queries/billing';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const body = await request.json();
    const item = await updateInvoiceItem(params.itemId, body);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar item',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await deleteInvoiceItem(params.itemId);

    return NextResponse.json({
      success: true,
      message: 'Item eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar item',
      },
      { status: 500 }
    );
  }
}
*/

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 1: MIGRACIÓN COMPLETA
// =====================================================
import {
  updateInvoiceItemWithLogging,
  deleteInvoiceItemWithLogging,
} from '@/lib/api/invoice-item-by-id-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return updateInvoiceItemWithLogging(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return deleteInvoiceItemWithLogging(request, { params });
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  updateInvoiceItemWithLogging,
  deleteInvoiceItemWithLogging,
} from '@/lib/api/invoice-item-by-id-migration';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await updateInvoiceItemWithLogging(request, { params });
    return response; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático en la función migrada
    console.error('Error en PUT migrado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await deleteInvoiceItemWithLogging(request, { params });
    return response; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático en la función migrada
    console.error('Error en DELETE migrado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
*/

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 3: MIGRACIÓN HÍBRIDA
// =====================================================
/*
import {
  updateInvoiceItem,
  deleteInvoiceItem,
  getInvoiceById,
  getInvoiceItems,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-item-by-id', 'PUT', { invoiceId: params.id, itemId: params.itemId });

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Actualizando item de nota de venta', context, { updateData: body });

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

    // Agregar validaciones adicionales
    if (body.item_type && !['service', 'part'].includes(body.item_type)) {
      return NextResponse.json(
        { success: false, error: 'item_type debe ser "service" o "part"' },
        { status: 400 }
      );
    }

    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity <= 0)) {
      return NextResponse.json(
        { success: false, error: 'quantity debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    if (body.unit_price !== undefined && (typeof body.unit_price !== 'number' || body.unit_price < 0)) {
      return NextResponse.json(
        { success: false, error: 'unit_price debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Usar tu función original
    const updatedItem = await updateInvoiceItem(params.itemId, body);

    // Agregar recálculo automático
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
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
        error: error instanceof Error ? error.message : 'Error al actualizar item',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-item-by-id', 'DELETE', { invoiceId: params.id, itemId: params.itemId });

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando item de nota de venta', context);

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

    // Usar tu función original
    await deleteInvoiceItem(params.itemId);

    // Agregar recálculo automático
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
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
        error: error instanceof Error ? error.message : 'Error al eliminar item',
      },
      { status: 500 }
    );
  }
}
*/

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. OPCIÓN 1 (Recomendada): Usar las funciones de migración
 *    - Cambiar importaciones
 *    - Reemplazar llamadas a funciones
 *    - Mantener estructura original
 * 
 * 2. OPCIÓN 2: Migración gradual
 *    - Mantener tu estructura
 *    - Usar funciones migradas
 *    - Agregar manejo de errores
 * 
 * 3. OPCIÓN 3: Migración híbrida
 *    - Mantener tu lógica
 *    - Agregar validaciones del sistema centralizado
 *    - Agregar logging y recálculo automático
 * 
 * BENEFICIOS DE CUALQUIER OPCIÓN:
 * ✅ Misma funcionalidad que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Recálculo automático de totales
 * ✅ Compatibilidad total con el frontend
 */
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)

