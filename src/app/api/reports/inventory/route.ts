import { NextRequest, NextResponse } from 'next/server'
import { getInventoryReport } from '@/lib/database/queries/reports'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/reports/inventory - Obtener reporte de inventario
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

    const { searchParams } = new URL(request.url)

    const report = await getInventoryReport(organizationId)

    return NextResponse.json({
      data: report,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/reports/inventory:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener reporte de inventario'
      },
      { status: 500 }
    )
  }
}

