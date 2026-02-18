/**
 * API Route para Pagos de Factura
 * GET: listar pagos de una factura
 * POST: registrar un pago
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// =====================================================
// GET - Listar pagos de una factura
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();
    const invoiceId = params.id;

    const { data: payments, error } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('[GET /api/invoices/[id]/payments]', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        payments: payments || [],
        total_paid: totalPaid,
      },
    });
  } catch (error) {
    console.error('[GET /api/invoices/[id]/payments]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Registrar un pago
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { amount, payment_method, payment_date, reference, notes } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Monto debe ser un número positivo' },
        { status: 400 }
      );
    }

    const validMethods = ['cash', 'card', 'transfer', 'check', 'other'];
    const method = (payment_method || 'cash').toString().toLowerCase();
    const paymentMethod = validMethods.includes(method) ? method : 'cash';

    const supabase = getSupabaseServiceClient();
    const invoiceId = params.id;

    // Obtener factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total, status, organization_id')
      .eq('id', invoiceId)
      .eq('organization_id', tenantContext.organizationId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Total pagado hasta ahora
    const { data: existingPayments } = await supabase
      .from('invoice_payments')
      .select('amount')
      .eq('invoice_id', invoiceId);

    const totalPaidBefore = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const invoiceTotal = Number(invoice.total_amount ?? invoice.total ?? 0);
    const remaining = Math.max(0, invoiceTotal - totalPaidBefore);

    if (amount > remaining) {
      return NextResponse.json(
        { success: false, error: `El monto no puede exceder el pendiente ($${remaining.toFixed(2)})` },
        { status: 400 }
      );
    }

    const paymentDate = payment_date ?? new Date().toISOString().split('T')[0];

    // Insertar pago
    const { data: payment, error: insertError } = await supabase
      .from('invoice_payments')
      .insert({
        organization_id: tenantContext.organizationId,
        invoice_id: invoiceId,
        amount,
        payment_method: paymentMethod,
        reference: reference ?? null,
        payment_date: paymentDate,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/invoices/[id]/payments]', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Calcular total pagado: SUM(amount) FROM invoice_payments WHERE invoice_id
    const { data: sumData } = await supabase
      .from('invoice_payments')
      .select('amount')
      .eq('invoice_id', invoiceId);
    const totalPaidNow = (sumData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    let invoiceStatus = invoice.status;

    if (totalPaidNow >= invoiceTotal) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: paymentDate,
          payment_method: paymentMethod,
          payment_reference: reference || null,
          payment_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
      invoiceStatus = 'paid';
    }

    return NextResponse.json({
      success: true,
      data: {
        payment,
        total_paid: totalPaidNow,
        remaining: Math.max(0, invoiceTotal - totalPaidNow),
        invoice_status: invoiceStatus,
      },
    });
  } catch (error) {
    console.error('[POST /api/invoices/[id]/payments]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al registrar pago' },
      { status: 500 }
    );
  }
}
