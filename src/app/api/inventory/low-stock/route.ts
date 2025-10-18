import { NextRequest, NextResponse } from 'next/server';
import { getLowStockItems } from '@/lib/database/queries/inventory';

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Obtener artículos con stock bajo
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Lista de artículos con stock bajo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryItem'
 *                 count:
 *                   type: number
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener artículos con stock bajo
export async function GET(request: NextRequest) {
  try {
    const items = await getLowStockItems();

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener artículos con stock bajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

