import { NextRequest, NextResponse } from 'next/server'
import { getInventoryReport } from '@/lib/database/queries/reports'

// GET /api/reports/inventory - Obtener reporte de inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'

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

