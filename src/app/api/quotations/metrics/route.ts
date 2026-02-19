import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fechas para el mes actual
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // Total cotizaciones del mes
    const { data: totalMonth, error: totalError } = await supabase
      .from('quotations')
      .select('id')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString())

    if (totalError) {
      console.error('Error fetching total quotations:', totalError)
    }

    // Cotizaciones pendientes de respuesta (enviadas pero no aprobadas/rechazadas)
    const { data: pendingResponse, error: pendingError } = await supabase
      .from('quotations')
      .select('id')
      .eq('status', 'sent')

    if (pendingError) {
      console.error('Error fetching pending quotations:', pendingError)
    }

    // Cotizaciones aprobadas
    const { data: approved, error: approvedError } = await supabase
      .from('quotations')
      .select('id')
      .eq('status', 'approved')

    if (approvedError) {
      console.error('Error fetching approved quotations:', approvedError)
    }

    // Cotizaciones convertidas
    const { data: converted, error: convertedError } = await supabase
      .from('quotations')
      .select('id')
      .eq('status', 'converted')

    if (convertedError) {
      console.error('Error fetching converted quotations:', convertedError)
    }

    // Valor total cotizado del mes
    const { data: totalValue, error: valueError } = await supabase
      .from('quotations')
      .select('total')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString())

    if (valueError) {
      console.error('Error fetching total value:', valueError)
    }

    // Calcular métricas
    const totalMonthCount = totalMonth?.length || 0
    const pendingCount = pendingResponse?.length || 0
    const approvedCount = approved?.length || 0
    const convertedCount = converted?.length || 0
    const totalValueAmount = totalValue?.reduce((sum, q) => sum + (q.total_amount ?? (q as any).total ?? 0), 0) || 0

    // Calcular tasa de conversión
    const totalSent = (pendingCount + approvedCount + convertedCount) || 1
    const conversionRate = totalSent > 0 ? Math.round((convertedCount / totalSent) * 100) : 0

    return NextResponse.json({
      totalMonth: totalMonthCount,
      pendingResponse: pendingCount,
      approved: approvedCount,
      conversionRate,
      totalValue: totalValueAmount
    })
  } catch (error) {
    console.error('Error in GET /api/quotations/metrics:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

