import { NextRequest, NextResponse } from 'next/server';
import { updateWorkOrderStatus } from '@/lib/database/queries/work-orders';

// PUT: Actualizar estado de la orden
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo status es requerido',
        },
        { status: 400 }
      );
    }

    const validStatuses = [
      'pending',
      'in_progress',
      'diagnosed',
      'approved',
      'in_repair',
      'waiting_parts',
      'completed',
      'delivered'
    ];

    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Estado inválido. Estados válidos: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const order = await updateWorkOrderStatus(params.id, body.status);

    return NextResponse.json({
      success: true,
      data: order,
      message: `Estado de la orden actualizado a: ${body.status}`,
    });
  } catch (error) {
    console.error('Error updating work order status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar estado de la orden',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

