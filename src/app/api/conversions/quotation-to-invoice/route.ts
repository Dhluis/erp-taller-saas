/**
 * API Route para Conversión de Cotización a Nota de Venta
 * Maneja la conversión de cotizaciones a notas de venta
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createInvoiceFromQuotation,
  getQuotationById,
  updateQuotationStatus,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// POST - Convertir cotización a nota de venta
// =====================================================
export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'conversions-quotation-to-invoice',
    'POST',
    {}
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Iniciando conversión de cotización a nota de venta', context, { 
      quotationId: body.quotation_id
    });

    // Validar campos requeridos
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
      logger.warn('Intento de convertir cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Validar que la cotización puede ser convertida
    if (quotation.status !== 'approved') {
      logger.warn('Intento de convertir cotización no aprobada', context, {
        currentStatus: quotation.status
      });
      return NextResponse.json(
        {
          success: false,
          error: `No se puede convertir una cotización con estado '${quotation.status}'. Debe estar aprobada.`,
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización no esté vencida
    if (quotation.expires_at && new Date(quotation.expires_at) < new Date()) {
      logger.warn('Intento de convertir cotización vencida', context, {
        validUntil: quotation.expires_at
      });
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede convertir una cotización vencida',
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización tenga items
    if (!quotation.items || quotation.items.length === 0) {
      logger.warn('Intento de convertir cotización sin items', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede convertir una cotización sin items',
        },
        { status: 400 }
      );
    }

    // Crear nota de venta desde la cotización
    const invoice = await createInvoiceFromQuotation(body.quotation_id);

    // Marcar cotización como convertida
    await updateQuotationStatus(body.quotation_id, 'converted');

    logger.businessEvent('quotation_converted_to_invoice', 'quotation', body.quotation_id, context);
    logger.businessEvent('invoice_created_from_quotation', 'invoice', invoice.id, context);
    logger.info(`Nota de venta creada exitosamente desde cotización: ${invoice.id}`, context);

    return NextResponse.json({
      success: true,
      data: {
        quotation: {
          id: quotation.id,
          quotation_number: quotation.quotation_number,
          status: 'converted',
        },
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          total_amount: invoice.total_amount,
        },
      },
      message: 'Nota de venta creada exitosamente desde cotización',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al convertir cotización a nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir cotización',
      },
      { status: 500 }
    );
  }
}











