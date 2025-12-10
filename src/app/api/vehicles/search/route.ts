import { NextRequest, NextResponse } from 'next/server'
import { searchVehicles } from '@/lib/database/queries/vehicles'

// GET /api/vehicles/search - Buscar vehículos por placa, VIN, marca o modelo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'
    
    if (!query) {
      return NextResponse.json(
        {
          data: null,
          error: 'El parámetro de búsqueda (q o query) es requerido'
        },
        { status: 400 }
      )
    }
    
    if (query.length < 2) {
      return NextResponse.json(
        {
          data: null,
          error: 'La búsqueda debe tener al menos 2 caracteres'
        },
        { status: 400 }
      )
    }
    
    const vehicles = await searchVehicles(organizationId, query)
    
    return NextResponse.json({
      data: {
        query,
        results: vehicles,
        count: vehicles.length
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/vehicles/search:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al buscar vehículos'
      },
      { status: 500 }
    )
  }
}


