/**
 * GET /api/ingresos/stats
 * Estadísticas de ingresos para el dashboard (facturas, cobros)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIncomeStats } from '@/lib/database/queries/invoices';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const stats = await getIncomeStats(tenantContext.organizationId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[GET /api/ingresos/stats]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener estadísticas',
      },
      { status: 500 }
    );
  }
}
