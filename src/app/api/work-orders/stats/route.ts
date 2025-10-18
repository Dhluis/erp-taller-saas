import { NextRequest, NextResponse } from 'next/server';
import { getWorkOrderStats } from '@/lib/database/queries/work-orders';

/**
 * @swagger
 * /api/work-orders/stats:
 *   get:
 *     summary: Obtener estadísticas de órdenes de trabajo
 *     tags: [Work Orders]
 *     responses:
 *       200:
 *         description: Estadísticas de órdenes de trabajo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: number
 *                     statusCounts:
 *                       type: object
 *                     totalRevenue:
 *                       type: number
 *                     pendingOrders:
 *                       type: number
 *                     inProgressOrders:
 *                       type: number
 *                     completedOrders:
 *                       type: number
 *                     cancelledOrders:
 *                       type: number
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener estadísticas de órdenes de trabajo
export async function GET(request: NextRequest) {
  try {
    const stats = await getWorkOrderStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching work order stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener estadísticas de órdenes de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

