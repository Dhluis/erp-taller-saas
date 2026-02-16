import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/database/queries/reports'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import type { ReportPeriod } from '@/lib/database/queries/reports'

// GET /api/reports/dashboard - Obtener métricas del dashboard
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          data: null,
          error: 'No autorizado: organización no encontrada'
        },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period')
    const period: ReportPeriod = ['today', 'week', 'month', 'quarter', 'year', 'custom'].includes(periodParam || '')
      ? (periodParam as ReportPeriod)
      : 'month'

    const metrics = await getDashboardMetrics(organizationId, period)

    return NextResponse.json({
      data: metrics,
      error: null
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener métricas del dashboard'
    console.error('Error in GET /api/reports/dashboard:', error)
    return NextResponse.json(
      {
        data: null,
        error: message
      },
      { status: 500 }
    )
  }
}
