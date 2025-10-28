/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - NOTA DE VENTA DESDE COTIZACIÓN
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import { createInvoiceFromQuotation } from '@/lib/database/queries/billing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.quotation_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo quotation_id es requerido',
        },
        { status: 400 }
      );
    }

    const invoice = await createInvoiceFromQuotation(body.quotation_id);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
        message: 'Nota de venta creada desde cotización',
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
  createInvoiceFromQuotationWithLogging,
} from '@/lib/api/invoice-from-quotation-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function POST(request: NextRequest) {
  // Una sola línea que reemplaza todo tu código original
  return createInvoiceFromQuotationWithLogging(request);
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  createInvoiceFromQuotationWithLogging,
} from '@/lib/api/invoice-from-quotation-migration';

export async function POST(request: NextRequest) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await createInvoiceFromQuotationWithLogging(request);
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
  createInvoiceFromQuotation,
  getQuotationById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function POST(request: NextRequest) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'invoice-from-quotation', 'POST', {});

  try {
    validateOrganization(organizationId);
    const body = await request.json();
    logger.info('Creando nota de venta desde cotización', context, { quotationId: body.quotation_id });

    // Mantener tus validaciones originales
    if (!body.quotation_id) {
      logger.warn('Campo quotation_id requerido faltante', context);
      return NextResponse.json(
        {
          success: false,
          error: 'El campo quotation_id es requerido',
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización existe
    const quotation = await getQuotationById(body.quotation_id);
    if (!quotation) {
      logger.warn('Intento de crear nota de venta desde cotización inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar que la cotización puede ser convertida a nota de venta
    if (quotation.status !== 'approved') {
      logger.warn('Intento de crear nota de venta desde cotización no aprobada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Solo se pueden crear notas de venta desde cotizaciones aprobadas',
        },
        { status: 400 }
      );
    }

    // Verificar que la cotización no ha expirado
    if (quotation.expires_at && new Date(quotation.expires_at) < new Date()) {
      logger.warn('Intento de crear nota de venta desde cotización expirada', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede crear nota de venta desde una cotización expirada',
        },
        { status: 400 }
      );
    }

    // Agregar validaciones adicionales
    if (typeof body.quotation_id !== 'string' || !body.quotation_id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'quotation_id debe ser un string válido',
        },
        { status: 400 }
      );
    }

    // Usar tu función original
    const invoice = await createInvoiceFromQuotation(body.quotation_id);

    // Logging de evento de negocio
    logger.businessEvent('invoice_created_from_quotation', 'invoice', invoice.id, context);
    logger.info(`Nota de venta creada desde cotización ${body.quotation_id}: ${invoice.id}`, context);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
        message: 'Nota de venta creada desde cotización',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error al crear nota de venta desde cotización', context, error as Error);
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
 *    - Agregar logging y verificación de existencia
 * 
 * BENEFICIOS DE CUALQUIER OPCIÓN:
 * ✅ Misma funcionalidad que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Verificación de existencia de cotización
 * ✅ Validación de estado de cotización
 * ✅ Verificación de expiración de cotización
 * ✅ Compatibilidad total con el frontend
 */
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)

