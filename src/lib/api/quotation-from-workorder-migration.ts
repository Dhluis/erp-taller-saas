/**
 * Migración de API Routes para Crear Cotización desde Orden de Trabajo
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createQuotationFromWorkOrder,
  getWorkOrderById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para POST que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function createQuotationFromWorkOrderWithLogging(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotation-from-workorder-migration',
    'POST',
    {}
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando cotización desde orden de trabajo (migración)', context, { workOrderId: body.work_order_id });

    // Mantener las mismas validaciones que tu código original
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
      logger.warn('Intento de crear cotización desde orden de trabajo inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la orden de trabajo puede ser convertida a cotización
    if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
      logger.warn('Intento de crear cotización desde orden de trabajo completada o cancelada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede crear cotización desde una orden de trabajo completada o cancelada',
        },
        { status: 400 }
      );
    }

    // Validaciones adicionales del sistema centralizado
    if (typeof body.work_order_id !== 'string' || !body.work_order_id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'work_order_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    // Usar la función original pero con logging
    const quotation = await createQuotationFromWorkOrder(body.work_order_id);

    // Logging de evento de negocio
    logger.businessEvent('quotation_created_from_workorder', 'quotation', quotation.id, context);
    logger.info(`Cotización creada desde orden de trabajo ${body.work_order_id}: ${quotation.id}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: true,
        data: quotation,
        message: 'Cotización creada desde orden de trabajo',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear cotización desde orden de trabajo', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear cotización',
      },
      { status: 500 }
    );
  }
}

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const quotationFromWorkOrderMigrationHelpers = {
  createQuotationFromWorkOrderWithLogging,
};











