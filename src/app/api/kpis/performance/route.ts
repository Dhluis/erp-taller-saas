import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceMetrics } from '@/lib/database/queries/kpis'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

/**
 * @swagger
 * /api/kpis/performance:
 *   get:
 *     summary: Obtener métricas de rendimiento
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
 *         description: Métricas de rendimiento obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     avgCompletionTime:
 *                       type: number
 *                       description: Tiempo promedio de completado en días
 *                     completionRate:
 *                       type: number
 *                       description: Tasa de completado en porcentaje
 *                     pendingOrders:
 *                       type: integer
 *                       description: Órdenes pendientes
 *                     completedOrders:
 *                       type: integer
 *                       description: Órdenes completadas
 *                     totalOrders:
 *                       type: integer
 *                       description: Total de órdenes
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
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          data: null,
          error: 'No autorizado: organización no encontrada'
        },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const performanceMetrics = await getPerformanceMetrics(organizationId)

    return NextResponse.json({
      data: performanceMetrics,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/performance:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener métricas de rendimiento' },
      { status: error.statusCode || 500 }
    )
  }
}

