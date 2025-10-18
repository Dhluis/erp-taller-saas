/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN
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
  getQuotationItems,
  createQuotationItem,
} from '@/lib/database/queries/billing';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const items = await getQuotationItems(params.id);
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Error al obtener items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener items',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const requiredFields = ['item_type', 'item_name', 'quantity', 'unit_price'];
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

    const itemData = {
      quotation_id: params.id,
      ...body,
    };

    const item = await createQuotationItem(itemData);

    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear item',
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
  getQuotationItemsWithLogging,
  createQuotationItemWithLogging,
} from '@/lib/api/quotations-items-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return getQuotationItemsWithLogging(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return createQuotationItemWithLogging(request, { params });
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  getQuotationItemsWithLogging,
  createQuotationItemWithLogging,
} from '@/lib/api/quotations-items-migration';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await getQuotationItemsWithLogging(request, { params });
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await createQuotationItemWithLogging(request, { params });
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
  getQuotationItems,
  createQuotationItem,
  getQuotationById,
  recalculateQuotationTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'quotations-items', 'GET', { quotationId: params.id });

  try {
    // Agregar validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo items de cotización', context);

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Usar tu función original
    const items = await getQuotationItems(params.id);
    logger.info(`Items obtenidos: ${items.length}`, context);

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    logger.error('Error al obtener items', context, error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener items',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'quotations-items', 'POST', { quotationId: params.id });

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Creando item de cotización', context, { itemData: body });

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser editada
    if (quotation.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'No se puede agregar items a una cotización convertida' },
        { status: 400 }
      );
    }

    // Mantener tus validaciones originales
    const requiredFields = ['item_type', 'item_name', 'quantity', 'unit_price'];
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

    // Agregar validaciones adicionales
    if (!['service', 'part'].includes(body.item_type)) {
      return NextResponse.json(
        { success: false, error: 'item_type debe ser "service" o "part"' },
        { status: 400 }
      );
    }

    if (typeof body.quantity !== 'number' || body.quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'quantity debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    if (typeof body.unit_price !== 'number' || body.unit_price < 0) {
      return NextResponse.json(
        { success: false, error: 'unit_price debe ser un número mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Usar tu estructura original
    const itemData = {
      quotation_id: params.id,
      ...body,
    };

    // Usar tu función original
    const item = await createQuotationItem(itemData);

    // Agregar recálculo automático
    await recalculateQuotationTotals(params.id);

    logger.businessEvent('quotation_item_created', 'quotation_item', item.id, context);
    logger.info(`Item creado: ${item.id}`, context);

    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear item', context, error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear item',
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

