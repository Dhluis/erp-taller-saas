import { NextRequest, NextResponse } from 'next/server'
import { getTopProducts } from '@/lib/database/queries/kpis'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

/**
 * @swagger
 * /api/kpis/top-products:
 *   get:
 *     summary: Obtener top productos
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número máximo de productos a retornar
 *     responses:
 *       200:
 *         description: Top productos obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                       totalRevenue:
 *                         type: number
 *                         description: Ingresos totales
 *                       ordersCount:
 *                         type: integer
 *                         description: Número de órdenes
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
    const limit = parseInt(searchParams.get('limit') || '10')

    const topProducts = await getTopProducts(organizationId, limit)

    return NextResponse.json({
      data: topProducts,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/top-products:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener top productos' },
      { status: error.statusCode || 500 }
    )
  }
}

