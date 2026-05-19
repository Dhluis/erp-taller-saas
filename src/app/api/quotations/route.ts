import { NextRequest, NextResponse } from 'next/server';
/**
 * API Route para Cotizaciones
 * Maneja operaciones GET, POST para la colección de cotizaciones
 */

import {
  getAllQuotations,
  createQuotation,
  searchQuotations,
  getQuotationStats,
  getExpiredQuotations,
  markExpiredQuotations,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { checkResourceLimit } from '@/lib/billing/check-limits';
import { 
  extractPaginationFromURL, 
  calculateOffset, 
  generatePaginationMeta 
} from '@/lib/utils/pagination';
import type { PaginatedResponse } from '@/types/pagination';

// =====================================================
// GET - Obtener todas las cotizaciones
// =====================================================
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/quotations] Error de autenticación:', authError)
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      )
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [GET /api/quotations] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
        },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const context = createLogContext(
      organizationId,
      undefined,
      'quotations-api',
      'GET'
    );
    
    // ✅ NUEVO: Extraer parámetros de paginación
    const url = new URL(request.url);
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url);
    
    // Parámetros adicionales
    const search = url.searchParams.get('search') || undefined;
    // ✅ Leer status desde filter_status (enviado por buildPaginationQueryString) o status directo
    const status = url.searchParams.get('filter_status') || url.searchParams.get('status') || undefined;
    const customerId = url.searchParams.get('filter_customer_id') || url.searchParams.get('customer_id') || undefined;
    const expired = url.searchParams.get('expired') === 'true';
    const stats = url.searchParams.get('stats') === 'true';

    logger.info('Obteniendo cotizaciones', context, { page, pageSize, status, search, expired, stats });
    console.log('[API Quotations] 📋 Parámetros recibidos:', { page, pageSize, status, search, expired, stats });

    // ✅ Manejar casos especiales (stats, expired) sin paginación
    if (stats) {
      const result = await getQuotationStats(organizationId);
      logger.info('Estadísticas de cotizaciones obtenidas', context);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (expired) {
      const result = await getExpiredQuotations(organizationId);
      logger.info(`Cotizaciones vencidas obtenidas: ${result.length}`, context);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // ✅ MODE PAGINADO: Obtener cotizaciones con paginación
    // ✅ Query con count para paginación
    let query = supabaseAdmin
      .from('quotations')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        items:quotation_items(*)
      `, { count: 'exact' })
      .eq('organization_id', organizationId);

    // Búsqueda multi-campo
    if (search) {
      query = query.or(`
        quotation_number.ilike.%${search}%,
        description.ilike.%${search}%,
        notes.ilike.%${search}%
      `);
    }

    // Filtro por status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filtro por cliente
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Ordenamiento (default: created_at DESC para ver más recientes primero)
    const orderColumn = sortBy || 'created_at';
    const orderDirection = sortOrder === 'asc';
    query = query.order(orderColumn, { ascending: orderDirection });

    // ✅ Paginación
    const offset = calculateOffset(page, pageSize);
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching quotations:', error);
      logger.error('Error obteniendo cotizaciones', context, error as Error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // ✅ Retornar estructura paginada
    const pagination = generatePaginationMeta(page, pageSize, count || 0);
    
    console.log(`[API Quotations] ✅ Cotizaciones obtenidas: ${data?.length || 0} de ${count || 0} total`);
    logger.info(`Cotizaciones obtenidas: ${data?.length || 0} de ${count || 0}`, context);

    return NextResponse.json({
      success: true,
      data: {
        items: data || [],
        pagination
      }
    } as PaginatedResponse);
  } catch (error) {
    console.error('❌ [GET /api/quotations] Error:', error);
    
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
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [POST /api/quotations] Error de autenticación:', authError)
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      )
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [POST /api/quotations] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
        },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const context = createLogContext(
      organizationId,
      undefined,
      'quotations-api',
      'POST'
    );

    // ── Billing: verificar límite de órdenes/cotizaciones del plan ──
    const limitCheck = await checkResourceLimit(organizationId, 'work_order', { useOrganizationId: true });
    if (!limitCheck.canCreate) {
      return NextResponse.json(
        { success: false, error: limitCheck.error?.message || 'Límite del plan alcanzado', limit_reached: true, limit_error: limitCheck.error },
        { status: 403 }
      );
    }

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

    // ✅ Usar supabaseAdmin para bypass RLS

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
      created_by: user.id,
    };

    const { data: quotation, error: quotationError } = await supabaseAdmin
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
        item_type: item.item_type || 'service',
        item_name: item.description || 'Item',
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total,
        service_id: item.service_id || null,
        inventory_id: item.inventory_id || null,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('quotation_items')
        .insert(items);

      if (itemsError) {
        logger.error('Error insertando items', context, itemsError as Error);
        // Eliminar cotización si falla la inserción de items
        await supabaseAdmin.from('quotations').delete().eq('id', quotation.id);
        throw itemsError;
      }

      // Obtener cotización completa con items
      const { data: quotationWithItems, error: fetchError } = await supabaseAdmin
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
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PATCH /api/quotations] Error de autenticación:', authError)
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      )
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [PATCH /api/quotations] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
        },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
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
