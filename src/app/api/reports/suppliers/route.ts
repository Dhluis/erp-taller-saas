import { NextRequest, NextResponse } from 'next/server'
import { getSuppliersReport } from '@/lib/database/queries/reports'

// GET /api/reports/suppliers - Obtener reporte de proveedores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'

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

