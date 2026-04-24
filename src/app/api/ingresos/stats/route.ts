import { NextRequest, NextResponse } from 'next/server';
/**
 * GET /api/ingresos/stats
 * Lee desde financial_transactions (ledger unificado) para reportar
 * ingresos reales del mes y del día.
 */

import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const supabase = getSupabaseServiceClient();

    type TxRow = { amount: number; transaction_date: string }

    // Leer TODOS los income del mes desde el ledger unificado
    const { data: txData, error } = await (supabase
      .from('financial_transactions')
      .select('amount, transaction_date')
      .eq('organization_id', tenantContext.organizationId)
      .eq('transaction_type', 'income')
      .gte('transaction_date', firstDay) as unknown as Promise<{ data: TxRow[] | null; error: any }>);

    if (error) {
      console.error('[GET /api/ingresos/stats] financial_transactions error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows: TxRow[] = txData || [];
    const monthlyRevenue = rows.reduce((sum, t) => sum + Number(t.amount), 0);
    const ingresosHoy = rows
      .filter(t => t.transaction_date === todayStr)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const ticketPromedio = rows.length > 0 ? monthlyRevenue / rows.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        monthlyRevenue,
        ingresos_este_mes: monthlyRevenue,
        ingresosHoy,
        ticketPromedio,
      },
    });
  } catch (error) {
    console.error('[GET /api/ingresos/stats]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
