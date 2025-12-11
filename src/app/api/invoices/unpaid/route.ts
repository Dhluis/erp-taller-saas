import { NextRequest, NextResponse } from 'next/server'
import { getUnpaidTotals, checkAndUpdateOverdueInvoices } from '@/lib/database/queries/invoices'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/invoices/unpaid - Obtener resumen de facturas sin pagar
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          data: null,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId
    
    // Primero actualizar el estado de facturas vencidas
    await checkAndUpdateOverdueInvoices(organizationId)
    
    // Obtener totales
    const totals = await getUnpaidTotals(organizationId)
    
    return NextResponse.json({
      data: {
        ...totals,
        summary: {
          message: `Tienes ${totals.count_unpaid} facturas sin pagar por un total de $${totals.total_unpaid.toFixed(2)}`,
          overdue_message: totals.count_overdue > 0 
            ? `${totals.count_overdue} facturas están vencidas por un total de $${totals.total_overdue.toFixed(2)}`
            : 'No tienes facturas vencidas'
        }
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/invoices/unpaid:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener totales de facturas sin pagar'
      },
      { status: 500 }
    )
  }
}


