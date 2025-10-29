/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - NOTA DE VENTA DESDE ORDEN DE TRABAJO
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import { createInvoiceFromWorkOrder } from '@/lib/database/queries/billing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.work_order_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo work_order_id es requerido',
        },
        { status: 400 }
      );
    }

    const invoice = await createInvoiceFromWorkOrder(body.work_order_id);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
        message: 'Nota de venta creada desde orden de trabajo',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear nota de venta:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear nota de venta',
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
  createInvoiceFromWorkOrderWithLogging,
} from '@/lib/api/invoice-from-workorder-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function POST(request: NextRequest) {
  // Una sola línea que reemplaza todo tu código original
  return createInvoiceFromWorkOrderWithLogging(request);
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  createInvoiceFromWorkOrderWithLogging,
} from '@/lib/api/invoice-from-workorder-migration';

export async function POST(request: NextRequest) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await createInvoiceFromWorkOrderWithLogging(request);
    return response; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático en la función migrada
    console.error('Error en POST migrado:', error);
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
  createInvoiceFromWorkOrder,
  getWorkOrderById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-from-workorder', 'POST', {});

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Creando nota de venta desde orden de trabajo', context, { workOrderId: body.work_order_id });

    // Mantener tus validaciones originales
    if (!body.work_order_id) {
      logger.warn('Campo work_order_id requerido faltante', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El campo work_order_id es requerido',
        },
        { status: 400 }
      );
    }

    // Verificar que la orden de trabajo existe
    const workOrder = await getWorkOrderById(body.work_order_id);
    if (!workOrder) {
      logger.warn('Intento de crear nota de venta desde orden de trabajo inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la orden de trabajo puede ser convertida a nota de venta
    if (workOrder.status === 'cancelled') {
      logger.warn('Intento de crear nota de venta desde orden de trabajo cancelada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede crear nota de venta desde una orden de trabajo cancelada',
        },
        { status: 400 }
      );
    }

    // Verificar que la orden de trabajo tiene items
    if (!workOrder.items || workOrder.items.length === 0) {
      logger.warn('Intento de crear nota de venta desde orden de trabajo sin items', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede crear nota de venta desde una orden de trabajo sin items',
        },
        { status: 400 }
      );
    }

    // Agregar validaciones adicionales
    if (typeof body.work_order_id !== 'string' || !body.work_order_id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'work_order_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    // Usar tu función original
    const invoice = await createInvoiceFromWorkOrder(body.work_order_id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_created_from_workorder', 'invoice', invoice.id, context);
    logger.info(`Nota de venta creada desde orden de trabajo ${body.work_order_id}: ${invoice.id}`, context);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
        message: 'Nota de venta creada desde orden de trabajo',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear nota de venta desde orden de trabajo', context, error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear nota de venta',
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
 *    - Agregar logging y verificación de existencia
 * 
 * BENEFICIOS DE CUALQUIER OPCIÓN:
 * ✅ Misma funcionalidad que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Verificación de existencia de orden de trabajo
 * ✅ Validación de estado de orden de trabajo
 * ✅ Verificación de items en orden de trabajo
 * ✅ Compatibilidad total con el frontend
 */
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)


