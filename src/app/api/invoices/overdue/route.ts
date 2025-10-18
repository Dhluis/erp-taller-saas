import { NextRequest, NextResponse } from 'next/server'
import { getOverdueInvoices, checkAndUpdateOverdueInvoices } from '@/lib/database/queries/invoices'

// GET /api/invoices/overdue - Obtener facturas vencidas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'
    
    // Primero actualizar el estado de facturas vencidas
    await checkAndUpdateOverdueInvoices(organizationId)
    
    // Luego obtener las facturas vencidas
    const overdueInvoices = await getOverdueInvoices(organizationId)
    
    // Calcular totales
    const totalAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
    
    return NextResponse.json({
      data: {
        invoices: overdueInvoices,
        count: overdueInvoices.length,
        total_amount: totalAmount,
        summary: {
          total_invoices: overdueInvoices.length,
          total_overdue: totalAmount
        }
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/invoices/overdue:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener facturas vencidas'
      },
      { status: 500 }
    )
  }
}


