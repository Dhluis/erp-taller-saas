/**
 * API Route para Conversión de Orden de Trabajo a Cotización
 * Maneja la conversión de órdenes de trabajo a cotizaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createQuotationFromWorkOrder,
  getWorkOrderById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// POST - Convertir orden de trabajo a cotización
// =====================================================
export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'conversions-work-order-to-quotation',
    'POST',
    {}
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Iniciando conversión de orden de trabajo a cotización', context, { 
      workOrderId: body.work_order_id
    });

    // Validar campos requeridos
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
      logger.warn('Intento de convertir orden de trabajo inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la orden de trabajo puede ser convertida
    if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
      logger.warn('Intento de convertir orden de trabajo completada o cancelada', context, {
        currentStatus: workOrder.status
      });
      return NextResponse.json(
        {
          success: false,
          error: `No se puede convertir una orden de trabajo con estado '${workOrder.status}'`,
        },
        { status: 400 }
      );
    }

    // Verificar que la orden de trabajo tiene items
    if (!workOrder.items || workOrder.items.length === 0) {
      logger.warn('Intento de convertir orden de trabajo sin items', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede convertir una orden de trabajo sin items',
        },
        { status: 400 }
      );
    }

    // Crear cotización desde la orden de trabajo
    const quotation = await createQuotationFromWorkOrder(body.work_order_id);

    logger.businessEvent('quotation_created_from_workorder', 'quotation', quotation.id, context);
    logger.info(`Cotización creada exitosamente desde orden de trabajo: ${quotation.id}`, context);

    return NextResponse.json({
      success: true,
      data: {
        workOrder: {
          id: workOrder.id,
          work_order_number: workOrder.work_order_number,
          status: workOrder.status,
        },
        quotation: {
          id: quotation.id,
          quotation_number: quotation.quotation_number,
          status: quotation.status,
          total_amount: quotation.total_amount,
        },
      },
      message: 'Cotización creada exitosamente desde orden de trabajo',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al convertir orden de trabajo a cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir orden de trabajo',
      },
      { status: 500 }
    );
  }
}











