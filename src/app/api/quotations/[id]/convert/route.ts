/**
 * API Route para Conversión de Cotizaciones
 * Maneja la conversión de cotizaciones a notas de venta
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotationById,
  updateQuotationStatus,
  createInvoiceFromQuotation,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
// ⚠️ Hook eliminado - no se puede usar en server-side
// import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';
function getOrganizationId(): string { return '00000000-0000-0000-0000-000000000001'; }
function validateOrganization(organizationId: string): void { if (!organizationId) throw new Error('Organization ID required'); }

// =====================================================
// POST - Convertir cotización a nota de venta
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-convert-api',
    'POST',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Iniciando conversión de cotización a nota de venta', context, { 
      quotationId: params.id,
      conversionData: body 
    });

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
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
    if (quotation.valid_until && new Date(quotation.valid_until) < new Date()) {
      logger.warn('Intento de convertir cotización vencida', context, {
        validUntil: quotation.valid_until
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
    const invoice = await createInvoiceFromQuotation(params.id);

    // Marcar cotización como convertida
    await updateQuotationStatus(params.id, 'converted');

    logger.businessEvent('quotation_converted_to_invoice', 'quotation', params.id, context);
    logger.businessEvent('invoice_created_from_quotation', 'invoice', invoice.id, context);
    logger.info(`Cotización convertida exitosamente a nota de venta: ${invoice.id}`, context);

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
      message: 'Cotización convertida exitosamente a nota de venta',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al convertir cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// GET - Verificar si la cotización puede ser convertida
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-convert-api',
    'GET',
    { quotationId: params.id }
  );

  try {
    validateOrganization(organizationId);
    logger.info('Verificando si cotización puede ser convertida', context);

    // Obtener cotización
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Cotización no encontrada para verificación de conversión', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar condiciones para conversión
    const checks = {
      exists: true,
      is_approved: quotation.status === 'approved',
      not_expired: !quotation.valid_until || new Date(quotation.valid_until) >= new Date(),
      has_items: quotation.items && quotation.items.length > 0,
      not_already_converted: quotation.status !== 'converted',
    };

    const canConvert = Object.values(checks).every(check => check === true);
    const issues = Object.entries(checks)
      .filter(([_, value]) => value === false)
      .map(([key, _]) => key);

    logger.info(`Verificación de conversión completada para cotización ${params.id}`, context, {
      canConvert,
      issues,
      quotationStatus: quotation.status
    });

    return NextResponse.json({
      success: true,
      data: {
        quotation_id: params.id,
        quotation_number: quotation.quotation_number,
        current_status: quotation.status,
        can_convert: canConvert,
        checks,
        issues,
        valid_until: quotation.valid_until,
        items_count: quotation.items?.length || 0,
      },
    });
  } catch (error) {
    logger.error('Error al verificar conversión de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al verificar conversión',
      },
      { status: 500 }
    );
  }
}