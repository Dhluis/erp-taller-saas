/**
 * GET /api/expenses/stats - Gastos del mes (OC recibidas + pagos a proveedores)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const supabase = getSupabaseServiceClient()

    const { data: ocData } = await supabase
      .from('purchase_orders')
      .select('total_amount')
      .eq('organization_id', tenantContext.organizationId)
      .eq('status', 'received')
      .gte('order_date', firstDay)
      .lte('order_date', lastDay)

    const ocTotal = ocData?.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0) || 0

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('organization_id', tenantContext.organizationId)
      .not('supplier_id', 'is', null)
      .in('status', ['completed', 'paid'])
      .gte('payment_date', firstDay)
      .lte('payment_date', lastDay)

    const paymentsTotal = paymentsData?.reduce((sum, p) => sum + Number(p.amount ?? 0), 0) || 0

    const monthlyExpenses = ocTotal + paymentsTotal

    return NextResponse.json({
      success: true,
      data: { monthlyExpenses, ocTotal, paymentsTotal }
    })
  } catch (e) {
    console.error('GET /api/expenses/stats:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al obtener gastos' },
      { status: 500 }
    )
  }
}
