import { NextRequest, NextResponse } from 'next/server'
import { 
  getSupplierById, 
  updateSupplier, 
  deactivateSupplier 
} from '@/lib/database/queries/suppliers'

// GET /api/suppliers/[id] - Obtener proveedor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await getSupplierById(params.id)

    return NextResponse.json({
      data: supplier,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/suppliers/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener proveedor'
      },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Actualizar proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const updatedSupplier = await updateSupplier(params.id, body)

    return NextResponse.json(
      {
        data: updatedSupplier,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in PUT /api/suppliers/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al actualizar proveedor'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Desactivar proveedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deactivatedSupplier = await deactivateSupplier(params.id)

    return NextResponse.json(
      {
        data: deactivatedSupplier,
        error: null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in DELETE /api/suppliers/[id]:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al desactivar proveedor'
      },
      { status: 500 }
    )
  }
}

