import { NextRequest, NextResponse } from 'next/server'
import { updateStock } from '@/lib/database/queries/products'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quantity, movementType, reference } = body

    // Validar datos requeridos
    if (!quantity || !movementType) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: quantity y movementType' },
        { status: 400 }
      )
    }

    if (!['entrada', 'salida', 'ajuste'].includes(movementType)) {
      return NextResponse.json(
        { error: 'movementType debe ser: entrada, salida o ajuste' },
        { status: 400 }
      )
    }

    const updatedProduct = await updateStock(
      params.id,
      quantity,
      movementType,
      reference
    )

    return NextResponse.json(updatedProduct)
  } catch (error: any) {
    console.error('Error in POST /api/inventory/[id]/stock:', error)

    // Manejar errores específicos
    if (error.message === 'Producto no encontrado') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    if (error.message === 'Stock insuficiente') {
      return NextResponse.json(
        { error: 'Stock insuficiente para realizar la operación' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


