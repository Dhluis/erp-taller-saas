/**
 * Migración de API Routes de Notas de Venta
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllInvoices,
  createInvoice,
  searchInvoices,
  getInvoiceStats,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para GET que mantiene compatibilidad con tu código original
 * pero agrega logging y validaciones del sistema centralizado
 */
export async function getInvoicesWithLogging(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-migration',
    'GET',
    {}
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo notas de venta (migración)', context);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const stats = searchParams.get('stats');

    // Logging de parámetros
    logger.info('Parámetros de consulta', context, { status, search, stats });

    if (stats === 'true') {
      logger.info('Obteniendo estadísticas de notas de venta', context);
      const statistics = await getInvoiceStats();
      logger.info('Estadísticas obtenidas exitosamente', context);
      
      return NextResponse.json({
        success: true,
        data: statistics,
      });
    }

    let invoices;

    if (search) {
      logger.info(`Buscando notas de venta: "${search}"`, context);
      invoices = await searchInvoices(search);
      logger.info(`Búsqueda completada: ${invoices.length} resultados`, context);
    } else {
      logger.info(`Obteniendo todas las notas de venta${status ? ` con estado: ${status}` : ''}`, context);
      invoices = await getAllInvoices(status || undefined);
      logger.info(`Notas de venta obtenidas: ${invoices.length} registros`, context);
    }

    // Mantener la misma respuesta que tu código original
    return NextResponse.json({
      success: true,
      data: invoices,
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

/**
 * Wrapper para POST que mantiene compatibilidad con tu código original
 * pero agrega validaciones de negocio y logging
 */
export async function createInvoiceWithLogging(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'invoices-migration',
    'POST',
    {}
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    
    const body = await request.json();
    logger.info('Creando nota de venta (migración)', context, { invoiceData: body });

    // Mantener las mismas validaciones que tu código original
    const requiredFields = ['customer_id', 'vehicle_id', 'description'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes para crear nota de venta', context, { missingFields });
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validaciones adicionales del sistema centralizado
    if (body.customer_id && typeof body.customer_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'customer_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    if (body.vehicle_id && typeof body.vehicle_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'vehicle_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    if (body.description && typeof body.description !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'description debe ser un string válido',
        },
        { status: 400 }
      );
    }

    // Validar total_amount si se proporciona
    if (body.total_amount !== undefined && (typeof body.total_amount !== 'number' || body.total_amount < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'total_amount debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    // Validar discount si se proporciona
    if (body.discount !== undefined && (typeof body.discount !== 'number' || body.discount < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'discount debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    // Usar la función original pero con logging
    const invoice = await createInvoice(body);

    // Logging de evento de negocio
    logger.businessEvent('invoice_created', 'invoice', invoice.id, context);
    logger.info(`Nota de venta creada exitosamente: ${invoice.id}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: true,
        data: invoice,
      },
      { status: 201 }
    );
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

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const invoiceMigrationHelpers = {
  getInvoicesWithLogging,
  createInvoiceWithLogging,
};

