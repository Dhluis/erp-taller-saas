/**
 * Migración de API Routes para Pagos
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPayments,
  createPayment,
  getInvoiceById,
  updateInvoice,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para GET que mantiene compatibilidad con tu código original
 * pero agrega logging y validaciones del sistema centralizado
 */
export async function getPaymentsWithLogging(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-migration',
    'GET',
    {}
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo todos los pagos (migración)', context);

    // Usar la función original pero con logging
    const payments = await getAllPayments();
    logger.info(`Pagos obtenidos: ${payments.length} registros`, context);

    // Mantener la misma respuesta que tu código original
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

/**
 * Wrapper para POST que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function createPaymentWithLogging(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-migration',
    'POST',
    {}
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando pago (migración)', context, { paymentData: body });

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

    // Mantener las mismas validaciones que tu código original
    const requiredFields = ['invoice_id', 'amount', 'payment_method', 'payment_date'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes para crear pago', context, { missingFields });
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

    // Validaciones adicionales del sistema centralizado
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

    // Usar la función original pero con logging
    const payment = await createPayment(body);

    // Actualizar el monto pagado de la nota de venta
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

    // Mantener la misma respuesta que tu código original
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

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const paymentsMigrationHelpers = {
  getPaymentsWithLogging,
  createPaymentWithLogging,
};














