import { NextRequest, NextResponse } from 'next/server'
import { getCustomersReport } from '@/lib/database/queries/reports'

// GET /api/reports/customers - Obtener reporte de clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'

    const report = await getCustomersReport(organizationId)

    return NextResponse.json({
      data: report,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/reports/customers:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener reporte de clientes'
      },
      { status: 500 }
    )
  }
}

