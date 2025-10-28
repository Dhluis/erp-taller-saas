/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - PAGOS
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import { getAllPayments, createPayment } from '@/lib/database/queries/billing';

export async function GET(request: NextRequest) {
  try {
    const payments = await getAllPayments();

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener pagos',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = ['invoice_id', 'amount', 'payment_method', 'payment_date'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const validMethods = ['cash', 'card', 'transfer', 'check', 'other'];
    if (!validMethods.includes(body.payment_method)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Método de pago inválido. Debe ser: ' + validMethods.join(', '),
        },
        { status: 400 }
      );
    }

    const payment = await createPayment(body);

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear pago:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear pago',
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
  getPaymentsWithLogging,
  createPaymentWithLogging,
} from '@/lib/api/payments-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function GET(request: NextRequest) {
  // Una sola línea que reemplaza todo tu código original
  return getPaymentsWithLogging(request);
}

export async function POST(request: NextRequest) {
  // Una sola línea que reemplaza todo tu código original
  return createPaymentWithLogging(request);
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  getPaymentsWithLogging,
  createPaymentWithLogging,
} from '@/lib/api/payments-migration';

export async function GET(request: NextRequest) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await getPaymentsWithLogging(request);
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

export async function POST(request: NextRequest) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await createPaymentWithLogging(request);
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
  getAllPayments,
  createPayment,
  getInvoiceById,
  updateInvoice,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function GET(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'payments', 'GET', {});

  try {
    // Agregar validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo todos los pagos', context);

    // Usar tu función original
    const payments = await getAllPayments();
    logger.info(`Pagos obtenidos: ${payments.length} registros`, context);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Error al obtener pagos', context, error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener pagos',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'payments', 'POST', {});

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Creando pago', context, { paymentData: body });

    // Verificar que la nota de venta existe
    if (body.invoice_id) {
      const invoice = await getInvoiceById(body.invoice_id);
      if (!invoice) {
        logger.warn('Intento de crear pago para nota de venta inexistente', context);
        return NextResponse.json(
          {
            success: false,
            error: 'Nota de venta no encontrada',
          },
          { status: 404 }
        );
      }

      // Verificar que el pago no exceda el monto pendiente
      const pendingAmount = invoice.total_amount - invoice.paid_amount;
      if (body.amount > pendingAmount) {
        logger.warn('Intento de crear pago mayor al monto pendiente', context, {
          paymentAmount: body.amount,
          pendingAmount,
        });
        return NextResponse.json(
          {
            success: false,
            error: `El monto del pago (${body.amount}) no puede ser mayor al monto pendiente (${pendingAmount})`,
          },
          { status: 400 }
        );
      }
    }

    // Mantener tus validaciones originales
    const requiredFields = ['invoice_id', 'amount', 'payment_method', 'payment_date'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes', context, { missingFields });
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const validMethods = ['cash', 'card', 'transfer', 'check', 'other'];
    if (!validMethods.includes(body.payment_method)) {
      logger.warn('Método de pago inválido', context, { paymentMethod: body.payment_method });
      return NextResponse.json(
        {
          success: false,
          error: 'Método de pago inválido. Debe ser: ' + validMethods.join(', '),
        },
        { status: 400 }
      );
    }

    // Agregar validaciones adicionales
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'amount debe ser un número mayor a 0',
        },
        { status: 400 }
      );
    }

    if (typeof body.payment_date !== 'string' || !body.payment_date) {
      return NextResponse.json(
        {
          success: false,
          error: 'payment_date debe ser una fecha válida',
        },
        { status: 400 }
      );
    }

    // Validar fecha
    const paymentDate = new Date(body.payment_date);
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'payment_date debe ser una fecha válida',
        },
        { status: 400 }
      );
    }

    // Usar tu función original
    const payment = await createPayment(body);

    // Agregar actualización automática de montos pagados
    if (body.invoice_id) {
      const invoice = await getInvoiceById(body.invoice_id);
      if (invoice) {
        const newPaidAmount = invoice.paid_amount + body.amount;
        await updateInvoice(body.invoice_id, { paid_amount: newPaidAmount });
        
        // Recalcular totales
        await recalculateInvoiceTotals(body.invoice_id);
        
        logger.info(`Monto pagado actualizado para nota de venta ${body.invoice_id}: ${newPaidAmount}`, context);
      }
    }

    // Logging de evento de negocio
    logger.businessEvent('payment_created', 'payment', payment.id, context);
    logger.info(`Pago creado exitosamente: ${payment.id}`, context);

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear pago', context, error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear pago',
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
 *    - Agregar logging y actualización automática de montos
 * 
 * BENEFICIOS DE CUALQUIER OPCIÓN:
 * ✅ Misma funcionalidad que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Actualización automática de montos pagados
 * ✅ Recálculo automático de totales
 * ✅ Compatibilidad total con el frontend
 */
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)

