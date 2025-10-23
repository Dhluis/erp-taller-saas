/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - NOTA DE VENTA INDIVIDUAL
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
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} from '@/lib/database/queries/billing';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await getInvoiceById(params.id);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error al obtener nota de venta:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener nota de venta',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const invoice = await updateInvoice(params.id, body);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error al actualizar nota de venta:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar nota de venta',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteInvoice(params.id);

    return NextResponse.json({
      success: true,
      message: 'Nota de venta eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar nota de venta:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar nota de venta',
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
  getInvoiceByIdWithLogging,
  updateInvoiceWithLogging,
  deleteInvoiceWithLogging,
} from '@/lib/api/invoice-by-id-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return getInvoiceByIdWithLogging(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return updateInvoiceWithLogging(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return deleteInvoiceWithLogging(request, { params });
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  getInvoiceByIdWithLogging,
  updateInvoiceWithLogging,
  deleteInvoiceWithLogging,
} from '@/lib/api/invoice-by-id-migration';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await getInvoiceByIdWithLogging(request, { params });
    return response; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático en la función migrada
    console.error('Error en GET migrado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await updateInvoiceWithLogging(request, { params });
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
  { params }: { params: { id: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await deleteInvoiceWithLogging(request, { params });
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
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-by-id', 'GET', { invoiceId: params.id });

  try {
    // Agregar validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo nota de venta por ID', context);

    // Usar tu función original
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-by-id', 'PUT', { invoiceId: params.id });

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Actualizando nota de venta', context, { updateData: body });

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

    // Agregar validaciones adicionales
    if (body.customer_id && typeof body.customer_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'customer_id debe ser un string válido' },
        { status: 400 }
      );
    }

    if (body.vehicle_id && typeof body.vehicle_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'vehicle_id debe ser un string válido' },
        { status: 400 }
      );
    }

    if (body.description && typeof body.description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'description debe ser un string válido' },
        { status: 400 }
      );
    }

    if (body.total_amount !== undefined && (typeof body.total_amount !== 'number' || body.total_amount < 0)) {
      return NextResponse.json(
        { success: false, error: 'total_amount debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    if (body.discount !== undefined && (typeof body.discount !== 'number' || body.discount < 0)) {
      return NextResponse.json(
        { success: false, error: 'discount debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    if (body.paid_amount !== undefined && (typeof body.paid_amount !== 'number' || body.paid_amount < 0)) {
      return NextResponse.json(
        { success: false, error: 'paid_amount debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Usar tu función original
    const invoice = await updateInvoice(params.id, body);

    // Recálculo automático de totales si se actualizaron campos relevantes
    if (body.total_amount !== undefined || body.discount !== undefined || body.paid_amount !== undefined) {
      await recalculateInvoiceTotals(params.id);
      logger.info('Totales recalculados después de actualización', context);
    }

    // Logging de evento de negocio
    logger.businessEvent('invoice_updated', 'invoice', params.id, context);
    logger.info(`Nota de venta actualizada exitosamente: ${params.id}`, context);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-by-id', 'DELETE', { invoiceId: params.id });

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando nota de venta', context);

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

    // Usar tu función original
    await deleteInvoice(params.id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_deleted', 'invoice', params.id, context);
    logger.info(`Nota de venta eliminada exitosamente: ${params.id}`, context);

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















