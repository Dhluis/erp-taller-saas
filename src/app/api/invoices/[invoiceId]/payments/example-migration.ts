/**
 * EJEMPLO PRÁCTICO DE MIGRACIÓN - PAGOS POR NOTA DE VENTA
 * 
 * Este archivo muestra exactamente cómo migrar tu código original
 * paso a paso, manteniendo la misma funcionalidad pero con mejoras
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// TU CÓDIGO ORIGINAL (ANTES)
// =====================================================
/*
import { getPaymentsByInvoice } from '@/lib/database/queries/billing';

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const payments = await getPaymentsByInvoice(params.invoiceId);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener pagos',
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
  getPaymentsByInvoiceWithLogging,
} from '@/lib/api/payments-by-invoice-migration';

// Simplemente reemplazar las funciones con las versiones migradas
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  // Una sola línea que reemplaza todo tu código original
  return getPaymentsByInvoiceWithLogging(request, { params });
}

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 2: MIGRACIÓN GRADUAL
// =====================================================
/*
import {
  getPaymentsByInvoiceWithLogging,
} from '@/lib/api/payments-by-invoice-migration';

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    // Usar función migrada pero mantener tu estructura
    const response = await getPaymentsByInvoiceWithLogging(request, { params });
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
*/

// =====================================================
// CÓDIGO MIGRADO (DESPUÉS) - OPCIÓN 3: MIGRACIÓN HÍBRIDA
// =====================================================
/*
import {
  getPaymentsByInvoice,
  getInvoiceById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(organizationId, undefined, 'payments-by-invoice', 'GET', { invoiceId: params.invoiceId });

  try {
    // Agregar validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo pagos por nota de venta', context);

    // Verificar que la nota de venta existe
    const invoice = await getInvoiceById(params.invoiceId);
    if (!invoice) {
      logger.warn('Intento de obtener pagos de nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    // Usar tu función original
    const payments = await getPaymentsByInvoice(params.invoiceId);
    logger.info(`Pagos obtenidos para nota de venta ${params.invoiceId}: ${payments.length} pagos`, context);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Error al obtener pagos por nota de venta', context, error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener pagos',
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
 * ✅ Verificación de existencia de nota de venta
 * ✅ Compatibilidad total con el frontend
 */














