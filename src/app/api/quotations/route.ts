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
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// GET - Obtener todas las cotizaciones
// =====================================================
export async function GET(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'GET'
  );

  try {
    validateOrganization(organizationId);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const expired = searchParams.get('expired') === 'true';
    const stats = searchParams.get('stats') === 'true';

    logger.info('Obteniendo cotizaciones', context, { status, search, expired, stats });

    let result;

    if (stats) {
      // Obtener estadísticas
      result = await getQuotationStats();
      logger.info('Estadísticas de cotizaciones obtenidas', context);
    } else if (expired) {
      // Obtener cotizaciones vencidas
      result = await getExpiredQuotations();
      logger.info(`Cotizaciones vencidas obtenidas: ${result.length}`, context);
    } else if (search) {
      // Buscar cotizaciones
      result = await searchQuotations(search);
      logger.info(`Resultados de búsqueda: ${result.length} cotizaciones`, context);
    } else {
      // Obtener todas las cotizaciones
      result = await getAllQuotations(status || undefined);
      logger.info(`Cotizaciones obtenidas: ${result.length}`, context);
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
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'POST'
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando nueva cotización', context, { quotationData: body });

    // Validar datos requeridos
    const requiredFields = ['customer_id', 'vehicle_id', 'description'];
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

    const quotation = await createQuotation(body);

    logger.businessEvent('quotation_created', 'quotation', quotation.id, context);
    logger.info(`Cotización creada exitosamente: ${quotation.id}`, context);

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
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-api',
    'PATCH'
  );

  try {
    validateOrganization(organizationId);
    
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Procesando operación en lote de cotizaciones', context, { action, data });

    let result;

    switch (action) {
      case 'mark_expired':
        // Marcar cotizaciones vencidas
        result = await markExpiredQuotations();
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