import { NextRequest, NextResponse } from 'next/server';
/**
 * GET /api/expenses/stats
 * Lee desde financial_transactions (ledger unificado) para reportar
 * gastos reales del mes y del día.
 */

import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const now = new Date()
    // El cliente envía ?localDate=YYYY-MM-DD (fecha local del browser).
    // Fallback a UTC solo si no viene param (servidor no conoce timezone del usuario).
    const localDate = request.nextUrl.searchParams.get('localDate')
    const firstDay = localDate
      ? localDate.substring(0, 7) + '-01'
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const todayStr = localDate || now.toISOString().split('T')[0]

    const supabase = getSupabaseServiceClient()

    type TxRow = { amount: number; transaction_date: string }

    // Leer TODOS los expense del mes desde el ledger unificado
    const { data: txData, error } = await (supabase
      .from('financial_transactions')
      .select('amount, transaction_date')
      .eq('organization_id', tenantContext.organizationId)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', firstDay) as unknown as Promise<{ data: TxRow[] | null; error: any }>)

    if (error) {
      console.error('[GET /api/expenses/stats] financial_transactions error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const rows: TxRow[] = txData || []
    const monthlyExpenses = rows.reduce((sum, t) => sum + Number(t.amount), 0)
    const gastosHoy = rows
      .filter(t => t.transaction_date === todayStr)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return NextResponse.json({
      success: true,
      data: { monthlyExpenses, gastosHoy }
    })
  } catch (e) {
    console.error('GET /api/expenses/stats:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al obtener gastos' },
      { status: 500 }
    )
  }
}
