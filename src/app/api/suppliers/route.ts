import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllSuppliers, 
  createSupplier, 
  searchSuppliers 
} from '@/lib/database/queries/suppliers'

// GET /api/suppliers - Listar proveedores con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'
    
    // Si hay parámetro de búsqueda, usar función de búsqueda
    const search = searchParams.get('search')
    if (search) {
      const results = await searchSuppliers(organizationId, search)
      return NextResponse.json({
        data: results,
        error: null
      })
    }

    // Construir filtros
    const filters: any = {}
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }
    
    if (searchParams.get('city')) {
      filters.city = searchParams.get('city')
    }
    
    if (searchParams.get('state')) {
      filters.state = searchParams.get('state')
    }
    
    if (searchParams.get('is_active') !== null) {
      filters.is_active = searchParams.get('is_active') === 'true'
    }
    
    if (searchParams.get('page')) {
      filters.page = parseInt(searchParams.get('page')!)
    }
    
    if (searchParams.get('limit')) {
      filters.limit = parseInt(searchParams.get('limit')!)
    }

    const result = await getAllSuppliers(organizationId, filters)
    
    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/suppliers:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener proveedores'
      },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar datos requeridos
    const { organization_id, name } = body
    if (!organization_id || !name) {
      return NextResponse.json(
        {
          data: null,
          error: 'Faltan datos requeridos: organization_id y name'
        },
        { status: 400 }
      )
    }

    const newSupplier = await createSupplier(body)

    return NextResponse.json(
      {
        data: newSupplier,
        error: null
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/suppliers:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al crear proveedor'
      },
      { status: 500 }
    )
  }
}

