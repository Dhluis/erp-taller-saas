import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceMetrics } from '@/lib/database/queries/reports'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/reports/performance - Obtener métricas de rendimiento
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organizationId SOLO del usuario autenticado
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

