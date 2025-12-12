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
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { hasPermission, UserRole } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// GET - Obtener todos los pagos
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    const context = createLogContext(
      organizationId,
      undefined,
      'payments-api',
      'GET'
    );
    
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
      result = await getPaymentStats(organizationId);
      logger.info('Estadísticas de pagos obtenidas', context);
    } else if (search) {
      // Buscar pagos
      result = await searchPayments(organizationId, search);
      logger.info(`Resultados de búsqueda: ${result.length} pagos`, context);
    } else {
      // Obtener todos los pagos
      result = await getAllPayments(organizationId, invoiceId || undefined);
      logger.info(`Pagos obtenidos: ${result.length}`, context);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error al obtener pagos', undefined, error as Error);
    
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
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    const context = createLogContext(
      organizationId,
      undefined,
      'payments-api',
      'POST'
    );
    
    // ✅ VALIDACIÓN: Obtener rol del usuario actual
    const supabase = await createClient();
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', tenantContext.userId)
      .single();
    
    if (userError || !currentUser || !currentUser.role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado',
        },
        { status: 404 }
      );
    }
    
    // ✅ VALIDACIÓN: Solo admin puede crear pagos
    const currentUserRole = currentUser.role as UserRole;
    if (!hasPermission(currentUserRole, 'payments', 'create')) {
      logger.warn('Intento de crear pago sin permisos', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permisos para crear pagos. Solo administradores pueden hacerlo.',
        },
        { status: 403 }
      );
    }
    
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

    const payment = await createPayment(organizationId, body);

    logger.businessEvent('payment_created', 'payment', payment.id, context);
    logger.info(`Pago creado exitosamente: ${payment.id}`, context);

    return NextResponse.json({
      success: true,
      data: payment,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear pago', undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear pago',
      },
      { status: 500 }
    );
  }
}

