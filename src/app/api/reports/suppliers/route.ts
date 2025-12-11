import { NextRequest, NextResponse } from 'next/server'
import { getSuppliersReport } from '@/lib/database/queries/reports'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/reports/suppliers - Obtener reporte de proveedores
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

    const report = await getSuppliersReport(organizationId)

    return NextResponse.json({
      data: report,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/reports/suppliers:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener reporte de proveedores'
      },
      { status: 500 }
    )
  }
}

