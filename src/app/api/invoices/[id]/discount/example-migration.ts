/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - DESCUENTO DE NOTA DE VENTA
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import { updateInvoiceDiscount } from '@/lib/database/queries/billing';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (body.discount === undefined || body.discount === null) {
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
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento no puede ser negativo',
        },
        { status: 400 }
      );
    }

    const invoice = await updateInvoiceDiscount(params.id, discount);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error al actualizar descuento:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar descuento',
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
  updateInvoiceDiscountWithLogging,
} from '@/lib/api/invoice-discount-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return updateInvoiceDiscountWithLogging(request, { params });
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  updateInvoiceDiscountWithLogging,
} from '@/lib/api/invoice-discount-migration';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await updateInvoiceDiscountWithLogging(request, { params });
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
*/

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 3: MIGRACIÓN HÍBRIDA
// =====================================================
/*
import {
  updateInvoiceDiscount,
  getInvoiceById,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-discount', 'PUT', { invoiceId: params.id });

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Actualizando descuento de nota de venta', context, { discountData: body });

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

    // Mantener tus validaciones originales
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

    // Agregar validaciones adicionales
    if (isNaN(discount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento debe ser un número válido',
        },
        { status: 400 }
      );
    }

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

    // Usar tu función original
    const updatedInvoice = await updateInvoiceDiscount(params.id, discount);

    // Agregar recálculo automático
    await recalculateInvoiceTotals(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_discount_updated', 'invoice', params.id, context);
    logger.info(`Descuento actualizado exitosamente: ${discount}`, context);

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

















