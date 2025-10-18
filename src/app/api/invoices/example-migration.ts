/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - NOTAS DE VENTA
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import {
  getAllInvoices,
  createInvoice,
  searchInvoices,
  getInvoiceStats,
} from '@/lib/database/queries/billing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      const statistics = await getInvoiceStats();
      return NextResponse.json({
        success: true,
        data: statistics,
      });
    }

    let invoices;

    if (search) {
      invoices = await searchInvoices(search);
    } else {
      invoices = await getAllInvoices(status || undefined);
    }

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Error al obtener notas de venta:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener notas de venta',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = ['customer_id', 'vehicle_id', 'description'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const invoice = await createInvoice(body);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear nota de venta:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear nota de venta',
      },
      { status: 500 }
    );
  }
}
*/

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 1: MIGRACIÓN COMPLETA
// =====================================================
import {
  getInvoicesWithLogging,
  createInvoiceWithLogging,
} from '@/lib/api/invoices-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function GET(request: NextRequest) {
  // Una sola línea que reemplaza todo tu código original
  return getInvoicesWithLogging(request);
}

export async function POST(request: NextRequest) {
  // Una sola línea que reemplaza todo tu código original
  return createInvoiceWithLogging(request);
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  getInvoicesWithLogging,
  createInvoiceWithLogging,
} from '@/lib/api/invoices-migration';

export async function GET(request: NextRequest) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await getInvoicesWithLogging(request);
    return response; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático en la función migrada
    console.error('Error en GET migrado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await createInvoiceWithLogging(request);
    return response; // La función ya retorna NextResponse
  } catch (error) {
    // Manejo de errores automático en la función migrada
    console.error('Error en POST migrado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
*/

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 3: MIGRACIÓN HÍBRIDA
// =====================================================
/*
import {
  getAllInvoices,
  createInvoice,
  searchInvoices,
  getInvoiceStats,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function GET(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoices', 'GET', {});

  try {
    // Agregar validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo notas de venta', context);

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

export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoices', 'POST', {});

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Creando nota de venta', context, { invoiceData: body });

    // Mantener tus validaciones originales
    const requiredFields = ['customer_id', 'vehicle_id', 'description'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes', context, { missingFields });
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Agregar validaciones adicionales
    if (body.customer_id && typeof body.customer_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'customer_id debe ser un string válido' },
        { status: 400 }
      );
    }

    if (body.vehicle_id && typeof body.vehicle_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'vehicle_id debe ser un string válido' },
        { status: 400 }
      );
    }

    if (body.description && typeof body.description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'description debe ser un string válido' },
        { status: 400 }
      );
    }

    if (body.total_amount !== undefined && (typeof body.total_amount !== 'number' || body.total_amount < 0)) {
      return NextResponse.json(
        { success: false, error: 'total_amount debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    if (body.discount !== undefined && (typeof body.discount !== 'number' || body.discount < 0)) {
      return NextResponse.json(
        { success: false, error: 'discount debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Usar tu función original
    const invoice = await createInvoice(body);

    // Logging de evento de negocio
    logger.businessEvent('invoice_created', 'invoice', invoice.id, context);
    logger.info(`Nota de venta creada: ${invoice.id}`, context);

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
*/

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. OPCIÓN 1 (Recomendada): Usar las funciones de migración
 *    - Cambiar importaciones
 *    - Reemplazar llamadas a funciones
 *    - Mantener estructura original
 * 
 * 2. OPCIÓN 2: Migración gradual
 *    - Mantener tu estructura
 *    - Usar funciones migradas
 *    - Agregar manejo de errores
 * 
 * 3. OPCIÓN 3: Migración híbrida
 *    - Mantener tu lógica
 *    - Agregar validaciones del sistema centralizado
 *    - Agregar logging y recálculo automático
 * 
 * BENEFICIOS DE CUALQUIER OPCIÓN:
 * ✅ Misma funcionalidad que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Recálculo automático de totales
 * ✅ Compatibilidad total con el frontend
 */

