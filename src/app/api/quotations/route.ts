/**
 * API Route para Cotizaciones
 * Maneja operaciones GET, POST para la colección de cotizaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllQuotations,
  createQuotation,
  searchQuotations,
  getQuotationStats,
  getExpiredQuotations,
  markExpiredQuotations,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// =====================================================
// GET - Obtener todas las cotizaciones
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
      'quotations-api',
      'GET'
    );
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const expired = searchParams.get('expired') === 'true';
    const stats = searchParams.get('stats') === 'true';

    logger.info('Obteniendo cotizaciones', context, { status, search, expired, stats });
    console.log('[API Quotations] 📋 Parámetros recibidos:', { status, search, expired, stats });

    let result;

    if (stats) {
      // Obtener estadísticas
      result = await getQuotationStats(organizationId);
      logger.info('Estadísticas de cotizaciones obtenidas', context);
    } else if (expired) {
      // Obtener cotizaciones vencidas
      result = await getExpiredQuotations(organizationId);
      logger.info(`Cotizaciones vencidas obtenidas: ${result.length}`, context);
    } else {
      // Obtener cotizaciones (con o sin búsqueda, siempre aplica filtro de estado)
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      if (search) {
        // BÚSQUEDA: Buscar por número O por cliente, y aplicar filtro de estado
        console.log('[API Quotations] 🔍 Modo búsqueda:', search);
        
        // Buscar por número de cotización
        let queryByNumber = supabase
          .from('quotations')
          .select(`
            *,
            customers (*),
            vehicles (*),
            quotation_items (*)
          `)
          .eq('organization_id', organizationId)
          .ilike('quotation_number', `%${search}%`);

        // Aplicar filtro de estado si existe
        if (status && status !== 'all') {
          queryByNumber = queryByNumber.eq('status', status);
          console.log('[API Quotations] ✅ Aplicando filtro de estado a búsqueda por número:', status);
        }

        const { data: byNumber, error: error1 } = await queryByNumber;

        // Buscar por nombre de cliente
        const { data: customers, error: error2 } = await supabase
          .from('customers')
          .select('id')
          .eq('organization_id', organizationId)
          .ilike('name', `%${search}%`);

        if (error2) {
          logger.error('Error buscando clientes', context, error2 as Error);
        }

        const customerIds = customers?.map(c => c.id) || [];
        
        let queryByCustomer = customerIds.length > 0
          ? supabase
              .from('quotations')
              .select(`
                *,
                customers (*),
                vehicles (*),
                quotation_items (*)
              `)
              .eq('organization_id', organizationId)
              .in('customer_id', customerIds)
          : null;

        // Aplicar filtro de estado si existe
        if (queryByCustomer && status && status !== 'all') {
          queryByCustomer = queryByCustomer.eq('status', status);
          console.log('[API Quotations] ✅ Aplicando filtro de estado a búsqueda por cliente:', status);
        }

        const { data: byCustomer, error: error3 } = queryByCustomer
          ? await queryByCustomer
          : { data: null, error: null };

        if (error1 || error3) {
          logger.error('Error buscando cotizaciones', context, (error1 || error3) as Error);
          throw error1 || error3;
        }

        // Combinar resultados y eliminar duplicados
        const allResults = [...(byNumber || []), ...(byCustomer || [])];
        const uniqueResults = allResults.filter((q, index, self) =>
          index === self.findIndex((t) => t.id === q.id)
        );

        result = uniqueResults;
        console.log(`[API Quotations] ✅ Resultados de búsqueda: ${result.length} cotizaciones (filtro estado: ${status || 'todos'})`);
        logger.info(`Resultados de búsqueda: ${result.length} cotizaciones (filtro estado: ${status || 'todos'})`, context);
      } else {
        // SIN BÚSQUEDA: Obtener todas las cotizaciones y aplicar filtro de estado
        console.log('[API Quotations] 📋 Modo lista completa (sin búsqueda)');
        
        let query = supabase
          .from('quotations')
          .select(`
            *,
            customers (*),
            vehicles (*),
            quotation_items (*)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
          console.log('[API Quotations] ✅ Aplicando filtro de estado:', status);
        } else {
          console.log('[API Quotations] ℹ️ Sin filtro de estado (todos)');
        }

        const { data, error } = await query;

        if (error) {
          logger.error('Error obteniendo cotizaciones', context, error as Error);
          throw error;
        }

        result = data || [];
        console.log(`[API Quotations] ✅ Cotizaciones obtenidas: ${result.length} (filtro estado: ${status || 'todos'})`);
        logger.info(`Cotizaciones obtenidas: ${result.length}`, context);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error al obtener cotizaciones', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener cotizaciones',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Crear nueva cotización
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
      'quotations-api',
      'POST'
    );
    
    const body = await request.json();
    logger.info('Creando nueva cotización', context, { quotationData: body });

    // Validar datos requeridos
    const requiredFields = ['customer_id', 'vehicle_id'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validar que haya items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe agregar al menos un item a la cotización',
        },
        { status: 400 }
      );
    }

    // Validar tipos de datos
    if (typeof body.customer_id !== 'string' || typeof body.vehicle_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'customer_id y vehicle_id deben ser strings válidos',
        },
        { status: 400 }
      );
    }

    // Generar número de cotización único
    const quotationNumber = `COT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Crear cotización usando Supabase directamente
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    // Insertar cotización
    const quotationData = {
      organization_id: organizationId,
      customer_id: body.customer_id,
      vehicle_id: body.vehicle_id,
      quotation_number: quotationNumber,
      status: body.status || 'draft',
      valid_until: body.valid_until || null,
      terms_and_conditions: body.terms_and_conditions || '',
      notes: body.notes || '',
      subtotal: body.subtotal || 0,
      tax_amount: body.tax_amount || 0,
      discount_amount: body.discount_amount || 0,
      total_amount: body.total_amount || 0,
      created_by: tenantContext.userId,
    };

    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .insert(quotationData)
      .select(`
        *,
        customers (*),
        vehicles (*)
      `)
      .single();

    if (quotationError) {
      logger.error('Error insertando cotización', context, quotationError as Error);
      throw quotationError;
    }

    // Insertar items
    if (body.items && body.items.length > 0) {
      const items = body.items.map((item: any) => ({
        quotation_id: quotation.id,
        organization_id: organizationId,
        item_type: item.item_type || 'service',
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
        tax_percent: item.tax_percent || 16,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        total: item.total,
        service_id: item.service_id || null,
        inventory_id: item.inventory_id || null,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(items);

      if (itemsError) {
        logger.error('Error insertando items', context, itemsError as Error);
        // Eliminar cotización si falla la inserción de items
        await supabase.from('quotations').delete().eq('id', quotation.id);
        throw itemsError;
      }

      // Obtener cotización completa con items
      const { data: quotationWithItems, error: fetchError } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (*),
          vehicles (*),
          quotation_items (*)
        `)
        .eq('id', quotation.id)
        .single();

      if (!fetchError && quotationWithItems) {
        logger.info(`Cotización creada exitosamente: ${quotation.id}`, context);
        logger.businessEvent('quotation_created', 'quotation', quotation.id, context);

        return NextResponse.json({
          success: true,
          data: quotationWithItems,
        }, { status: 201 });
      }
    }

    logger.info(`Cotización creada exitosamente: ${quotation.id}`, context);
    logger.businessEvent('quotation_created', 'quotation', quotation.id, context);

    return NextResponse.json({
      success: true,
      data: quotation,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Operaciones en lote
// =====================================================
export async function PATCH(request: NextRequest) {
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
      'quotations-api',
      'PATCH'
    );
    
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Procesando operación en lote de cotizaciones', context, { action, data });

    let result;

    switch (action) {
      case 'mark_expired':
        // Marcar cotizaciones vencidas
        result = await markExpiredQuotations(organizationId);
        logger.businessEvent('quotations_expired', 'quotation', 'batch', context);
        logger.info(`Cotizaciones marcadas como vencidas: ${result.length}`, context);
        break;

      case 'bulk_status_update':
        // Actualización masiva de estado (requiere implementación adicional)
        if (!data.status || !Array.isArray(data.quotation_ids)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Se requieren status y quotation_ids para actualización masiva',
            },
            { status: 400 }
          );
        }
        
        // Implementar actualización masiva aquí
        result = { message: 'Actualización masiva no implementada aún' };
        logger.warn('Actualización masiva solicitada pero no implementada', context);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Acción no válida: ${action}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error en operación en lote de cotizaciones', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en operación en lote',
      },
      { status: 500 }
    );
  }
}