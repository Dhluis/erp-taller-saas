import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderItemsByWorkOrder,
  createOrderItem,
} from '@/lib/database/queries/work-orders';

/**
 * @swagger
 * /api/work-orders/{id}/items:
 *   get:
 *     summary: Obtener items de una orden de trabajo
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la orden de trabajo
 *     responses:
 *       200:
 *         description: Lista de items de la orden
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
 *                     $ref: '#/components/schemas/OrderItem'
 *                 count:
 *                   type: number
 *   post:
 *     summary: Agregar un item a una orden de trabajo
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la orden de trabajo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderItemData'
 *     responses:
 *       201:
 *         description: Item agregado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/OrderItem'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */

// GET: Obtener items de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const items = await getOrderItemsByWorkOrder(params.id);

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching order items:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener items de la orden',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Agregar item a una orden
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validaciones
    if (!body.item_type || !body.item_name || body.quantity === undefined || body.unit_price === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: item_type, item_name, quantity, unit_price',
        },
        { status: 400 }
      );
    }

    if (!['service', 'part', 'labor'].includes(body.item_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El tipo de item debe ser: service, part o labor',
        },
        { status: 400 }
      );
    }

    if (body.quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'La cantidad debe ser mayor a 0',
        },
        { status: 400 }
      );
    }

    if (body.unit_price < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El precio unitario no puede ser negativo',
        },
        { status: 400 }
      );
    }

    // Calcular total_price
    const totalPrice = body.quantity * body.unit_price;

    const itemData = {
      ...body,
      work_order_id: params.id,
      total_price: totalPrice,
    };

    const item = await createOrderItem(itemData);

    return NextResponse.json(
      {
        success: true,
        data: item,
        message: 'Item agregado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al agregar item a la orden',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

