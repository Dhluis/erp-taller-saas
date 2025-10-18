/**
 * API Route Simplificada para Items de Cotizaciones
 * Versión compatible con el código anterior pero usando el servicio centralizado
 * 
 * Esta versión mantiene la misma interfaz que tu código original pero con:
 * - Logging robusto
 * - Manejo de errores mejorado
 * - Validaciones de negocio
 * - Recálculo automático de totales
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getQuotationItems,
  createQuotationItem,
  getQuotationById,
  recalculateQuotationTotals,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// GET - Obtener items de cotización (compatible con tu código)
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-items-simple',
    'GET',
    { quotationId: params.id }
  );

  try {
    // Validación de organización (nuevo)
    validateOrganization(organizationId);
    
    // Logging (nuevo)
    logger.info('Obteniendo items de cotización (versión simple)', context);

    // Verificar que la cotización existe (nuevo)
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

    // Usar la misma función que tu código original
    const items = await getQuotationItems(params.id);

    // Logging de resultado (nuevo)
    logger.info(`Items obtenidos para cotización ${params.id}: ${items.length} items`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    // Logging mejorado (nuevo)
    logger.error('Error al obtener items de cotización', context, error as Error);
    
    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener items',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Crear item de cotización (compatible con tu código)
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'quotations-items-simple',
    'POST',
    { quotationId: params.id }
  );

  try {
    // Validación de organización (nuevo)
    validateOrganization(organizationId);
    
    const body = await request.json();
    
    // Logging (nuevo)
    logger.info('Creando item de cotización (versión simple)', context, { itemData: body });

    // Verificar que la cotización existe (nuevo)
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

    // Verificar que la cotización puede ser editada (nuevo)
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

    // Mantener las mismas validaciones que tu código original
    const requiredFields = ['item_type', 'item_name', 'quantity', 'unit_price'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      // Logging de validación (nuevo)
      logger.warn('Campos requeridos faltantes para crear item', context, { missingFields });
      
      return NextResponse.json(
        {
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validaciones adicionales (nuevo)
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

    // Mantener la misma estructura de datos que tu código original
    const itemData = {
      quotation_id: params.id,
      ...body,
    };

    // Usar la misma función que tu código original
    const item = await createQuotationItem(itemData);

    // Recálculo automático de totales (nuevo)
    await recalculateQuotationTotals(params.id);

    // Logging de evento de negocio (nuevo)
    logger.businessEvent('quotation_item_created', 'quotation_item', item.id, context);
    logger.info(`Item creado exitosamente para cotización ${params.id}: ${item.id}`, context);

    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      { status: 201 }
    );
  } catch (error) {
    // Logging mejorado (nuevo)
    logger.error('Error al crear item de cotización', context, error as Error);
    
    // Mantener la misma respuesta que tu código original
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear item',
      },
      { status: 500 }
    );
  }
}

