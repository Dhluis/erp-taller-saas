import { NextRequest, NextResponse } from 'next/server'
import { getDashboardKPIs } from '@/lib/database/queries/kpis'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

/**
 * @swagger
 * /api/kpis/dashboard:
 *   get:
 *     summary: Obtener KPIs principales del dashboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la organización
 *     responses:
 *       200:
 *         description: KPIs del dashboard obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                           description: Órdenes del mes actual
 *                         previous:
 *                           type: integer
 *                           description: Órdenes del mes pasado
 *                         percentageChange:
 *                           type: number
 *                           description: Cambio porcentual
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                           description: Ingresos del mes actual
 *                         previous:
 *                           type: number
 *                           description: Ingresos del mes pasado
 *                         percentageChange:
 *                           type: number
 *                           description: Cambio porcentual
 *                     activeCustomers:
 *                       type: integer
 *                       description: Clientes activos este mes
 *                     lowStockItems:
 *                       type: integer
 *                       description: Productos con stock bajo
 *                 error:
 *                   type: null
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no autenticado
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error interno del servidor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    await validateAccess(user.id, 'reports', 'read')

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id

    const kpis = await getDashboardKPIs(organizationId)

    return NextResponse.json({
      data: kpis,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/dashboard:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener KPIs del dashboard' },
      { status: error.statusCode || 500 }
    )
  }
}

