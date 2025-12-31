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
import { extractPaginationFromURL, calculateOffset, generatePaginationMeta } from '@/lib/utils/pagination';
import type { PaginatedResponse } from '@/types/pagination';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

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
    
    const url = new URL(request.url);
    const { searchParams } = url;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const stats = searchParams.get('stats') === 'true';

    logger.info('Obteniendo notas de venta', context, { status, search, stats });

    let result;

    if (stats) {
      // Obtener estadísticas (no necesita paginación)
      result = await getInvoiceStats(organizationId);
      logger.info('Estadísticas de notas de venta obtenidas', context);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    } else if (search) {
      // Buscar notas de venta (no necesita paginación)
      result = await searchInvoices(organizationId, search);
      logger.info(`Resultados de búsqueda: ${result.length} notas de venta`, context);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    } else {
      // ✅ Obtener todas las notas de venta CON PAGINACIÓN
      const { page, pageSize } = extractPaginationFromURL(url);
      const offset = calculateOffset(page, pageSize);

      logger.info('Obteniendo notas de venta con paginación', context, {
        page,
        pageSize,
        status: status || undefined
      });

      // Usar Service Client para consulta paginada
      const supabaseAdmin = getSupabaseServiceClient();
      
      // Construir query con relaciones (igual que getAllInvoices)
      let query = supabaseAdmin
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Aplicar filtro de status si se proporciona
      if (status) {
        query = query.eq('status', status);
      }

      // Aplicar paginación
      query = query.range(offset, offset + pageSize - 1);

      const { data: invoices, count, error: invoicesError } = await query;

      if (invoicesError) {
        logger.error('Error al obtener notas de venta', context, invoicesError as Error);
        return NextResponse.json(
          {
            success: false,
            error: invoicesError.message || 'Error al obtener notas de venta',
            data: { items: [], pagination: generatePaginationMeta(page, pageSize, 0) }
          },
          { status: 500 }
        );
      }

      // Generar metadata de paginación
      const pagination = generatePaginationMeta(page, pageSize, count || 0);

      logger.info(`Notas de venta obtenidas: ${invoices?.length || 0} de ${count || 0}`, context);

      // Retornar estructura PaginatedResponse
      const response: PaginatedResponse<any> = {
        success: true,
        data: {
          items: invoices || [],
          pagination
        }
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    logger.error('Error al obtener notas de venta', context, error as Error);
    
    // Intentar extraer paginación para respuesta de error consistente
    let page = 1;
    let pageSize = 20;
    try {
      const url = new URL(request.url);
      const paginationParams = extractPaginationFromURL(url);
      page = paginationParams.page;
      pageSize = paginationParams.pageSize;
    } catch {
      // Si falla, usar valores por defecto
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener notas de venta',
        data: { items: [], pagination: generatePaginationMeta(page, pageSize, 0) }
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