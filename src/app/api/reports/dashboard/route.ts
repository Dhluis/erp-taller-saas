// TODO: Temporalmente comentado para deploy - withPermission no está implementado
// import { NextRequest, NextResponse } from 'next/server'
// import { getDashboardMetrics } from '@/lib/database/queries/reports'
// import { withPermission } from '@/lib/auth/middleware'

// // GET /api/reports/dashboard - Obtener métricas del dashboard
// export const GET = withPermission('reports', 'read', async (request: NextRequest, user) => {
//   try {
//     const { searchParams } = new URL(request.url)
//     const organizationId = searchParams.get('organization_id') || user.organization_id
//     const period = searchParams.get('period') as any || 'month'

//     const metrics = await getDashboardMetrics(organizationId, period)

//     return NextResponse.json({
//       data: metrics,
//       error: null
//     })
//   } catch (error: any) {
//     console.error('Error in GET /api/reports/dashboard:', error)
//     return NextResponse.json(
//       {
//         data: null,
//         error: error.message || 'Error al obtener métricas del dashboard'
//       },
//       { status: 500 }
//     )
//   }
// })

import { NextResponse } from 'next/server'

// Ruta temporalmente deshabilitada
export async function GET() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}
