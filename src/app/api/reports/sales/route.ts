import { NextRequest, NextResponse } from 'next/server'
import { getSalesReport } from '@/lib/database/queries/reports'

// GET /api/reports/sales - Obtener reporte de ventas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          data: null,
          error: 'Faltan parámetros requeridos: start_date y end_date'
        },
        { status: 400 }
      )
    }

    const report = await getSalesReport(organizationId, startDate, endDate)

    return NextResponse.json({
      data: report,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/reports/sales:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener reporte de ventas'
      },
      { status: 500 }
    )
  }
}

