/**
 * Migración de API Routes para Crear Nota de Venta desde Cotización
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createInvoiceFromQuotation,
  getQuotationById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para POST que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function createInvoiceFromQuotationWithLogging(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoice-from-quotation-migration',
    'POST',
    {}
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando nota de venta desde cotización (migración)', context, { quotationId: body.quotation_id });

    // Mantener las mismas validaciones que tu código original
    if (!body.quotation_id) {
      logger.warn('Campo quotation_id requerido faltante', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El campo quotation_id es requerido',
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización existe
    const quotation = await getQuotationById(body.quotation_id);
    if (!quotation) {
      logger.warn('Intento de crear nota de venta desde cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser convertida a nota de venta
    if (quotation.status !== 'approved') {
      logger.warn('Intento de crear nota de venta desde cotización no aprobada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Solo se pueden crear notas de venta desde cotizaciones aprobadas',
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización no ha expirado
    if (quotation.expires_at && new Date(quotation.expires_at) < new Date()) {
      logger.warn('Intento de crear nota de venta desde cotización expirada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede crear nota de venta desde una cotización expirada',
        },
        { status: 400 }
      );
    }

    // Validaciones adicionales del sistema centralizado
    if (typeof body.quotation_id !== 'string' || !body.quotation_id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'quotation_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    // Usar la función original pero con logging
    const invoice = await createInvoiceFromQuotation(body.quotation_id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_created_from_quotation', 'invoice', invoice.id, context);
    logger.info(`Nota de venta creada desde cotización ${body.quotation_id}: ${invoice.id}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: true,
        data: invoice,
        message: 'Nota de venta creada desde cotización',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear nota de venta desde cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear nota de venta',
      },
      { status: 500 }
    );
  }
}

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const invoiceFromQuotationMigrationHelpers = {
  createInvoiceFromQuotationWithLogging,
};
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)


