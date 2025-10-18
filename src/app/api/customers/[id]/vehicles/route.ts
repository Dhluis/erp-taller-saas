import { NextRequest, NextResponse } from 'next/server'
import { getVehiclesByCustomer, createVehicle } from '@/lib/database/queries/vehicles'

// GET /api/customers/[id]/vehicles - Obtener vehículos de un cliente específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicles = await getVehiclesByCustomer(params.id)
    
    return NextResponse.json({
      data: {
        customer_id: params.id,
        vehicles: vehicles,
        count: vehicles.length
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/customers/[id]/vehicles:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener vehículos del cliente'
      },
      { status: 500 }
    )
  }
}

// POST /api/customers/[id]/vehicles - Crear vehículo para un cliente específico
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.brand) {
      return NextResponse.json(
        {
          data: null,
          error: 'brand es requerido'
        },
        { status: 400 }
      )
    }
    
    if (!body.model) {
      return NextResponse.json(
        {
          data: null,
          error: 'model es requerido'
        },
        { status: 400 }
      )
    }
    
    // Agregar organization_id si no viene
    if (!body.organization_id) {
      body.organization_id = '00000000-0000-0000-0000-000000000000'
    }
    
    const vehicle = await createVehicle({
      ...body,
      customer_id: params.id
    })
    
    return NextResponse.json(
      {
        data: vehicle,
        error: null
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/customers/[id]/vehicles:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al crear vehículo'
      },
      { status: 500 }
    )
  }
}