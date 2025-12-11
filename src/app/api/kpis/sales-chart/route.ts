import { NextRequest, NextResponse } from 'next/server'
import { getSalesChart } from '@/lib/database/queries/kpis'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

/**
 * @swagger
 * /api/kpis/sales-chart:
 *   get:
 *     summary: Obtener gráfico de ventas por día
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
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de días a consultar
 *     responses:
 *       200:
 *         description: Gráfico de ventas obtenido exitosamente
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
 *                       date:
 *                         type: string
 *                         format: date
 *                         description: Fecha
 *                       total:
 *                         type: number
 *                         description: Total de ventas
 *                       completed:
 *                         type: number
 *                         description: Ventas completadas
 *                       pending:
 *                         type: number
 *                         description: Ventas pendientes
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

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const salesChart = await getSalesChart(organizationId, days)

    return NextResponse.json({
      data: salesChart,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/sales-chart:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener gráfico de ventas' },
      { status: error.statusCode || 500 }
    )
  }
}

