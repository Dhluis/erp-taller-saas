import { NextRequest, NextResponse } from 'next/server';
import { getInventoryStats } from '@/lib/database/queries/inventory';

/**
 * @swagger
 * /api/inventory/stats:
 *   get:
 *     summary: Obtener estadísticas de inventario
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Estadísticas de inventario
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
 *                     totalItems:
 *                       type: number
 *                     lowStockItems:
 *                       type: number
 *                     totalValue:
 *                       type: number
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener estadísticas de inventario
export async function GET(request: NextRequest) {
  try {
    const stats = await getInventoryStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener estadísticas de inventario',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

