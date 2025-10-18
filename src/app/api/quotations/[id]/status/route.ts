/**
 * API Route para Actualizar Estado de Cotización
 * Endpoint específico para manejar cambios de estado de cotizaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateQuotationStatus,
  getQuotationById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// PUT - Actualizar estado de cotización
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-status-api',
    'PUT',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Actualizando estado de cotización', context, { newStatus: body.status });

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

    if (!body.status) {
      logger.warn('Intento de actualizar estado sin especificar status', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El campo status es requerido',
        },
        { status: 400 }
      );
    }

    // Validar estados permitidos
    const validStatuses = ['pending', 'approved', 'rejected', 'converted', 'expired'];
    if (!validStatuses.includes(body.status)) {
      logger.warn('Intento de actualizar a estado inválido', context, { 
        providedStatus: body.status,
        validStatuses 
      });
      return NextResponse.json(
        {
          success: false,
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización existe
    const existingQuotation = await getQuotationById(params.id);
    if (!existingQuotation) {
      logger.warn('Intento de actualizar estado de cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Validar transiciones de estado
    const currentStatus = existingQuotation.status;
    const newStatus = body.status;

    // Reglas de transición de estado
    const validTransitions: Record<string, string[]> = {
      'pending': ['approved', 'rejected', 'expired'],
      'approved': ['converted', 'rejected'],
      'rejected': ['pending'],
      'converted': [], // No se puede cambiar una vez convertida
      'expired': ['pending'], // Se puede reactivar
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      logger.warn('Transición de estado inválida', context, {
        currentStatus,
        newStatus,
        validTransitions: validTransitions[currentStatus]
      });
      return NextResponse.json(
        {
          success: false,
          error: `No se puede cambiar de estado '${currentStatus}' a '${newStatus}'. Transiciones válidas: ${validTransitions[currentStatus]?.join(', ') || 'ninguna'}`,
        },
        { status: 400 }
      );
    }

    // Actualizar estado
    const quotation = await updateQuotationStatus(params.id, newStatus);

    // Logging específico por tipo de cambio
    switch (newStatus) {
      case 'approved':
        logger.businessEvent('quotation_approved', 'quotation', params.id, context);
        logger.info('Cotización aprobada exitosamente', context);
        break;
      case 'rejected':
        logger.businessEvent('quotation_rejected', 'quotation', params.id, context);
        logger.info('Cotización rechazada', context);
        break;
      case 'converted':
        logger.businessEvent('quotation_converted', 'quotation', params.id, context);
        logger.info('Cotización convertida a nota de venta', context);
        break;
      case 'expired':
        logger.businessEvent('quotation_expired', 'quotation', params.id, context);
        logger.info('Cotización marcada como vencida', context);
        break;
      case 'pending':
        logger.businessEvent('quotation_reactivated', 'quotation', params.id, context);
        logger.info('Cotización reactivada', context);
        break;
    }

    return NextResponse.json({
      success: true,
      data: quotation,
      message: `Estado actualizado a '${newStatus}' exitosamente`,
    });
  } catch (error) {
    logger.error('Error al actualizar estado de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar estado de cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// GET - Obtener estados válidos para transición
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-status-api',
    'GET',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Obteniendo estados válidos para cotización', context);

    // Obtener cotización actual
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Cotización no encontrada para obtener estados válidos', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Definir transiciones válidas
    const validTransitions: Record<string, string[]> = {
      'pending': ['approved', 'rejected', 'expired'],
      'approved': ['converted', 'rejected'],
      'rejected': ['pending'],
      'converted': [],
      'expired': ['pending'],
    };

    const currentStatus = quotation.status;
    const availableTransitions = validTransitions[currentStatus] || [];

    logger.info(`Estados válidos obtenidos para cotización ${params.id}`, context, {
      currentStatus,
      availableTransitions
    });

    return NextResponse.json({
      success: true,
      data: {
        current_status: currentStatus,
        available_transitions: availableTransitions,
        quotation_id: params.id,
        quotation_number: quotation.quotation_number,
      },
    });
  } catch (error) {
    logger.error('Error al obtener estados válidos', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener estados válidos',
      },
      { status: 500 }
    );
  }
}