import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceMetrics } from '@/lib/database/queries/reports'

// GET /api/reports/performance - Obtener métricas de rendimiento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'

    const metrics = await getPerformanceMetrics(organizationId)

    return NextResponse.json({
      data: metrics,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/reports/performance:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener métricas de rendimiento'
      },
      { status: 500 }
    )
  }
}

