import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
} from '@/lib/database/queries/work-orders';
import { getOrganizationId } from '@/lib/auth/organization-server';

// GET: Obtener una orden por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Verificar que el organizationId esté disponible antes de obtener la orden
    const organizationId = await getOrganizationId(request);
    console.log('🔍 [API GET /work-orders/[id]] Organization ID:', organizationId);
    
    const order = await getWorkOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar una orden
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validaciones opcionales
    if (body.description !== undefined && body.description.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'La descripción debe tener al menos 10 caracteres',
        },
        { status: 400 }
      );
    }

    if (body.estimated_completion) {
      const estimatedDate = new Date(body.estimated_completion);
      const now = new Date();
      
      if (estimatedDate < now) {
        return NextResponse.json(
          {
            success: false,
            error: 'La fecha estimada no puede ser en el pasado',
          },
          { status: 400 }
        );
      }
    }

    if (body.discount !== undefined && body.discount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento no puede ser negativo',
        },
        { status: 400 }
      );
    }

    const order = await updateWorkOrder(params.id, body);

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Orden de trabajo actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una orden
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteWorkOrder(params.id);

    return NextResponse.json({
      success: true,
      message: 'Orden de trabajo eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}