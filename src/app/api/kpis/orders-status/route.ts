import { NextRequest, NextResponse } from 'next/server'
import { getOrdersByStatus } from '@/lib/database/queries/kpis'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

/**
 * @swagger
 * /api/kpis/orders-status:
 *   get:
 *     summary: Obtener órdenes por estado
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
 *         description: Órdenes por estado obtenidas exitosamente
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
 *                       status:
 *                         type: string
 *                         description: Estado de la orden
 *                       count:
 *                         type: integer
 *                         description: Cantidad de órdenes
 *                       label:
 *                         type: string
 *                         description: Etiqueta del estado
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

    const ordersByStatus = await getOrdersByStatus(organizationId)

    return NextResponse.json({
      data: ordersByStatus,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/orders-status:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener órdenes por estado' },
      { status: error.statusCode || 500 }
    )
  }
}

