/**
 * API Route para Items de Cotizaciones
 * Maneja operaciones GET, POST para items de una cotización específica
 * 
 * Compatible con el sistema anterior pero usando el servicio centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotationItems,
  createQuotationItem,
  updateQuotationItem,
  deleteQuotationItem,
  getQuotationById,
  recalculateQuotationTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// =====================================================
// GET - Obtener items de cotización
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      'quotations-items-api',
      'GET',
      { quotationId: params.id }
    );
    logger.info('Obteniendo items de cotización', context);

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Intento de obtener items de cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    const items = await getQuotationItems(params.id);

    logger.info(`Items obtenidos para cotización ${params.id}: ${items.length} items`, context);

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    logger.error('Error al obtener items de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener items de cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Crear item de cotización
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      'quotations-items-api',
      'POST',
      { quotationId: params.id }
    );
    
    const body = await request.json();
    logger.info('Creando item de cotización', context, { itemData: body });

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Intento de crear item en cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser editada
    if (quotation.status === 'converted') {
      logger.warn('Intento de agregar item a cotización convertida', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede agregar items a una cotización que ya ha sido convertida',
        },
        { status: 400 }
      );
    }

    // Validar datos requeridos
    const requiredFields = ['item_type', 'item_name', 'quantity', 'unit_price'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes para crear item', context, { missingFields });
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validar tipos de datos
    if (!['service', 'part'].includes(body.item_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'item_type debe ser "service" o "part"',
        },
        { status: 400 }
      );
    }

    if (typeof body.quantity !== 'number' || body.quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'quantity debe ser un número mayor a 0',
        },
        { status: 400 }
      );
    }

    if (typeof body.unit_price !== 'number' || body.unit_price < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'unit_price debe ser un número mayor o igual a 0',
        },
        { status: 400 }
      );
    }

    // Crear item
    const itemData = {
      quotation_id: params.id,
      item_type: body.item_type,
      item_name: body.item_name,
      description: body.description || null,
      quantity: body.quantity,
      unit_price: body.unit_price,
    };

    const item = await createQuotationItem(itemData);

    // Recalcular totales de la cotización
    await recalculateQuotationTotals(organizationId, params.id);

    logger.businessEvent('quotation_item_created', 'quotation_item', item.id, context);
    logger.info(`Item creado exitosamente para cotización ${params.id}: ${item.id}`, context);

    return NextResponse.json({
      success: true,
      data: item,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear item de cotización', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear item de cotización',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar múltiples items (operación en lote)
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      'quotations-items-api',
      'PUT',
      { quotationId: params.id }
    );
    
    const body = await request.json();
    logger.info('Actualizando items de cotización en lote', context, { 
      itemsCount: body.items?.length || 0 
    });

    // Verificar que la cotización existe
    const quotation = await getQuotationById(params.id);
    if (!quotation) {
      logger.warn('Intento de actualizar items de cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser editada
    if (quotation.status === 'converted') {
      logger.warn('Intento de actualizar items de cotización convertida', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede editar items de una cotización que ya ha sido convertida',
        },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        {
          success: false,
          error: 'items debe ser un array',
        },
        { status: 400 }
      );
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: body.items.length,
    };

    // Procesar cada item
    for (const itemData of body.items) {
      try {
        const { id, ...updateData } = itemData;
        
        if (!id) {
          results.failed.push({
            item: itemData,
            error: 'ID de item requerido para actualización',
          });
          continue;
        }

        const updatedItem = await updateQuotationItem(id, updateData);
        results.successful.push(updatedItem);

        logger.info(`Item ${id} actualizado exitosamente`, context);
      } catch (error) {
        logger.error(`Error al actualizar item ${itemData.id}`, context, error as Error);
        results.failed.push({
          item: itemData,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Recalcular totales si hubo actualizaciones exitosas
    if (results.successful.length > 0) {
      await recalculateQuotationTotals(organizationId, params.id);
      logger.info('Totales recalculados después de actualización en lote', context);
    }

    logger.businessEvent('quotation_items_bulk_updated', 'quotation_item', 'batch', context);
    logger.info(`Actualización en lote completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas`, context);

    return NextResponse.json({
      success: true,
      data: results,
      message: `Actualización en lote completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas`,
    });
  } catch (error) {
    logger.error('Error en actualización en lote de items', context, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en actualización en lote de items',
      },
      { status: 500 }
    );
  }
}