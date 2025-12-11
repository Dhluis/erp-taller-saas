/**
 * API Route para Notas de Venta
 * Maneja operaciones GET, POST para la colección de notas de venta
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllInvoices,
  createInvoice,
  createInvoiceFromWorkOrder,
  createInvoiceFromQuotation,
  searchInvoices,
  getInvoiceStats,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// =====================================================
// GET - Obtener todas las notas de venta
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
      'invoices-api',
      'GET'
    );
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const stats = searchParams.get('stats') === 'true';

    logger.info('Obteniendo notas de venta', context, { status, search, stats });

    let result;

    if (stats) {
      // Obtener estadísticas
      result = await getInvoiceStats(organizationId);
      logger.info('Estadísticas de notas de venta obtenidas', context);
    } else if (search) {
      // Buscar notas de venta
      result = await searchInvoices(organizationId, search);
      logger.info(`Resultados de búsqueda: ${result.length} notas de venta`, context);
    } else {
      // Obtener todas las notas de venta
      result = await getAllInvoices(organizationId, status || undefined);
      logger.info(`Notas de venta obtenidas: ${result.length}`, context);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error al obtener notas de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener notas de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Crear nueva nota de venta
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
      'invoices-api',
      'POST'
    );
    
    const body = await request.json();
    const { source, ...data } = body;

    logger.info('Creando nueva nota de venta', context, { source, invoiceData: data });

    let result;

    switch (source) {
      case 'work_order':
        // Crear desde orden de trabajo
        if (!data.work_order_id) {
          return NextResponse.json(
            {
              success: false,
              error: 'work_order_id es requerido para crear desde orden de trabajo',
            },
            { status: 400 }
          );
        }
        result = await createInvoiceFromWorkOrder(organizationId, data.work_order_id);
        logger.businessEvent('invoice_created_from_work_order', 'invoice', result.id, context);
        break;

      case 'quotation':
        // Crear desde cotización
        if (!data.quotation_id) {
          return NextResponse.json(
            {
              success: false,
              error: 'quotation_id es requerido para crear desde cotización',
            },
            { status: 400 }
          );
        }
        result = await createInvoiceFromQuotation(organizationId, data.quotation_id);
        logger.businessEvent('invoice_created_from_quotation', 'invoice', result.id, context);
        break;

      case 'manual':
      default:
        // Crear manualmente
        const requiredFields = ['customer_id', 'vehicle_id', 'description'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
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
        if (typeof data.customer_id !== 'string' || typeof data.vehicle_id !== 'string') {
          return NextResponse.json(
            {
              success: false,
              error: 'customer_id y vehicle_id deben ser strings válidos',
            },
            { status: 400 }
          );
        }

        result = await createInvoice(organizationId, data);
        logger.businessEvent('invoice_created', 'invoice', result.id, context);
        break;
    }

    logger.info(`Nota de venta creada exitosamente: ${result.id}`, context);

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear nota de venta', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear nota de venta',
      },
      { status: 500 }
    );
  }
}