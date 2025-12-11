import { NextRequest, NextResponse } from 'next/server'
import { getLowStockItems } from '@/lib/database/queries/kpis'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

/**
 * @swagger
 * /api/kpis/low-stock:
 *   get:
 *     summary: Obtener productos con stock bajo
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
 *         description: Productos con stock bajo obtenidos exitosamente
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
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       stock_quantity:
 *                         type: integer
 *                       min_stock:
 *                         type: integer
 *                       price:
 *                         type: number
 *                       category:
 *                         type: string
 *                       deficit:
 *                         type: integer
 *                         description: Cantidad faltante
 *                       status:
 *                         type: string
 *                         enum: [low_stock, out_of_stock]
 *                         description: Estado del stock
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

    const lowStockItems = await getLowStockItems(organizationId)

    return NextResponse.json({
      data: lowStockItems,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/low-stock:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener productos con stock bajo' },
      { status: error.statusCode || 500 }
    )
  }
}

