/**
 * Migración de API Routes para Pagos por Nota de Venta
 * 
 * Este archivo proporciona funciones de compatibilidad para migrar
 * desde el sistema anterior al nuevo sistema centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentsByInvoice,
  getInvoiceById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

/**
 * Wrapper para GET que mantiene compatibilidad con tu código original
 * pero agrega logging y validaciones del sistema centralizado
 */
export async function getPaymentsByInvoiceWithLogging(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-by-invoice-migration',
    'GET',
    { invoiceId: params.invoiceId }
  );

  try {
    // Validaciones del sistema centralizado
    validateOrganization(organizationId);
    logger.info('Obteniendo pagos por nota de venta (migración)', context);

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

    // Usar la función original pero con logging
    const payments = await getPaymentsByInvoice(params.invoiceId);
    logger.info(`Pagos obtenidos para nota de venta ${params.invoiceId}: ${payments.length} pagos`, context);

    // Mantener la misma respuesta que tu código original
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

/**
 * Función helper para migrar gradualmente
 * Reemplaza tu código original con estas funciones
 */
export const paymentsByInvoiceMigrationHelpers = {
  getPaymentsByInvoiceWithLogging,
};


















