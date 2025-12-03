/**
 * API Route para Pagos por ID
 * Maneja operaciones GET, PUT, DELETE para pagos específicos
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentById,
  updatePayment,
  deletePayment,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
// ⚠️ Hook eliminado - no se puede usar en server-side
// import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';
function getOrganizationId(): string { return '00000000-0000-0000-0000-000000000001'; }
function validateOrganization(organizationId: string): void { if (!organizationId) throw new Error('Organization ID required'); }

// =====================================================
// GET - Obtener pago por ID
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-api',
    'GET',
    { paymentId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo pago por ID', context);

    const payment = await getPaymentById(params.id);

    if (!payment) {
      logger.warn('Pago no encontrado', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Pago no encontrado',
        },
        { status: 404 }
      );
    }

    logger.info(`Pago obtenido exitosamente: ${payment.id}`, context);

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Error al obtener pago', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener pago',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar pago
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-api',
    'PUT',
    { paymentId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando pago', context, { updateData: body });

    // Validar datos de entrada
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de actualización inválidos',
        },
        { status: 400 }
      );
    }

    // Validar monto si se está actualizando
    if (body.amount !== undefined) {
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'El monto debe ser un número mayor a 0',
          },
          { status: 400 }
        );
      }
    }

    // Validar método de pago si se está actualizando
    if (body.payment_method !== undefined) {
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
    }

    const payment = await updatePayment(params.id, body);

    logger.businessEvent('payment_updated', 'payment', params.id, context);

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Error al actualizar pago', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar pago',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Eliminar pago
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-api',
    'DELETE',
    { paymentId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Eliminando pago', context);

    // Verificar que el pago existe antes de eliminar
    const existingPayment = await getPaymentById(params.id);
    if (!existingPayment) {
      logger.warn('Intento de eliminar pago inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Pago no encontrado',
        },
        { status: 404 }
      );
    }

    await deletePayment(params.id);

    logger.businessEvent('payment_deleted', 'payment', params.id, context);
    logger.info('Pago eliminado exitosamente', context);

    return NextResponse.json({
      success: true,
      message: 'Pago eliminado correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar pago', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar pago',
      },
      { status: 500 }
    );
  }
}

