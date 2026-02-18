/**
 * API Route para Notas de Venta
 * Maneja operaciones GET, POST para la colección de notas de venta
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createInvoice,
  createInvoiceFromWorkOrder,
  createInvoiceFromQuotation,
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
    const status = searchParams.get('status') as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | null;
    const search = searchParams.get('search');
    const stats = searchParams.get('stats') === 'true';

    logger.info('Obteniendo notas de venta', context, { status, search, stats });

    if (stats) {
      const result = await getInvoiceStats(organizationId);
      logger.info('Estadísticas de notas de venta obtenidas', context);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    {
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

      // Aplicar filtro de status (pending = draft + sent)
      if (status) {
        if (status === 'pending') {
          query = query.in('status', ['draft', 'sent']);
        } else {
          query = query.eq('status', status);
        }
      }

      // Búsqueda en invoice_number y notes
      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(`invoice_number.ilike.%${term}%,notes.ilike.%${term}%`);
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
    logger.error('Error al obtener notas de venta', undefined, error as Error);

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
  let context: ReturnType<typeof createLogContext> | null = null;
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
    context = createLogContext(
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
      default: {
        // Crear manualmente con ítems (modal "Factura manual")
        if (data.invoice_items && Array.isArray(data.invoice_items) && data.invoice_items.length > 0) {
          if (!data.customer_id || typeof data.customer_id !== 'string') {
            return NextResponse.json(
              { success: false, error: 'customer_id es requerido' },
              { status: 400 }
            );
          }
          const supabaseAdmin = getSupabaseServiceClient();
          const validItems = data.invoice_items.filter(
            (it: any) => it.description != null && it.quantity > 0 && it.unit_price >= 0
          );
          if (validItems.length === 0) {
            return NextResponse.json(
              { success: false, error: 'Agrega al menos un concepto válido' },
              { status: 400 }
            );
          }
          const subtotal = Number(data.subtotal) ?? 0;
          const taxAmount = Number(data.tax_amount) ?? 0;
          const discountAmount = Number(data.discount_amount) ?? 0;
          const totalAmount = Number(data.total_amount) ?? 0;
          const dueDate = data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          // Generar número de factura
          const year = new Date().getFullYear();
          const { data: lastInv } = await supabaseAdmin
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organizationId)
            .like('invoice_number', `INV-${year}-%`)
            .order('invoice_number', { ascending: false })
            .limit(1)
            .maybeSingle();
          let nextNum = 1;
          const lastNumber = lastInv && typeof lastInv === 'object' && 'invoice_number' in lastInv
            ? (lastInv as { invoice_number: string }).invoice_number
            : null;
          if (lastNumber) {
            const match = String(lastNumber).match(/INV-\d{4}-(\d+)/);
            if (match) nextNum = parseInt(match[1], 10) + 1;
          }
          const invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, '0')}`;

          const insertPayload = {
            organization_id: organizationId,
            customer_id: data.customer_id,
            vehicle_id: data.vehicle_id || null,
            invoice_number: invoiceNumber,
            status: data.status || 'draft',
            due_date: dueDate,
            paid_date: null,
            payment_method: data.payment_method || null,
            notes: data.notes || null,
            subtotal,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: totalAmount,
          };
          const { data: invoice, error: invError } = await supabaseAdmin
            .from('invoices')
            .insert(insertPayload as any)
            .select()
            .single();

          if (invError) {
            logger.error('Error al crear factura manual', context!, invError as Error);
            return NextResponse.json(
              { success: false, error: invError.message || 'Error al crear factura' },
              { status: 500 }
            );
          }

          const createdInvoice = invoice as { id: string } | null;
          if (!createdInvoice) {
            return NextResponse.json(
              { success: false, error: 'Error al crear factura' },
              { status: 500 }
            );
          }

          const itemsToInsert = validItems.map((it: any) => ({
            invoice_id: createdInvoice.id,
            organization_id: organizationId,
            description: it.description || 'Item',
            quantity: it.quantity ?? 1,
            unit_price: it.unit_price ?? 0,
            discount_percent: 0,
            subtotal: Number(it.total ?? it.total_amount) ?? 0,
            tax_amount: 0,
            total_amount: Number(it.total ?? it.total_amount) ?? 0,
          }));

          const { error: itemsError } = await supabaseAdmin
            .from('invoice_items')
            .insert(itemsToInsert as any);

          if (itemsError) {
            await supabaseAdmin.from('invoices').delete().eq('id', createdInvoice.id);
            logger.error('Error al insertar ítems de factura manual', context!, itemsError as Error);
            return NextResponse.json(
              { success: false, error: itemsError.message || 'Error al guardar conceptos' },
              { status: 500 }
            );
          }

          result = invoice;
          logger.businessEvent('invoice_created', 'invoice', createdInvoice.id, context!);
          break;
        }

        // Crear manualmente (flujo legacy: customer_id, vehicle_id, description)
        const requiredFields = ['customer_id', 'vehicle_id', 'description'];
        const missingFields = requiredFields.filter((field: string) => !data[field]);

        if (missingFields.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
            },
            { status: 400 }
          );
        }

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
    }

    logger.info(`Nota de venta creada exitosamente: ${result.id}`, context!);

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear nota de venta', context ?? undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear nota de venta',
      },
      { status: 500 }
    );
  }
}