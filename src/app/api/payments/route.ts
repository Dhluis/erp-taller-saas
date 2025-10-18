/**
 * API Route para Pagos
 * Maneja operaciones GET, POST para la colección de pagos
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPayments,
  createPayment,
  searchPayments,
  getPaymentStats,
  validatePaymentAmount,
  getPaymentMethods,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// GET - Obtener todos los pagos
// =====================================================
export async function GET(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-api',
    'GET'
  );

  try {
    validateOrganization(organizationId);
    
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');
    const search = searchParams.get('search');
    const stats = searchParams.get('stats') === 'true';
    const methods = searchParams.get('methods') === 'true';

    logger.info('Obteniendo pagos', context, { invoiceId, search, stats, methods });

    let result;

    if (methods) {
      // Obtener métodos de pago disponibles
      result = await getPaymentMethods();
      logger.info('Métodos de pago obtenidos', context);
    } else if (stats) {
      // Obtener estadísticas
      result = await getPaymentStats();
      logger.info('Estadísticas de pagos obtenidas', context);
    } else if (search) {
      // Buscar pagos
      result = await searchPayments(search);
      logger.info(`Resultados de búsqueda: ${result.length} pagos`, context);
    } else {
      // Obtener todos los pagos
      result = await getAllPayments(invoiceId || undefined);
      logger.info(`Pagos obtenidos: ${result.length}`, context);
    }

    return NextResponse.json({
      success: true,
      data: result,
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

// =====================================================
// POST - Crear nuevo pago
// =====================================================
export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-api',
    'POST'
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando nuevo pago', context, { paymentData: body });

    // Validar datos requeridos
    const requiredFields = ['invoice_id', 'amount', 'payment_method', 'payment_date'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validar tipos de datos
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El monto debe ser un número mayor a 0',
        },
        { status: 400 }
      );
    }

    if (typeof body.invoice_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'invoice_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    // Validar método de pago
    const validMethods = ['cash', 'card', 'transfer', 'check', 'other'];
    if (!validMethods.includes(body.payment_method)) {
      return NextResponse.json(
        {
          success: false,
          error: `Método de pago inválido. Debe ser uno de: ${validMethods.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validar monto del pago
    try {
      await validatePaymentAmount(body.invoice_id, body.amount);
    } catch (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError instanceof Error ? validationError.message : 'Error de validación de pago',
        },
        { status: 400 }
      );
    }

    const payment = await createPayment(body);

    logger.businessEvent('payment_created', 'payment', payment.id, context);
    logger.info(`Pago creado exitosamente: ${payment.id}`, context);

    return NextResponse.json({
      success: true,
      data: payment,
    }, { status: 201 });
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

