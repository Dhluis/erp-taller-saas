/**
 * API Route para Actualización Masiva de Estados de Cotizaciones
 * Maneja operaciones en lote para cambiar estados de múltiples cotizaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateQuotationStatus,
  getQuotationById,
  markExpiredQuotations,
  getExpiredQuotations,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// =====================================================
// PUT - Actualización masiva de estados
// =====================================================
export async function PUT(request: NextRequest) {
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
      'quotations-bulk-status-api',
      'PUT'
    );
    
    const body = await request.json();
    logger.info('Procesando actualización masiva de estados', context, { 
      quotationIds: body.quotation_ids?.length || 0,
      newStatus: body.status 
    });

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

    const { quotation_ids, status, action } = body;

    // Validar acción
    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo action es requerido',
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'update_status':
        // Actualización masiva de estado
        if (!quotation_ids || !Array.isArray(quotation_ids) || quotation_ids.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'quotation_ids debe ser un array no vacío',
            },
            { status: 400 }
          );
        }

        if (!status) {
          return NextResponse.json(
            {
              success: false,
              error: 'El campo status es requerido para actualización masiva',
            },
            { status: 400 }
          );
        }

        // Validar estado
        const validStatuses = ['pending', 'approved', 'rejected', 'converted', 'expired'];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            {
              success: false,
              error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`,
            },
            { status: 400 }
          );
        }

        result = await updateMultipleQuotationStatuses(quotation_ids, status, context);
        break;

      case 'mark_expired':
        // Marcar cotizaciones vencidas automáticamente
        result = await markExpiredQuotations(organizationId);
        logger.businessEvent('quotations_bulk_expired', 'quotation', 'batch', context);
        logger.info(`Cotizaciones marcadas como vencidas: ${result.length}`, context);
        break;

      case 'get_expired':
        // Obtener cotizaciones vencidas
        result = await getExpiredQuotations(organizationId);
        logger.info(`Cotizaciones vencidas encontradas: ${result.length}`, context);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Acción no válida: ${action}. Acciones válidas: update_status, mark_expired, get_expired`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Operación masiva completada: ${action}`,
    });
  } catch (error) {
    logger.error('Error en actualización masiva de estados', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en actualización masiva de estados',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// FUNCIÓN AUXILIAR: Actualizar múltiples cotizaciones
// =====================================================
async function updateMultipleQuotationStatuses(
  quotationIds: string[],
  newStatus: string,
  context: any
) {
  const results = {
    successful: [] as any[],
    failed: [] as any[],
    total: quotationIds.length,
  };

  logger.info(`Iniciando actualización masiva de ${quotationIds.length} cotizaciones`, context);

  for (const quotationId of quotationIds) {
    try {
      // Verificar que la cotización existe
      const quotation = await getQuotationById(quotationId);
      if (!quotation) {
        results.failed.push({
          quotation_id: quotationId,
          error: 'Cotización no encontrada',
        });
        continue;
      }

      // Validar transición de estado
      const currentStatus = quotation.status;
      const validTransitions: Record<string, string[]> = {
        'pending': ['approved', 'rejected', 'expired'],
        'approved': ['converted', 'rejected'],
        'rejected': ['pending'],
        'converted': [],
        'expired': ['pending'],
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        results.failed.push({
          quotation_id: quotationId,
          error: `Transición inválida de '${currentStatus}' a '${newStatus}'`,
        });
        continue;
      }

      // Actualizar estado
      const updatedQuotation = await updateQuotationStatus(quotationId, newStatus);
      results.successful.push(updatedQuotation);

      logger.info(`Cotización ${quotationId} actualizada exitosamente`, context);
    } catch (error) {
      logger.error(`Error al actualizar cotización ${quotationId}`, context, error as Error);
      results.failed.push({
        quotation_id: quotationId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  logger.businessEvent('quotations_bulk_status_updated', 'quotation', 'batch', context);
  logger.info(`Actualización masiva completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas`, context);

  return results;
}

