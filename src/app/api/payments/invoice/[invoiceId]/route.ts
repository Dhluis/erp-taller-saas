/**
 * API Route para Pagos por Nota de Venta
 * Maneja la obtención de pagos asociados a una nota de venta específica
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentsByInvoice,
  getInvoiceById,
} from '@/lib/supabase/quotations-invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getOrganizationId, validateOrganization } from '@/hooks/useOrganization';

// =====================================================
// GET - Obtener pagos por nota de venta
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const organizationId = getOrganizationId();
  const context = createLogContext(
    organizationId,
    undefined,
    'payments-by-invoice-api',
    'GET',
    { invoiceId: params.invoiceId }
  );

  try {
    validateOrganization(organizationId);
    
    logger.info('Obteniendo pagos por nota de venta', context, { 
      invoiceId: params.invoiceId
    });

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

    // Obtener pagos de la nota de venta
    const payments = await getPaymentsByInvoice(params.invoiceId);

    logger.info(`Pagos obtenidos exitosamente para nota de venta: ${params.invoiceId}`, context, {
      paymentsCount: payments.length
    });

    return NextResponse.json({
      success: true,
      data: {
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          total_amount: invoice.total_amount,
        },
        payments: payments,
        summary: {
          total_payments: payments.length,
          total_paid: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
          remaining_balance: invoice.total_amount - payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
        }
      },
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
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)
